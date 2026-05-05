"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  deleteSalesProposal,
  saveSalesProposal,
  type SalesCatalogLineInput,
} from "@/app/(crm)/actions/sales-proposals";
import type { CrmProductServiceRow } from "@/lib/crm/crm-catalog-types";
import type { ProposalClientOption } from "@/lib/crm/fetch-clients-for-proposal-picker";
import type {
  SalesProposalDetail,
  SalesProposalStatus,
} from "@/lib/crm/sales-proposal-types";
import {
  SALES_PROPOSAL_STATUSES,
  salesProposalStatusLabel,
} from "@/lib/crm/sales-proposal-types";
import { Plus, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

function formatMoney(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(n);
}

type CatalogDraft = SalesCatalogLineInput;

const inputArea =
  "w-full rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-blue-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100";

export default function SalesProposalEditorView({
  initial,
  catalogOptions,
  clientOptions,
}: {
  initial: SalesProposalDetail;
  catalogOptions: CrmProductServiceRow[];
  clientOptions: ProposalClientOption[];
}) {
  const router = useRouter();

  const [title, setTitle] = useState(initial.title);
  const [status, setStatus] = useState<SalesProposalStatus>(initial.status);
  const [clientId, setClientId] = useState<string>(initial.clientId ?? "");
  const [aboutUs, setAboutUs] = useState(initial.about_us);
  const [ourStory, setOurStory] = useState(initial.our_story);
  const [servicesOverview, setServicesOverview] = useState(
    initial.services_overview
  );
  const [closingNotes, setClosingNotes] = useState(initial.closing_notes);
  const [proposalBody, setProposalBody] = useState(initial.proposal_body);

  const [lines, setLines] = useState<CatalogDraft[]>(
    initial.catalogLines.length > 0
      ? initial.catalogLines.map((l) => ({
          catalog_item_id: l.catalog_item_id,
          description_snapshot: l.description_snapshot,
          unit_price_snapshot: l.unit_price_snapshot,
        }))
      : []
  );

  const [catalogPick, setCatalogPick] = useState("");
  const [saving, setSaving] = useState(false);
  const [busyDelete, setBusyDelete] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    setTitle(initial.title);
    setStatus(initial.status);
    setClientId(initial.clientId ?? "");
    setAboutUs(initial.about_us);
    setOurStory(initial.our_story);
    setServicesOverview(initial.services_overview);
    setClosingNotes(initial.closing_notes);
    setProposalBody(initial.proposal_body);
    setLines(
      initial.catalogLines.map((l) => ({
        catalog_item_id: l.catalog_item_id,
        description_snapshot: l.description_snapshot,
        unit_price_snapshot: l.unit_price_snapshot,
      }))
    );
  }, [initial.id, initial.updatedAt]);

  const persist = useCallback(async () => {
    setMsg(null);
    setSaving(true);
    const res = await saveSalesProposal(initial.id, {
      title,
      status,
      clientId: clientId.trim() || null,
      about_us: aboutUs,
      our_story: ourStory,
      services_overview: servicesOverview,
      closing_notes: closingNotes,
      proposal_body: proposalBody,
      catalogLines: lines,
    });
    setSaving(false);
    if ("error" in res && res.error) setMsg(res.error);
    else router.refresh();
  }, [
    initial.id,
    title,
    status,
    clientId,
    aboutUs,
    ourStory,
    servicesOverview,
    closingNotes,
    proposalBody,
    lines,
    router,
  ]);

  async function onDelete() {
    if (!confirm("Delete this proposal document?")) return;
    setBusyDelete(true);
    setMsg(null);
    const res = await deleteSalesProposal(initial.id);
    setBusyDelete(false);
    if ("error" in res && res.error) {
      setMsg(res.error);
      return;
    }
    router.replace("/proposals");
    router.refresh();
  }

  function addFromCatalog() {
    const id = catalogPick.trim();
    if (!id) return;
    const item = catalogOptions.find((c) => c.id === id);
    if (!item) return;
    const snapshot = item.description.trim()
      ? `${item.name}\n\n${item.description.trim()}`
      : item.name;
    setLines((prev) => [
      ...prev,
      {
        catalog_item_id: item.id,
        description_snapshot: snapshot,
        unit_price_snapshot: item.unit_price,
      },
    ]);
    setCatalogPick("");
  }

  function updateLine(i: number, patch: Partial<CatalogDraft>) {
    setLines((prev) =>
      prev.map((row, j) => (j === i ? { ...row, ...patch } : row))
    );
  }

  function removeLine(i: number) {
    setLines((prev) => prev.filter((_, j) => j !== i));
  }

  const previewBullets = useMemo(
    () =>
      lines
        .map((l) => l.description_snapshot.trim())
        .filter(Boolean)
        .slice(0, 12),
    [lines]
  );

  const clientPreviewName = useMemo(() => {
    if (!clientId.trim()) return "Client (optional)";
    const hit = clientOptions.find((c) => c.id === clientId.trim());
    if (!hit) return initial.clientName ?? "Selected client";
    return hit.company
      ? `${hit.name || hit.company}`
      : hit.name || hit.email || hit.company || "Client";
  }, [clientId, clientOptions, initial.clientName]);

  return (
    <div className="mx-auto grid max-w-[1400px] gap-8 px-4 py-8 lg:grid-cols-[minmax(0,1fr)_minmax(280px,400px)]">
      <div className="space-y-8">
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/proposals"
            className="text-sm text-text-secondary hover:text-text-primary dark:text-zinc-500"
          >
            ← Proposals
          </Link>
          <Link
            href={`/proposals/new?proposal=${encodeURIComponent(initial.id)}`}
            className="rounded-xl border border-border px-3 py-2 text-xs font-semibold text-accent hover:bg-surface dark:border-zinc-700"
          >
            Proposal generation wizard
          </Link>
          <button
            type="button"
            disabled={saving}
            onClick={() => void persist()}
            className="ml-auto rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-accent-hover disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save"}
          </button>
          <button
            type="button"
            disabled={busyDelete}
            onClick={() => void onDelete()}
            className="rounded-xl border border-red-200 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950/30"
          >
            Delete
          </button>
        </div>

        {msg ? (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200">
            {msg}
          </p>
        ) : null}

        <section className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-wider text-text-secondary dark:text-zinc-500">
            Title
          </label>
          <input className={inputArea} value={title} onChange={(e) => setTitle(e.target.value)} />
        </section>

        <div className="grid gap-4 sm:grid-cols-2">
          <section className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-text-secondary dark:text-zinc-500">
              Status
            </label>
            <select
              className={inputArea}
              value={status}
              onChange={(e) =>
                setStatus(e.target.value as SalesProposalStatus)
              }
            >
              {SALES_PROPOSAL_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {salesProposalStatusLabel(s)}
                </option>
              ))}
            </select>
          </section>
          <section className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-text-secondary dark:text-zinc-500">
              Linked client (optional)
            </label>
            <select
              className={inputArea}
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
            >
              <option value="">No client linked</option>
              {clientOptions.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                  {c.company ? ` — ${c.company}` : ""}
                </option>
              ))}
            </select>
          </section>
        </div>

        <section className="space-y-3">
          <LabelBlock title="Wizard document (Markdown)" />
          <textarea
            rows={10}
            spellCheck={false}
            className={`${inputArea} font-mono text-xs leading-relaxed`}
            placeholder="Populated when you use Proposal Generation…"
            value={proposalBody}
            onChange={(e) => setProposalBody(e.target.value)}
          />
          <p className="text-[11px] text-text-secondary dark:text-zinc-500">
            Full narrative sections below are separate from the wizard export;
            keep both in sync manually if you use both flows.
          </p>
        </section>

        <section className="space-y-3">
          <LabelBlock title="About us" />
          <textarea
            rows={6}
            className={inputArea}
            placeholder="Who you are, positioning, credibility."
            value={aboutUs}
            onChange={(e) => setAboutUs(e.target.value)}
          />
        </section>

        <section className="space-y-3">
          <LabelBlock title="Our story" />
          <textarea
            rows={6}
            className={inputArea}
            placeholder="Why you exist — narrative for the buyer."
            value={ourStory}
            onChange={(e) => setOurStory(e.target.value)}
          />
        </section>

        <section className="space-y-3">
          <LabelBlock title="Services overview" />
          <textarea
            rows={6}
            className={inputArea}
            placeholder="How you help; engagement model, timelines, differentiation."
            value={servicesOverview}
            onChange={(e) => setServicesOverview(e.target.value)}
          />
        </section>

        <section className="space-y-3">
          <LabelBlock title="Closing notes" />
          <textarea
            rows={4}
            className={inputArea}
            placeholder="Next steps, contact, reassurance."
            value={closingNotes}
            onChange={(e) => setClosingNotes(e.target.value)}
          />
        </section>

        <section className="space-y-4 rounded-2xl border border-border bg-zinc-50/80 p-4 dark:border-zinc-700 dark:bg-zinc-900/40">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-xs font-bold uppercase tracking-widest text-text-secondary dark:text-zinc-500">
              Selected products & services
            </h3>
            <div className="flex flex-wrap items-center gap-2">
              {catalogOptions.length > 0 ? (
                <>
                  <select
                    className={`${inputArea} max-w-xs text-xs`}
                    value={catalogPick}
                    aria-label="Add from catalog"
                    onChange={(e) => setCatalogPick(e.target.value)}
                  >
                    <option value="">Add from catalog…</option>
                    {catalogOptions.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({formatMoney(c.unit_price)})
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={addFromCatalog}
                    disabled={!catalogPick.trim()}
                    className="inline-flex items-center gap-1 rounded-lg border border-border bg-white px-2 py-1.5 text-xs font-semibold disabled:opacity-50 dark:bg-zinc-800"
                  >
                    <Plus className="h-3 w-3" />
                    Add
                  </button>
                </>
              ) : (
                <Link
                  href="/products-services"
                  className="text-xs font-medium text-accent underline"
                >
                  Add catalog items
                </Link>
              )}
            </div>
          </div>
          {lines.length === 0 ? (
            <p className="text-sm text-text-secondary dark:text-zinc-500">
              No services referenced yet — pick from Products & Services or leave
              this section blank.
            </p>
          ) : (
            <ul className="space-y-3">
              {lines.map((li, i) => (
                <li
                  key={i}
                  className="rounded-xl border border-border bg-white p-3 dark:border-zinc-700 dark:bg-zinc-900"
                >
                  {li.catalog_item_id ? (
                    <span className="mb-1 inline-block rounded bg-zinc-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                      Catalog
                    </span>
                  ) : null}
                  <textarea
                    rows={3}
                    className={`${inputArea} mt-1`}
                    value={li.description_snapshot}
                    onChange={(e) =>
                      updateLine(i, { description_snapshot: e.target.value })
                    }
                  />
                  <div className="mt-2 flex flex-wrap items-end justify-between gap-2">
                    <label className="text-[10px] font-semibold uppercase text-text-secondary dark:text-zinc-500">
                      Guide price (USD)
                      <input
                        type="number"
                        min={0}
                        step={0.01}
                        className={`${inputArea} mt-0.5 w-36`}
                        value={li.unit_price_snapshot}
                        onChange={(e) =>
                          updateLine(i, {
                            unit_price_snapshot: Number(e.target.value) || 0,
                          })
                        }
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() => removeLine(i)}
                      className="rounded-lg p-2 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30"
                      title="Remove line"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <aside className="lg:sticky lg:top-8 lg:self-start">
        <div className="rounded-2xl border border-border bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-[10px] font-bold uppercase tracking-widest text-text-secondary dark:text-zinc-500">
            Preview summary
          </p>
          <p className="mt-4 text-xs text-text-secondary dark:text-zinc-500">
            For — <strong className="text-text-primary dark:text-zinc-200">{clientPreviewName}</strong>
          </p>
          <h2 className="mt-2 text-xl font-bold text-text-primary dark:text-zinc-100">
            {title || "Untitled proposal"}
          </h2>

          <div className="mt-6 space-y-4 text-sm text-text-primary dark:text-zinc-200">
            <PreviewSection label="About us" body={aboutUs} />
            <PreviewSection label="Our story" body={ourStory} />
            <PreviewSection label="Services overview" body={servicesOverview} />
            {previewBullets.length > 0 ? (
              <div>
                <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-text-secondary dark:text-zinc-500">
                  Highlighted offerings
                </p>
                <ul className="list-inside list-disc space-y-1 text-xs leading-relaxed text-text-secondary dark:text-zinc-400">
                  {previewBullets.map((b, idx) => (
                    <li key={idx}>{b.split("\n")[0]!.slice(0, 140)}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            <PreviewSection label="Closing" body={closingNotes} />
          </div>

          <p className="mt-6 border-t border-border pt-4 text-[10px] text-text-secondary dark:border-zinc-800 dark:text-zinc-600">
            This is not a billing document. Invoice-style quotes live under
            Sales → Invoices.
          </p>
        </div>
      </aside>
    </div>
  );
}

function LabelBlock({ title }: { title: string }) {
  return (
    <label className="text-xs font-bold uppercase tracking-wider text-text-secondary dark:text-zinc-500">
      {title}
    </label>
  );
}

function PreviewSection({
  label,
  body,
}: {
  label: string;
  body: string;
}) {
  const t = body.trim();
  if (!t) return null;
  return (
    <div>
      <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-text-secondary dark:text-zinc-500">
        {label}
      </p>
      <p className="whitespace-pre-wrap text-xs leading-relaxed text-text-secondary dark:text-zinc-400">
        {t.length > 500 ? `${t.slice(0, 500)}…` : t}
      </p>
    </div>
  );
}
