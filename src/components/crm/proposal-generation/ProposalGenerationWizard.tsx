"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  Loader2,
  Sparkles,
} from "lucide-react";
import {
  patchSalesProposalWizardDraft,
  sendSalesProposalEmail,
  updateSalesProposalBodyAndStatus,
} from "@/app/(crm)/actions/sales-proposals";
import ProposalActionsBar from "@/components/crm/proposals/ProposalActionsBar";
import ProposalDocumentCanvas from "@/components/crm/proposals/ProposalDocumentCanvas";
import type { CrmProductServiceRow } from "@/lib/crm/crm-catalog-types";
import { catalogListAndEffectivePrice } from "@/lib/crm/crm-catalog-pricing";
import type { ProposalWizardPartyOption } from "@/lib/crm/fetch-leads-for-proposal-picker";
import type { SalesProposalDetail } from "@/lib/crm/sales-proposal-types";

const STEP_LABELS = [
  "Lead",
  "Services",
  "Generate",
  "Edit & export",
];

const GENERATION_SUBSTEPS = [
  "Planning narrative strategy",
  "Composing Markdown sections",
  "Weaving enrichment & catalogue facts",
  "Rendering AI illustrations (when enabled)",
];

function GenerationProgressPanel({
  genStage,
  onCancel,
  variant = "initial",
}: {
  genStage: number;
  onCancel: () => void;
  variant?: "initial" | "regenerate";
}) {
  const total = GENERATION_SUBSTEPS.length;
  const safeStage = Math.min(Math.max(genStage, 0), total - 1);
  const completedCount = safeStage;

  const title =
    variant === "regenerate" ? "Regenerating proposal" : "Drafting your proposal";
  const subtitle =
    variant === "regenerate"
      ? "Replacing your proposal with a fresh AI draft."
      : "Let's shape the narrative and visuals for your buyer.";

  return (
    <div
      className="relative overflow-hidden rounded-[2rem] border border-zinc-200/90 bg-gradient-to-br from-sky-50/90 via-white to-white p-8 shadow-sm dark:border-zinc-700/80 dark:from-zinc-900/80 dark:via-zinc-900 dark:to-zinc-950 sm:p-10"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="relative z-10 max-w-lg">
        <h2 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-3xl">
          {title}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
          {subtitle}
        </p>

        <p className="mt-6 inline-flex rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
          {completedCount}/{total} completed
        </p>

        <ul className="mt-8 space-y-5">
          {GENERATION_SUBSTEPS.map((label, idx) => {
            const done = idx < safeStage;
            const active = idx === safeStage;

            return (
              <li
                key={label}
                className="flex items-start gap-4"
                aria-current={active ? "step" : undefined}
              >
                <span className="mt-0.5 flex shrink-0 items-center justify-center" aria-hidden>
                  {done ? (
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-900 dark:bg-zinc-100">
                      <Check
                        className="h-4 w-4 text-white dark:text-zinc-900"
                        strokeWidth={2.5}
                        aria-hidden
                      />
                    </span>
                  ) : (
                    <span
                      className={`flex h-8 w-8 rounded-full border-2 border-dashed border-zinc-900 dark:border-zinc-500 ${
                        active ? "ring-2 ring-zinc-900/10 ring-offset-2 ring-offset-white dark:ring-zinc-100/10 dark:ring-offset-zinc-900" : ""
                      }`}
                    />
                  )}
                </span>
                <span
                  className={`pt-1 text-sm leading-snug ${
                    done
                      ? "text-zinc-400 dark:text-zinc-500"
                      : active
                        ? "font-semibold text-zinc-900 dark:text-zinc-100"
                        : "text-zinc-900 dark:text-zinc-200"
                  }`}
                >
                  {label}
                </span>
              </li>
            );
          })}
        </ul>

        <p className="mt-8 text-xs leading-relaxed text-zinc-500 dark:text-zinc-500">
          Keep this tab open while the model drafts your Markdown proposal.
        </p>

        <div className="mt-6 flex flex-wrap items-center gap-4">
          <button
            type="button"
            onClick={onCancel}
            className="text-sm font-medium text-red-600 underline underline-offset-4 transition hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
          >
            Cancel request
          </button>
          <Loader2
            className="h-5 w-5 shrink-0 animate-spin text-zinc-400 dark:text-zinc-500"
            aria-hidden
          />
        </div>
      </div>
    </div>
  );
}

function formatUsd(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(n);
}

type WizardStep = 1 | 2 | 3 | 4;

type WizardPartyKind = "lead" | "client";

function deriveBootstrap(
  resume: SalesProposalDetail | null
): null | {
  step: WizardStep;
  partyId: string;
  partyKind: WizardPartyKind | null;
  selectedIds: Set<string>;
  notes: string;
  title: string;
  markdown: string;
} {
  if (!resume) return null;
  const leadTrim = resume.leadId?.trim() ?? "";
  const clientTrim = resume.clientId?.trim() ?? "";
  const partyKind: WizardPartyKind | null = leadTrim
    ? "lead"
    : clientTrim
      ? "client"
      : null;
  const partyId = leadTrim || clientTrim || "";

  const body = resume.proposal_body?.trim() ?? "";
  if (body.length > 0 && (resume.status === "generated" || resume.status === "final")) {
    return {
      step: 4,
      partyId,
      partyKind,
      selectedIds: new Set(resume.selected_catalog_item_ids),
      notes: resume.wizard_notes ?? "",
      title: resume.title,
      markdown: resume.proposal_body,
    };
  }
  const hasParty = Boolean(partyId);
  const picks = resume.selected_catalog_item_ids ?? [];
  if (hasParty && picks.length > 0) {
    return {
      step: 3,
      partyId,
      partyKind,
      selectedIds: new Set(picks),
      notes: resume.wizard_notes ?? "",
      title: resume.title,
      markdown: "",
    };
  }
  if (hasParty) {
    return {
      step: 2,
      partyId,
      partyKind,
      selectedIds: picks.length ? new Set(picks) : new Set(),
      notes: resume.wizard_notes ?? "",
      title: resume.title,
      markdown: "",
    };
  }
  return {
    step: 1,
    partyId: "",
    partyKind: null,
    selectedIds: new Set(),
    notes: resume.wizard_notes ?? "",
    title: resume.title,
    markdown: "",
  };
}

export default function ProposalGenerationWizard({
  parties,
  catalog,
  initialProposalId: proposalId,
  resume,
}: {
  parties: ProposalWizardPartyOption[];
  catalog: CrmProductServiceRow[];
  /** Draft row created by `/proposals/new` before this view mounts. */
  initialProposalId: string;
  resume: SalesProposalDetail | null;
}) {
  const router = useRouter();

  const [phase, setPhase] = useState<WizardStep>(() =>
    deriveBootstrap(resume)?.step ?? 1
  );

  const boot = deriveBootstrap(resume);
  const [partyId, setPartyId] = useState<string>(boot?.partyId ?? "");
  const [partyKind, setPartyKind] = useState<WizardPartyKind | null>(
    boot?.partyKind ?? null
  );
  const [pickSearch, setPickSearch] = useState("");
  const [selectedSvc, setSelectedSvc] = useState<Set<string>>(
    boot?.selectedIds ?? new Set()
  );
  const [wizardNotes, setWizardNotes] = useState(boot?.notes ?? "");
  const [title, setTitle] = useState(boot?.title ?? "Untitled proposal");
  const [markdown, setMarkdown] = useState(boot?.markdown ?? "");
  const [signatureSignerName, setSignatureSignerName] = useState(
    () => resume?.signature_signer_name?.trim() ?? "",
  );

  const [busyPatch, setBusyPatch] = useState(false);
  const [busyGen, setBusyGen] = useState(false);
  const [busySave, setBusySave] = useState(false);
  const [genStage, setGenStage] = useState(0);
  const [genWarnings, setGenWarnings] = useState<string[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const genIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(
    () => () => {
      genIntervalRef.current && clearInterval(genIntervalRef.current);
      abortRef.current?.abort();
    },
    []
  );

  useEffect(() => {
    setSignatureSignerName(resume?.signature_signer_name?.trim() ?? "");
  }, [resume?.signature_signer_name]);

  function stepIndex(): number {
    return phase - 1;
  }

  const filteredParties = useMemo(() => {
    const q = pickSearch.trim().toLowerCase();
    if (!q) return parties;
    return parties.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.company?.toLowerCase().includes(q) ?? false) ||
        (c.email?.toLowerCase().includes(q) ?? false)
    );
  }, [parties, pickSearch]);

  const selectedParty = useMemo(
    () => parties.find((c) => c.id === partyId) ?? null,
    [parties, partyId]
  );

  const subtotal = useMemo(() => {
    let s = 0;
    for (const id of selectedSvc) {
      const row = catalog.find((c) => c.id === id);
      if (row) s += catalogListAndEffectivePrice(row).effectivePrice;
    }
    return s;
  }, [catalog, selectedSvc]);

  const selectedServiceLines = useMemo(
    () =>
      [...selectedSvc]
        .map((id) => catalog.find((c) => c.id === id))
        .filter((row): row is CrmProductServiceRow => Boolean(row))
        .map((row) => {
          const pe = catalogListAndEffectivePrice(row);
          return {
            id: row.id,
            description_snapshot: row.description.trim()
              ? `${row.name}\n\n${row.description.trim()}`
              : row.name,
            unit_price_snapshot: pe.effectivePrice,
            list_unit_price_snapshot: pe.hasDiscount ? pe.listPrice : null,
          };
        }),
    [catalog, selectedSvc]
  );

  const persistStep1to2 = async () => {
    if (!proposalId.trim() || !partyId.trim() || !partyKind) return;
    setErr(null);
    setBusyPatch(true);
    const res = await patchSalesProposalWizardDraft(proposalId, {
      ...(partyKind === "lead"
        ? { leadId: partyId.trim(), clientId: null }
        : { clientId: partyId.trim(), leadId: null }),
      title: title.trim() || "Untitled proposal",
    });
    setBusyPatch(false);
    if ("error" in res && res.error) {
      setErr(res.error);
      return;
    }
    setPhase(2);
  };

  const persistStep2to3 = async () => {
    if (!proposalId.trim() || selectedSvc.size === 0) return;
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
    if (!proposalId.trim()) return;
    setErr(null);
    setBusyGen(true);
    setGenStage(0);
    genIntervalRef.current && clearInterval(genIntervalRef.current);
    genIntervalRef.current = setInterval(() => {
      setGenStage((s) => Math.min(s + 1, GENERATION_SUBSTEPS.length - 1));
    }, 4_600);

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
        warnings?: unknown;
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

      const w = Array.isArray(payload.warnings)
        ? payload.warnings.filter((x): x is string => typeof x === "string")
        : [];
      setGenWarnings(w);

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
    setNotice(null);
    setBusySave(true);
    const res = await updateSalesProposalBodyAndStatus(proposalId, {
      title: title.trim() || "Untitled proposal",
      proposal_body: markdown,
      status: "draft",
      signature_signer_name: signatureSignerName.trim() || null,
    });
    setBusySave(false);
    if ("error" in res && res.error) setErr(res.error);
    else {
      setNotice("Draft saved.");
      router.refresh();
    }
  }

  /** Sync current editor markdown (including Spanish) to the server before PDF export. */
  async function persistBodyForPdfExport() {
    if (!proposalId) return;
    const statusForSave =
      resume?.status === "final" ||
      resume?.status === "sent" ||
      resume?.status === "generated"
        ? resume.status
        : "draft";
    const res = await updateSalesProposalBodyAndStatus(proposalId, {
      title: title.trim() || "Untitled proposal",
      proposal_body: markdown,
      status: statusForSave,
      signature_signer_name: signatureSignerName.trim() || null,
    });
    if ("error" in res && res.error) throw new Error(res.error);
    router.refresh();
  }

  async function finalizeDoc() {
    if (!proposalId) return;
    setErr(null);
    setNotice(null);
    setBusySave(true);
    const res = await updateSalesProposalBodyAndStatus(proposalId, {
      title: title.trim() || "Untitled proposal",
      proposal_body: markdown,
      status: "final",
      signature_signer_name: signatureSignerName.trim() || null,
    });
    setBusySave(false);
    if ("error" in res && res.error) setErr(res.error);
    else {
      setNotice("Proposal marked final.");
      router.refresh();
    }
  }

  async function sendEmail() {
    if (!proposalId) return;
    setErr(null);
    setNotice(null);
    const save = await updateSalesProposalBodyAndStatus(proposalId, {
      title: title.trim() || "Untitled proposal",
      proposal_body: markdown,
      status: "final",
      signature_signer_name: signatureSignerName.trim() || null,
    });
    if ("error" in save && save.error) throw new Error(save.error);
    const sent = await sendSalesProposalEmail(proposalId);
    if ("error" in sent && sent.error) throw new Error(sent.error);
    setNotice("Proposal sent by email.");
    router.refresh();
  }

  function recipientEmail(): string | null {
    if (selectedParty?.email?.trim()) return selectedParty.email.trim();
    if (resume?.partyContact?.email?.trim()) return resume.partyContact.email.trim();
    return null;
  }

  function toggleService(id: string) {
    setSelectedSvc((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const stepperUi = (
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
                  ? "border-orange-300 bg-orange-200 text-orange-900 dark:border-orange-400/45 dark:bg-orange-500/25 dark:text-orange-100"
                  : active
                    ? "border-orange-400 bg-orange-300 text-orange-950 dark:border-orange-400/55 dark:bg-orange-500/35 dark:text-orange-50"
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
        Choose an open lead, add your services and any notes, and you'll get a draft proposal you can refine here, export as a PDF, or continue in the full editor.
      </p>

      <div className="mt-8">{stepperUi}</div>

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
      {notice ? (
        <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200">
          {notice}
        </div>
      ) : null}

      {/* Step 1 */}
      {phase === 1 ? (
        <div className="mt-10 grid gap-8 lg:grid-cols-[1fr,minmax(0,320px)]">
          <div className="space-y-4">
            <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary dark:text-zinc-500">
              Search leads
              <input
                type="search"
                placeholder="Filter by name, company, email"
                value={pickSearch}
                onChange={(e) => setPickSearch(e.target.value)}
                className="mt-1 w-full rounded-xl border border-border bg-white px-3 py-2 text-sm outline-none focus:border-blue-400 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
              />
            </label>
            <ul className="max-h-[440px] space-y-1 overflow-y-auto rounded-2xl border border-border bg-white p-2 dark:border-zinc-700 dark:bg-zinc-950">
              {filteredParties.length === 0 ? (
                <li className="px-4 py-8 text-center text-sm text-text-secondary">
                  No leads match — add open leads first, or widen your search.
                </li>
              ) : (
                filteredParties.map((c) => (
                  <li key={`${c.partyKind}-${c.id}`}>
                    <button
                      type="button"
                      onClick={() => {
                        setPartyId(c.id);
                        setPartyKind(c.partyKind);
                      }}
                      className={`flex w-full flex-col rounded-xl px-3 py-3 text-left text-sm transition hover:bg-zinc-50 dark:hover:bg-zinc-900 ${
                        partyId === c.id
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
                      {c.partyKind === "client" ? (
                        <span className="mt-1 text-[10px] uppercase tracking-wide text-zinc-500">
                          Proposal linked via client · pick a lead for new drafts
                        </span>
                      ) : null}
                    </button>
                  </li>
                ))
              )}
            </ul>
          </div>
          <aside className="rounded-2xl border border-border bg-zinc-50/80 p-5 dark:border-zinc-700 dark:bg-zinc-900/40">
            <p className="text-[10px] font-bold uppercase tracking-widest text-text-secondary dark:text-zinc-500">
              Selected lead
            </p>
            {!selectedParty ? (
              <p className="mt-4 text-sm text-text-secondary">
                Choose someone from the list.
              </p>
            ) : (
              <dl className="mt-4 space-y-2 text-sm">
                <div>
                  <dt className="text-[10px] font-bold uppercase text-text-secondary dark:text-zinc-500">
                    Name
                  </dt>
                  <dd className="font-medium">{selectedParty.name}</dd>
                </div>
                {selectedParty.company ? (
                  <div>
                    <dt className="text-[10px] font-bold uppercase text-text-secondary dark:text-zinc-500">
                      Company
                    </dt>
                    <dd>{selectedParty.company}</dd>
                  </div>
                ) : null}
                {selectedParty.email ? (
                  <div>
                    <dt className="text-[10px] font-bold uppercase text-text-secondary dark:text-zinc-500">
                      Email
                    </dt>
                    <dd className="break-all">{selectedParty.email}</dd>
                  </div>
                ) : (
                  <p className="text-xs text-zinc-500">No email on file</p>
                )}
                {selectedParty.phone ? (
                  <div>
                    <dt className="text-[10px] font-bold uppercase text-text-secondary dark:text-zinc-500">
                      Phone
                    </dt>
                    <dd>{selectedParty.phone}</dd>
                  </div>
                ) : (
                  <p className="text-xs text-zinc-500">No phone on file</p>
                )}
                {selectedParty.notes?.trim() ? (
                  <div>
                    <dt className="text-[10px] font-bold uppercase text-text-secondary dark:text-zinc-500">
                      Notes
                    </dt>
                    <dd className="max-h-32 overflow-y-auto whitespace-pre-wrap text-xs text-text-secondary">
                      {selectedParty.notes.trim()}
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
              disabled={
                !partyId.trim() || partyKind === null || busyPatch
              }
              onClick={() => void persistStep1to2()}
              className="rounded-xl bg-accent px-6 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {busyPatch ? "Saving…" : "Continue"}
            </button>
          </div>
        </div>
      ) : null}

      {/* Step 2 */}
      {phase === 2 ? (
        <div className="mt-10 space-y-6">
          <p className="max-w-xl text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
            Select one or more services. Timeline and deliverables should live in
            descriptions for now.
          </p>
          <ul className="overflow-hidden rounded-xl border border-zinc-200/80 bg-white dark:border-zinc-800 dark:bg-zinc-950">
            {catalog.length === 0 ? (
              <li className="px-4 py-12 text-center text-sm text-zinc-500 dark:text-zinc-400">
                Your catalog is empty.{" "}
                <Link className="text-accent underline underline-offset-2" href="/products-services">
                  Manage catalog
                </Link>
              </li>
            ) : (
              catalog.map((row) => {
                const sel = selectedSvc.has(row.id);
                return (
                  <li
                    key={row.id}
                    className="border-b border-zinc-100 last:border-b-0 dark:border-zinc-800/80"
                  >
                    <label
                      className={`flex cursor-pointer items-start gap-3 px-4 py-3.5 transition-colors hover:bg-zinc-50/70 dark:hover:bg-zinc-900/40 has-[:focus-visible]:relative has-[:focus-visible]:z-10 ${
                        sel
                          ? "bg-zinc-50/90 dark:bg-zinc-900/50"
                          : ""
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={sel}
                        onChange={() => toggleService(row.id)}
                        className="mt-0.5 h-[1.125rem] w-[1.125rem] shrink-0 rounded border-zinc-300 bg-white text-zinc-900 accent-zinc-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900/20 focus-visible:ring-offset-2 dark:border-zinc-600 dark:bg-zinc-950 dark:accent-zinc-100 dark:focus-visible:ring-white/25 dark:focus-visible:ring-offset-zinc-950"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                          {row.name}
                        </p>
                        {row.description.trim() ? (
                          <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-zinc-500 dark:text-zinc-500">
                            {row.description}
                          </p>
                        ) : null}
                      </div>
                      <div className="shrink-0 text-right text-sm font-medium tabular-nums text-zinc-700 dark:text-zinc-300">
                        {(() => {
                          const pe = catalogListAndEffectivePrice(row);
                          return pe.hasDiscount ? (
                            <span className="inline-flex flex-col items-end gap-0.5 sm:flex-row sm:items-baseline sm:gap-2">
                              <span className="text-xs font-normal text-zinc-400 line-through dark:text-zinc-600">
                                {formatUsd(pe.listPrice)}
                              </span>
                              <span className="text-emerald-700 dark:text-emerald-400">
                                {formatUsd(pe.effectivePrice)}
                              </span>
                            </span>
                          ) : (
                            formatUsd(pe.listPrice)
                          );
                        })()}
                      </div>
                    </label>
                  </li>
                );
              })
            )}
          </ul>

          <label className="block text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-500 dark:text-zinc-500">
            Proposal notes / instructions for AI (optional)
            <textarea
              rows={4}
              value={wizardNotes}
              onChange={(e) => setWizardNotes(e.target.value)}
              className="mt-2 w-full rounded-lg border border-zinc-200/90 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none transition-shadow placeholder:text-zinc-400 focus:border-zinc-300 focus:ring-1 focus:ring-zinc-900/10 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100 dark:focus:border-zinc-600 dark:focus:ring-white/10"
            />
          </label>

          <div className="rounded-xl border border-zinc-200/80 bg-zinc-50/40 px-4 py-4 dark:border-zinc-800 dark:bg-zinc-900/25">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-500 dark:text-zinc-500">
              Selection summary
            </p>
            <ul className="mt-2 space-y-0.5 text-sm text-zinc-800 dark:text-zinc-200">
              {[...selectedSvc].map((id) => {
                const r = catalog.find((c) => c.id === id);
                return r ? (
                  <li key={id} className="flex justify-between gap-3 py-1">
                    <span className="font-medium">{r.name}</span>
                    <span className="shrink-0 text-right font-medium tabular-nums text-zinc-600 dark:text-zinc-400">
                      {(() => {
                        const pe = catalogListAndEffectivePrice(r);
                        return pe.hasDiscount ? (
                          <span className="inline-flex flex-col items-end gap-0.5 sm:flex-row sm:items-baseline sm:gap-2">
                            <span className="text-xs font-normal text-zinc-400 line-through dark:text-zinc-600">
                              {formatUsd(pe.listPrice)}
                            </span>
                            <span className="text-emerald-700 dark:text-emerald-400">
                              {formatUsd(pe.effectivePrice)}
                            </span>
                          </span>
                        ) : (
                          formatUsd(pe.listPrice)
                        );
                      })()}
                    </span>
                  </li>
                ) : null;
              })}
            </ul>
            <p className="mt-3 border-t border-zinc-200/90 pt-3 text-sm font-semibold tabular-nums text-zinc-900 dark:border-zinc-800 dark:text-zinc-100">
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
      {phase === 3 ? (
        <div className="mt-10 space-y-6">
          {!busyGen ? (
            <>
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
                  className="inline-flex items-center rounded-xl bg-orange-600 px-6 py-2 text-sm font-semibold text-white hover:bg-orange-700"
                >
                  <Sparkles className="mr-2 h-4 w-4" aria-hidden />
                  Generate
                </button>
              </div>
            </>
          ) : (
            <GenerationProgressPanel
              genStage={genStage}
              onCancel={() => abortRef.current?.abort()}
            />
          )}
        </div>
      ) : null}

      {/* Step 4 */}
      {phase === 4 ? (
        <div className="mt-10 space-y-6">
          {busyGen ? (
            <GenerationProgressPanel
              genStage={genStage}
              onCancel={() => abortRef.current?.abort()}
              variant="regenerate"
            />
          ) : (
            <div className="space-y-4">
              {genWarnings.length > 0 ? (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
                  <p className="text-xs font-bold uppercase tracking-wide">
                    Generation notes
                  </p>
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-xs">
                    {genWarnings.map((w) => (
                      <li key={w}>{w}</li>
                    ))}
                  </ul>
                  <button
                    type="button"
                    onClick={() => setGenWarnings([])}
                    className="mt-2 text-xs font-semibold underline"
                  >
                    Dismiss notes
                  </button>
                </div>
              ) : null}
              <ProposalDocumentCanvas
                proposalId={proposalId}
                signatureImagePath={resume?.signature_image_path ?? null}
                signatureSignerName={signatureSignerName}
                onSignatureSignerNameChange={setSignatureSignerName}
                onSignatureSaved={() => router.refresh()}
                title={title}
                onTitleChange={setTitle}
                buyerName={selectedParty?.name ?? resume?.clientName ?? null}
                markdown={markdown}
                onMarkdownChange={setMarkdown}
                status="generated"
                place={resume?.google_place_snapshot ?? null}
                aiVisuals={resume?.ai_visuals ?? []}
                serviceLines={selectedServiceLines}
                totalPriceEstimate={
                  subtotal > 0 ? subtotal : (resume?.total_price_estimate ?? null)
                }
              />
            </div>
          )}

          <ProposalActionsBar
            proposalId={proposalId}
            recipientEmail={recipientEmail()}
            busySave={busySave}
            disabled={busyGen}
            onSaveDraft={saveDraft}
            onMarkFinal={finalizeDoc}
            onSendEmail={sendEmail}
            onBeforePdf={persistBodyForPdfExport}
          />

          <div className="flex flex-wrap gap-3">
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
              disabled={busyGen}
              onClick={() => setPhase(2)}
              className="rounded-xl border border-border px-5 py-2 text-sm font-semibold dark:border-zinc-600"
            >
              Back to services
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
