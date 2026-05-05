"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  Loader2,
  Sparkles,
} from "lucide-react";
import {
  createSalesProposalDraft,
  patchSalesProposalWizardDraft,
  updateSalesProposalBodyAndStatus,
} from "@/app/(crm)/actions/sales-proposals";
import PlacesBusinessAutocomplete from "@/components/crm/prospecting/PlacesBusinessAutocomplete";
import type { CrmProductServiceRow } from "@/lib/crm/crm-catalog-types";
import type { ProposalClientOption } from "@/lib/crm/fetch-clients-for-proposal-picker";
import { sanitizePlacesSearchPlace } from "@/lib/crm/places-google-shared";
import type { PlacesSearchPlace } from "@/lib/crm/places-types";
import type { SalesProposalDetail } from "@/lib/crm/sales-proposal-types";

const STEP_LABELS = [
  "Customer",
  "Services",
  "Generate",
  "Edit & export",
];

const GENERATION_SUBSTEPS = [
  "Reading Google listing, categories & photos",
  "Scraping website hues / logo cues",
  "Structuring narrative & pricing story",
];

function formatUsd(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(n);
}

type IdleOrStep = "start" | 1 | 2 | 3 | 4;

function deriveBootstrap(
  resume: SalesProposalDetail | null
): null | {
  step: Exclude<IdleOrStep, "start">;
  clientId: string;
  selectedIds: Set<string>;
  notes: string;
  title: string;
  markdown: string;
} {
  if (!resume) return null;
  const body = resume.proposal_body?.trim() ?? "";
  if (body.length > 0 && (resume.status === "generated" || resume.status === "final")) {
    return {
      step: 4,
      clientId: resume.clientId ?? "",
      selectedIds: new Set(resume.selected_catalog_item_ids),
      notes: resume.wizard_notes ?? "",
      title: resume.title,
      markdown: resume.proposal_body,
    };
  }
  const hasClient = Boolean(resume.clientId?.trim());
  const picks = resume.selected_catalog_item_ids ?? [];
  if (hasClient && picks.length > 0) {
    return {
      step: 3,
      clientId: resume.clientId!.trim(),
      selectedIds: new Set(picks),
      notes: resume.wizard_notes ?? "",
      title: resume.title,
      markdown: "",
    };
  }
  if (hasClient) {
    return {
      step: 2,
      clientId: resume.clientId!.trim(),
      selectedIds: picks.length ? new Set(picks) : new Set(),
      notes: resume.wizard_notes ?? "",
      title: resume.title,
      markdown: "",
    };
  }
  return {
    step: 1,
    clientId: "",
    selectedIds: new Set(),
    notes: resume.wizard_notes ?? "",
    title: resume.title,
    markdown: "",
  };
}

export default function ProposalGenerationWizard({
  clients,
  catalog,
  initialProposalId,
  resume,
}: {
  clients: ProposalClientOption[];
  catalog: CrmProductServiceRow[];
  initialProposalId: string | null;
  resume: SalesProposalDetail | null;
}) {
  const router = useRouter();

  const [phase, setPhase] = useState<IdleOrStep>(() =>
    deriveBootstrap(resume) ? deriveBootstrap(resume)!.step : "start"
  );
  const [proposalId, setProposalId] = useState<string | null>(
    initialProposalId ??
      (resume && resume.id ? resume.id : null)
  );

  const boot = deriveBootstrap(resume);
  const [clientId, setClientId] = useState<string>(boot?.clientId ?? "");
  const [pickSearch, setPickSearch] = useState("");
  const [selectedSvc, setSelectedSvc] = useState<Set<string>>(
    boot?.selectedIds ?? new Set()
  );
  const [wizardNotes, setWizardNotes] = useState(boot?.notes ?? "");
  const [title, setTitle] = useState(boot?.title ?? "Untitled proposal");
  const [markdown, setMarkdown] = useState(boot?.markdown ?? "");
  const [listingPickerText, setListingPickerText] = useState(() =>
    (resume?.google_place_snapshot?.name ?? "").trim()
  );
  const [listingPlace, setListingPlace] = useState<PlacesSearchPlace | null>(
    resume?.google_place_snapshot ?? null
  );

  const [busyCreate, setBusyCreate] = useState(false);
  const [busyPatch, setBusyPatch] = useState(false);
  const [busyGen, setBusyGen] = useState(false);
  const [busySave, setBusySave] = useState(false);
  const [busyPdf, setBusyPdf] = useState(false);
  const [genStage, setGenStage] = useState(0);
  const [err, setErr] = useState<string | null>(null);

  const genIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(
    () => () => {
      genIntervalRef.current && clearInterval(genIntervalRef.current);
      abortRef.current?.abort();
    },
    []
  );

  function stepIndex(): number {
    if (phase === "start") return 0;
    return phase - 1;
  }

  const filteredClients = useMemo(() => {
    const q = pickSearch.trim().toLowerCase();
    if (!q) return clients;
    return clients.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.company?.toLowerCase().includes(q) ?? false) ||
        (c.email?.toLowerCase().includes(q) ?? false)
    );
  }, [clients, pickSearch]);

  const selectedClient = useMemo(
    () => clients.find((c) => c.id === clientId) ?? null,
    [clients, clientId]
  );

  const subtotal = useMemo(() => {
    let s = 0;
    for (const id of selectedSvc) {
      const row = catalog.find((c) => c.id === id);
      if (row) s += row.unit_price;
    }
    return s;
  }, [catalog, selectedSvc]);

  const onStart = useCallback(async () => {
    setErr(null);
    setBusyCreate(true);
    const res = await createSalesProposalDraft({});
    setBusyCreate(false);
    if ("error" in res && res.error) {
      setErr(res.error);
      return;
    }
    const id =
      "id" in res && res.id ? res.id : null;
    if (!id) {
      setErr("Could not create draft.");
      return;
    }
    setProposalId(id);
    setPhase(1);
    router.replace(`/proposals/new?proposal=${encodeURIComponent(id)}`);
  }, [router]);

  const persistStep1to2 = async () => {
    if (!proposalId || !clientId.trim()) return;
    setErr(null);
    setBusyPatch(true);
    const res = await patchSalesProposalWizardDraft(proposalId, {
      clientId: clientId.trim(),
      title: title.trim() || "Untitled proposal",
      googlePlaceSnapshot: listingPlace,
    });
    setBusyPatch(false);
    if ("error" in res && res.error) {
      setErr(res.error);
      return;
    }
    setPhase(2);
  };

  const persistStep2to3 = async () => {
    if (!proposalId || selectedSvc.size === 0) return;
    setErr(null);
    setBusyPatch(true);
    const res = await patchSalesProposalWizardDraft(proposalId, {
      selectedCatalogItemIds: Array.from(selectedSvc),
      wizardNotes,
      totalPriceEstimate: subtotal > 0 ? subtotal : null,
      title: title.trim() || "Untitled proposal",
    });
    setBusyPatch(false);
    if ("error" in res && res.error) {
      setErr(res.error);
      return;
    }
    setPhase(3);
  };

  const runGeneration = async () => {
    if (!proposalId) return;
    setErr(null);
    setBusyGen(true);
    setGenStage(0);
    genIntervalRef.current && clearInterval(genIntervalRef.current);
    genIntervalRef.current = setInterval(() => {
      setGenStage((s) => Math.min(s + 1, GENERATION_SUBSTEPS.length - 1));
    }, 2_800);

    const ac = new AbortController();
    abortRef.current = ac;

    try {
      const res = await fetch("/api/crm/generate-sales-proposal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ proposalId }),
        signal: ac.signal,
      });
      let data: unknown;
      try {
        data = await res.json();
      } catch {
        throw new Error(
          `Generation failed (${res.status}). The server did not return JSON — check deployment logs.`
        );
      }
      if (!data || typeof data !== "object" || !("ok" in data)) {
        throw new Error("Unexpected server response.");
      }
      const payload = data as {
        ok: boolean;
        error?: string;
        title?: string;
        markdown?: string;
      };
      if (!payload.ok) {
        const msg =
          typeof payload.error === "string" && payload.error.trim()
            ? payload.error
            : `Generation failed (${res.status}).`;
        throw new Error(msg);
      }
      if (typeof payload.markdown !== "string") {
        throw new Error("Unexpected server response.");
      }
      setTitle(
        (typeof payload.title === "string" ? payload.title : "").trim() ||
          title
      );
      setMarkdown(payload.markdown);
      setPhase(4);
      router.refresh();
    } catch (e) {
      const aborted =
        e instanceof DOMException && e.name === "AbortError";
      setErr(
        aborted
          ? "Generation aborted."
          : e instanceof Error
            ? e.message
            : "Generation failed."
      );
    } finally {
      genIntervalRef.current && clearInterval(genIntervalRef.current);
      genIntervalRef.current = null;
      abortRef.current = null;
      setBusyGen(false);
    }
  };

  async function saveDraft() {
    if (!proposalId) return;
    setErr(null);
    setBusySave(true);
    const res = await updateSalesProposalBodyAndStatus(proposalId, {
      title: title.trim() || "Untitled proposal",
      proposal_body: markdown,
      status: "draft",
    });
    setBusySave(false);
    if ("error" in res && res.error) setErr(res.error);
    else router.refresh();
  }

  async function finalizeDoc() {
    if (!proposalId) return;
    setErr(null);
    setBusySave(true);
    const res = await updateSalesProposalBodyAndStatus(proposalId, {
      title: title.trim() || "Untitled proposal",
      proposal_body: markdown,
      status: "final",
    });
    setBusySave(false);
    if ("error" in res && res.error) setErr(res.error);
    else router.refresh();
  }

  async function downloadPdf() {
    if (!proposalId) return;
    setErr(null);
    setBusyPdf(true);
    try {
      const res = await fetch("/api/crm/sales-proposal-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ proposalId }),
      });
      if (!res.ok) {
        const t = await res.text();
        let msg = `PDF failed (${res.status})`;
        try {
          const j = JSON.parse(t) as { error?: string };
          if (j.error) msg = j.error;
        } catch {
          msg = t.slice(0, 200) || msg;
        }
        throw new Error(msg);
      }
      const disposition = res.headers.get("Content-Disposition");
      const fname =
        disposition?.match(/filename="([^"]+)"/)?.[1] ??
        `proposal-${proposalId.slice(0, 8)}.pdf`;
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fname;
      a.rel = "noopener";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "PDF export failed.");
    } finally {
      setBusyPdf(false);
    }
  }

  function toggleService(id: string) {
    setSelectedSvc((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  /** Step indicator (1-indexed visuals for non-start). */
  const stepperUi =
    phase === "start" ? null : (
      <nav
        aria-label="Proposal steps"
        className="flex flex-wrap items-center gap-3 border-b border-border pb-6 dark:border-zinc-700"
      >
        {STEP_LABELS.map((label, idx) => {
          const active = stepIndex() === idx;
          const complete = stepIndex() > idx;
          return (
            <div key={label} className="flex items-center gap-2">
              <span
                className={`flex h-8 min-w-[2rem] items-center justify-center rounded-full border px-2 text-xs font-bold ${
                  complete
                    ? "border-emerald-600 bg-emerald-600 text-white"
                    : active
                      ? "border-accent bg-accent text-white"
                      : "border-border bg-surface text-text-secondary dark:border-zinc-700"
                }`}
              >
                {complete ? (
                  <CheckCircle2 className="h-4 w-4" aria-hidden />
                ) : (
                  idx + 1
                )}
              </span>
              <span
                className={`text-xs font-semibold uppercase tracking-wide ${
                  active
                    ? "text-text-primary dark:text-zinc-100"
                    : "text-text-secondary dark:text-zinc-500"
                }`}
              >
                {label}
              </span>
              {idx < STEP_LABELS.length - 1 ? (
                <span className="hidden text-border sm:inline px-2 text-lg dark:text-zinc-700">
                  /
                </span>
              ) : null}
            </div>
          );
        })}
      </nav>
    );

  return (
    <div className="mx-auto max-w-4xl pb-24">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/proposals"
          className="inline-flex items-center gap-2 text-sm text-text-secondary hover:text-text-primary dark:text-zinc-500"
        >
          <ArrowLeft className="h-4 w-4" />
          Proposals
        </Link>
      </div>

      <h1 className="heading-display text-3xl font-bold text-text-primary dark:text-zinc-100">
        Proposal generation
      </h1>
      <p className="mt-2 max-w-xl text-sm text-text-secondary dark:text-zinc-400">
        Select a buyer, bundle catalog services with notes, generate a GPT-backed
        proposal, refine the markdown, export PDF or continue in the full
        proposal editor.
      </p>

      {stepperUi ? <div className="mt-8">{stepperUi}</div> : null}

      {err ? (
        <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
          <p>{err}</p>
          <button
            type="button"
            onClick={() => setErr(null)}
            className="mt-3 text-xs font-bold uppercase tracking-wide text-red-900 underline underline-offset-2 dark:text-red-300"
          >
            Dismiss
          </button>
        </div>
      ) : null}

      {/* Start */}
      {phase === "start" ? (
        <div className="mt-14 space-y-4 text-center">
          <Sparkles className="mx-auto h-10 w-10 text-accent" aria-hidden />
          <button
            type="button"
            disabled={busyCreate}
            onClick={() => void onStart()}
            className="inline-flex rounded-xl bg-accent px-8 py-3 text-sm font-semibold text-white shadow-sm hover:bg-accent-hover disabled:opacity-50"
          >
            {busyCreate ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating…
              </>
            ) : (
              "Start proposal generation"
            )}
          </button>
          <p className="text-xs text-text-secondary dark:text-zinc-500">
            We’ll create a draft now so edits and regeneration stay synced.
          </p>
          <Link
            href="/proposals"
            className="block text-sm text-accent underline underline-offset-2"
          >
            Back to proposals
          </Link>
        </div>
      ) : null}

      {/* Step 1 */}
      {phase === 1 && proposalId ? (
        <div className="mt-10 grid gap-8 lg:grid-cols-[1fr,minmax(0,320px)]">
          <div className="space-y-4">
            <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary dark:text-zinc-500">
              Search customers
              <input
                type="search"
                placeholder="Filter by name, company, email"
                value={pickSearch}
                onChange={(e) => setPickSearch(e.target.value)}
                className="mt-1 w-full rounded-xl border border-border bg-white px-3 py-2 text-sm outline-none focus:border-blue-400 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
              />
            </label>
            <ul className="max-h-[440px] space-y-1 overflow-y-auto rounded-2xl border border-border bg-white p-2 dark:border-zinc-700 dark:bg-zinc-950">
              {filteredClients.length === 0 ? (
                <li className="px-4 py-8 text-center text-sm text-text-secondary">
                  No customers match.
                </li>
              ) : (
                filteredClients.map((c) => (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => setClientId(c.id)}
                      className={`flex w-full flex-col rounded-xl px-3 py-3 text-left text-sm transition hover:bg-zinc-50 dark:hover:bg-zinc-900 ${
                        clientId === c.id
                          ? "bg-blue-50 ring-2 ring-blue-400/40 dark:bg-blue-950/30"
                          : ""
                      }`}
                    >
                      <span className="font-semibold text-text-primary dark:text-zinc-100">
                        {c.name}
                      </span>
                      {c.company ? (
                        <span className="text-xs text-text-secondary dark:text-zinc-500">
                          {c.company}
                        </span>
                      ) : null}
                    </button>
                  </li>
                ))
              )}
            </ul>
          </div>
          <aside className="rounded-2xl border border-border bg-zinc-50/80 p-5 dark:border-zinc-700 dark:bg-zinc-900/40">
            <div className="space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-widest text-text-secondary dark:text-zinc-500">
                Linked Google listing (optional)
              </p>
              <PlacesBusinessAutocomplete
                value={listingPickerText}
                onChange={(v) => setListingPickerText(v)}
                cityHint=""
                disabled={busyPatch}
                suggestionSubcopy="Adds categories, imagery, website + logo cues into AI + PDF exports"
                onPlaceResolved={(p) => {
                  setListingPlace(sanitizePlacesSearchPlace(p));
                }}
              />
              <p className="text-[11px] text-text-secondary dark:text-zinc-500">
                Searching requires{" "}
                <code className="rounded bg-zinc-200 px-1 text-[10px] dark:bg-zinc-800">
                  GOOGLE_PLACES_API_KEY
                </code>{" "}
                (same prospecting integrations).
              </p>
              {listingPlace ? (
                <div className="rounded-xl border border-border bg-white p-3 text-xs shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-text-primary dark:text-zinc-50">
                        {listingPlace.name}
                      </p>
                      {listingPlace.formattedAddress ? (
                        <p className="mt-1 text-text-secondary dark:text-zinc-400">
                          {listingPlace.formattedAddress}
                        </p>
                      ) : null}
                      <p className="mt-2 text-[10px] uppercase tracking-wide text-text-secondary dark:text-zinc-500">
                        Google categories ·{" "}
                        {listingPlace.types?.filter(Boolean).slice(0, 4).join(", ") ||
                          "Unknown"}
                      </p>
                      {listingPlace.photoRefs?.length ? (
                        <p className="mt-2 text-emerald-700 dark:text-emerald-400">
                          {listingPlace.photoRefs.length} listing photo
                          {listingPlace.photoRefs.length > 1 ? "s" : ""} fetched
                          for the document shell.
                        </p>
                      ) : null}
                    </div>
                    <button
                      type="button"
                      disabled={busyPatch}
                      className="shrink-0 text-[10px] font-bold uppercase tracking-wide text-red-600 underline"
                      onClick={() => setListingPlace(null)}
                    >
                      Clear
                    </button>
                  </div>
                </div>
              ) : null}
            </div>

            <p className="mt-8 text-[10px] font-bold uppercase tracking-widest text-text-secondary dark:text-zinc-500">
              Selected customer
            </p>
            {!selectedClient ? (
              <p className="mt-4 text-sm text-text-secondary">
                Choose someone from the list.
              </p>
            ) : (
              <dl className="mt-4 space-y-2 text-sm">
                <div>
                  <dt className="text-[10px] font-bold uppercase text-text-secondary dark:text-zinc-500">
                    Name
                  </dt>
                  <dd className="font-medium">{selectedClient.name}</dd>
                </div>
                {selectedClient.company ? (
                  <div>
                    <dt className="text-[10px] font-bold uppercase text-text-secondary dark:text-zinc-500">
                      Company
                    </dt>
                    <dd>{selectedClient.company}</dd>
                  </div>
                ) : null}
                {selectedClient.email ? (
                  <div>
                    <dt className="text-[10px] font-bold uppercase text-text-secondary dark:text-zinc-500">
                      Email
                    </dt>
                    <dd className="break-all">{selectedClient.email}</dd>
                  </div>
                ) : (
                  <p className="text-xs text-zinc-500">No email on file</p>
                )}
                {selectedClient.phone ? (
                  <div>
                    <dt className="text-[10px] font-bold uppercase text-text-secondary dark:text-zinc-500">
                      Phone
                    </dt>
                    <dd>{selectedClient.phone}</dd>
                  </div>
                ) : (
                  <p className="text-xs text-zinc-500">No phone on file</p>
                )}
                {selectedClient.notes?.trim() ? (
                  <div>
                    <dt className="text-[10px] font-bold uppercase text-text-secondary dark:text-zinc-500">
                      Notes
                    </dt>
                    <dd className="max-h-32 overflow-y-auto whitespace-pre-wrap text-xs text-text-secondary">
                      {selectedClient.notes.trim()}
                    </dd>
                  </div>
                ) : (
                  <p className="text-xs text-zinc-500">No notes on file</p>
                )}
              </dl>
            )}
          </aside>
          <div className="lg:col-span-2 flex flex-wrap justify-between gap-3">
            <button
              type="button"
              onClick={() => router.push("/proposals")}
              className="text-sm font-semibold text-text-secondary underline-offset-2 hover:text-text-primary hover:underline"
            >
              Exit to list
            </button>
            <button
              type="button"
              disabled={!clientId.trim() || busyPatch}
              onClick={() => void persistStep1to2()}
              className="rounded-xl bg-accent px-6 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {busyPatch ? "Saving…" : "Continue"}
            </button>
          </div>
        </div>
      ) : null}

      {/* Step 2 */}
      {phase === 2 && proposalId ? (
        <div className="mt-10 space-y-6">
          <p className="text-sm text-text-secondary dark:text-zinc-400">
            Select one or more rows from Products & Services. Timeline and
            deliverables should be summarized in descriptions for now.
          </p>
          <ul className="space-y-2">
            {catalog.length === 0 ? (
              <li className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-text-secondary">
                Your catalog is empty.{" "}
                <Link className="text-accent underline" href="/products-services">
                  Manage catalog
                </Link>
              </li>
            ) : (
              catalog.map((row) => {
                const sel = selectedSvc.has(row.id);
                return (
                  <li key={row.id}>
                    <button
                      type="button"
                      onClick={() => toggleService(row.id)}
                      className={`flex w-full flex-col gap-1 rounded-2xl border px-4 py-3 text-left transition sm:flex-row sm:justify-between sm:gap-6 ${
                        sel
                          ? "border-accent bg-blue-50/80 dark:bg-blue-950/30"
                          : "border-border bg-white hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:bg-zinc-900"
                      }`}
                    >
                      <div>
                        <p className="font-semibold text-text-primary dark:text-zinc-100">
                          {row.name}
                          {sel ? (
                            <span className="ml-2 text-xs font-bold text-accent">
                              Selected
                            </span>
                          ) : null}
                        </p>
                        {row.description.trim() ? (
                          <p className="mt-1 text-xs text-text-secondary dark:text-zinc-500 whitespace-pre-wrap">
                            {row.description}
                          </p>
                        ) : null}
                      </div>
                      <div className="shrink-0 text-sm font-bold text-text-primary dark:text-zinc-200">
                        {formatUsd(row.unit_price)}
                      </div>
                    </button>
                  </li>
                );
              })
            )}
          </ul>

          <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary dark:text-zinc-500">
            Proposal notes / instructions for AI (optional)
            <textarea
              rows={4}
              value={wizardNotes}
              onChange={(e) => setWizardNotes(e.target.value)}
              className="mt-2 w-full rounded-xl border border-border bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
            />
          </label>

          <div className="rounded-2xl border border-border bg-surface px-5 py-4 dark:border-zinc-700 dark:bg-zinc-900/50">
            <p className="text-xs font-bold uppercase tracking-wide text-text-secondary dark:text-zinc-500">
              Selection summary
            </p>
            <ul className="mt-2 space-y-1 text-sm">
              {[...selectedSvc].map((id) => {
                const r = catalog.find((c) => c.id === id);
                return r ? (
                  <li key={id} className="flex justify-between gap-3">
                    <span>{r.name}</span>
                    <span className="shrink-0 font-semibold">
                      {formatUsd(r.unit_price)}
                    </span>
                  </li>
                ) : null;
              })}
            </ul>
            <p className="mt-3 border-t border-border pt-3 text-sm font-black text-text-primary dark:border-zinc-700 dark:text-zinc-100">
              Subtotal: {formatUsd(subtotal)}
            </p>
          </div>

          <div className="flex flex-wrap justify-between gap-3">
            <button
              type="button"
              onClick={() => setPhase(1)}
              className="text-sm font-semibold text-text-secondary underline-offset-2 hover:underline"
            >
              Back
            </button>
            <button
              type="button"
              disabled={selectedSvc.size === 0 || busyPatch}
              onClick={() => void persistStep2to3()}
              className="rounded-xl bg-accent px-6 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {busyPatch ? "Saving…" : "Continue"}
            </button>
          </div>
        </div>
      ) : null}

      {/* Step 3 */}
      {phase === 3 && proposalId ? (
        <div className="mt-10 space-y-6">
          {!busyGen ? (
            <>
              <p className="text-sm text-text-secondary dark:text-zinc-400">
                Zenpho merges catalog context with any linked Google listing
                plus a quick homepage/logo scrape when available. Imagery renders
                in Markdown, and raster snapshots are stitched into PDF exports separately. Default model
                is{" "}
                <code className="rounded bg-zinc-200 px-1 text-xs dark:bg-zinc-800">
                  OPENAI_PROPOSAL_MODEL
                </code>
                {" "}
                (falls back to gpt-5.5 unless set).
              </p>
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => setPhase(2)}
                  className="rounded-xl border border-border px-5 py-2 text-sm font-semibold dark:border-zinc-700"
                >
                  Back to services
                </button>
                <button
                  type="button"
                  onClick={() => void runGeneration()}
                  className="inline-flex items-center rounded-xl bg-emerald-600 px-6 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
                >
                  <Sparkles className="mr-2 h-4 w-4" aria-hidden />
                  Generate with AI
                </button>
              </div>
            </>
          ) : (
            <div className="rounded-[2rem] border border-emerald-200 bg-white p-8 shadow-soft-lg dark:border-emerald-950 dark:bg-zinc-900">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-700 dark:text-emerald-400">
                Generating
              </p>
              <h2 className="mt-3 text-xl font-black text-text-primary dark:text-white">
                {GENERATION_SUBSTEPS[genStage]}
              </h2>
              <div className="mt-6 space-y-2">
                {GENERATION_SUBSTEPS.map((label, idx) => {
                  const complete = idx < genStage;
                  const active = idx === genStage;
                  return (
                    <div key={label} className="flex items-center gap-3">
                      <span
                        className={`flex h-7 w-7 items-center justify-center rounded-full border text-xs font-bold ${
                          complete || active
                            ? "border-emerald-600 bg-emerald-600 text-white dark:border-emerald-500 dark:bg-emerald-600"
                            : "border-border bg-surface dark:border-zinc-700"
                        }`}
                      >
                        {complete ? (
                          <CheckCircle2 className="h-4 w-4" aria-hidden />
                        ) : (
                          idx + 1
                        )}
                      </span>
                      <span
                        className={
                          complete || active
                            ? "font-semibold dark:text-white"
                            : "text-text-secondary dark:text-zinc-500"
                        }
                      >
                        {label}
                      </span>
                    </div>
                  );
                })}
              </div>
              <p className="mt-4 text-xs text-text-secondary dark:text-zinc-500">
                Keep this tab open while the model drafts your Markdown proposal.
              </p>
              <button
                type="button"
                onClick={() => abortRef.current?.abort()}
                className="mt-6 text-xs font-semibold uppercase tracking-wide text-red-600 underline"
              >
                Cancel request
              </button>
              <Loader2 className="mt-4 h-6 w-6 animate-spin text-emerald-600" />
            </div>
          )}
        </div>
      ) : null}

      {/* Step 4 */}
      {phase === 4 && proposalId ? (
        <div className="mt-10 space-y-6">
          {busyGen ? (
            <div className="rounded-[2rem] border border-emerald-200 bg-white p-6 dark:border-emerald-950 dark:bg-zinc-900">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-700 dark:text-emerald-400">
                Regenerating
              </p>
              <Loader2 className="mt-4 h-7 w-7 animate-spin text-emerald-600" />
              <p className="mt-3 text-sm text-text-secondary dark:text-zinc-500">
                {GENERATION_SUBSTEPS[
                  Math.min(genStage, GENERATION_SUBSTEPS.length - 1)
                ]}
              </p>
              <button
                type="button"
                onClick={() => abortRef.current?.abort()}
                className="mt-4 text-xs font-semibold uppercase tracking-wide text-red-600 underline"
              >
                Cancel
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary dark:text-zinc-500">
                Proposal title
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-border bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                />
              </label>
              <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary dark:text-zinc-500">
                Proposal document (Markdown)
                <textarea
                  rows={24}
                  value={markdown}
                  onChange={(e) => setMarkdown(e.target.value)}
                  spellCheck={false}
                  className="mt-1 w-full resize-y rounded-xl border border-border bg-white px-3 py-2 font-mono text-sm leading-relaxed dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                />
              </label>
            </div>
          )}

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              disabled={busySave || busyGen}
              onClick={() => void saveDraft()}
              className="rounded-xl bg-accent px-5 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {busySave ? "Saving…" : "Save draft"}
            </button>
            <button
              type="button"
              disabled={busySave || busyGen}
              onClick={() => void finalizeDoc()}
              className="rounded-xl border border-border px-5 py-2 text-sm font-semibold dark:border-zinc-600"
            >
              Mark final
            </button>
            <button
              type="button"
              disabled={busyGen}
              onClick={() => {
                if (
                  !confirm(
                    "Regenerate replaces the Markdown with a fresh AI draft. Continue?"
                  )
                )
                  return;
                void runGeneration();
              }}
              className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-2 text-sm font-semibold text-amber-950 hover:bg-amber-100 disabled:opacity-50 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200"
            >
              Regenerate proposal
            </button>
            <button
              type="button"
              disabled={busyGen || busyPdf}
              onClick={() => setPhase(2)}
              className="rounded-xl border border-border px-5 py-2 text-sm font-semibold dark:border-zinc-600"
            >
              Back to services
            </button>
            <button
              type="button"
              disabled={busyPdf || busyGen}
              onClick={() => void downloadPdf()}
              className="rounded-xl border border-emerald-600 bg-emerald-600 px-5 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {busyPdf ? "Preparing PDF…" : "Download PDF"}
            </button>
          </div>

          <Link
            href={`/proposals/${proposalId}`}
            className="inline-flex text-sm font-semibold text-accent underline underline-offset-2"
          >
            Open full narrative editor (sections + catalog lines)
          </Link>
        </div>
      ) : null}
    </div>
  );
}
