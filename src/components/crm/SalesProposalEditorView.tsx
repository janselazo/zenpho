"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  deleteSalesProposal,
  saveSalesProposal,
  sendSalesProposalEmail,
  type SalesCatalogLineInput,
} from "@/app/(crm)/actions/sales-proposals";
import ProposalActionsBar from "@/components/crm/proposals/ProposalActionsBar";
import ProposalDocumentCanvas from "@/components/crm/proposals/ProposalDocumentCanvas";
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
    initial.services_overview,
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
      : [],
  );

  const [catalogPick, setCatalogPick] = useState("");
  const [signatureSignerName, setSignatureSignerName] = useState(
    () => initial.signature_signer_name?.trim() ?? "",
  );
  const [saving, setSaving] = useState(false);
  const [busyDelete, setBusyDelete] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    setTitle(initial.title);
    setStatus(initial.status);
    setClientId(initial.clientId ?? "");
    setAboutUs(initial.about_us);
    setOurStory(initial.our_story);
    setServicesOverview(initial.services_overview);
    setClosingNotes(initial.closing_notes);
    setProposalBody(initial.proposal_body);
    setSignatureSignerName(initial.signature_signer_name?.trim() ?? "");
    setLines(
      initial.catalogLines.map((l) => ({
        catalog_item_id: l.catalog_item_id,
        description_snapshot: l.description_snapshot,
        unit_price_snapshot: l.unit_price_snapshot,
      })),
    );
  }, [initial.id, initial.updatedAt]);

  const savePayload = useCallback(
    (nextStatus: SalesProposalStatus = status) => ({
      title,
      status: nextStatus,
      clientId: clientId.trim() || null,
      about_us: aboutUs,
      our_story: ourStory,
      services_overview: servicesOverview,
      closing_notes: closingNotes,
      proposal_body: proposalBody,
      catalogLines: lines,
      signature_signer_name: signatureSignerName.trim() || null,
    }),
    [
      aboutUs,
      clientId,
      closingNotes,
      lines,
      ourStory,
      proposalBody,
      servicesOverview,
      signatureSignerName,
      status,
      title,
    ],
  );

  const persist = useCallback(async () => {
    setMsg(null);
    setNotice(null);
    setSaving(true);
    const res = await saveSalesProposal(initial.id, savePayload());
    setSaving(false);
    if ("error" in res && res.error) setMsg(res.error);
    else {
      setNotice("Proposal saved.");
      router.refresh();
    }
  }, [initial.id, router, savePayload]);

  async function markFinal() {
    setMsg(null);
    setNotice(null);
    setSaving(true);
    const res = await saveSalesProposal(initial.id, savePayload("final"));
    setSaving(false);
    if ("error" in res && res.error) {
      setMsg(res.error);
      return;
    }
    setStatus("final");
    setNotice("Proposal marked final.");
    router.refresh();
  }

  async function sendEmail() {
    setMsg(null);
    setNotice(null);
    const saved = await saveSalesProposal(initial.id, savePayload("final"));
    if ("error" in saved && saved.error) throw new Error(saved.error);
    const sent = await sendSalesProposalEmail(initial.id);
    if ("error" in sent && sent.error) throw new Error(sent.error);
    setStatus("sent");
    setNotice("Proposal sent by email.");
    router.refresh();
  }

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
      prev.map((row, j) => (j === i ? { ...row, ...patch } : row)),
    );
  }

  function removeLine(i: number) {
    setLines((prev) => prev.filter((_, j) => j !== i));
  }

  const clientPreviewName = useMemo(() => {
    if (initial.partyContact?.name?.trim()) return initial.partyContact.name;
    if (!clientId.trim()) return initial.clientName ?? "Client (optional)";
    const hit = clientOptions.find((c) => c.id === clientId.trim());
    if (!hit) return initial.clientName ?? "Selected client";
    return hit.company
      ? `${hit.name || hit.company}`
      : hit.name || hit.email || hit.company || "Client";
  }, [clientId, clientOptions, initial.clientName, initial.partyContact?.name]);

  const currentEstimate = useMemo(() => {
    if (lines.length === 0) return initial.total_price_estimate;
    return lines.reduce((sum, line) => sum + line.unit_price_snapshot, 0);
  }, [initial.total_price_estimate, lines]);

  return (
    <div className="mx-auto max-w-[1600px] space-y-8 px-4 py-8">
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
          disabled={busyDelete}
          onClick={() => void onDelete()}
          className="ml-auto rounded-xl border border-red-200 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950/30"
        >
          Delete
        </button>
      </div>

      {msg ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200">
          {msg}
        </p>
      ) : null}
      {notice ? (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-200">
          {notice}
        </p>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section className="rounded-2xl border border-border bg-surface/70 p-4 text-sm text-text-secondary dark:border-zinc-800 dark:bg-zinc-900/40">
          Edit the proposal directly in the document below. The title, section
          headings, and copy are saved back to the same Markdown used for PDF
          download and email sending.
        </section>
        <section className="space-y-2">
          <LabelBlock title="Status" />
          <select
            className={inputArea}
            value={status}
            onChange={(e) => setStatus(e.target.value as SalesProposalStatus)}
          >
            {SALES_PROPOSAL_STATUSES.map((s) => (
              <option key={s} value={s}>
                {salesProposalStatusLabel(s)}
              </option>
            ))}
          </select>
        </section>
      </div>

      <ProposalActionsBar
        proposalId={initial.id}
        recipientEmail={initial.partyContact?.email}
        busySave={saving}
        onSaveDraft={persist}
        onMarkFinal={markFinal}
        onSendEmail={sendEmail}
      />

      <div className="space-y-8">
        <div className="space-y-6">
          <div className="rounded-2xl border border-border bg-surface/70 p-4 dark:border-zinc-800 dark:bg-zinc-900/40">
            <div className="grid gap-4 sm:grid-cols-2">
              <section className="space-y-2">
                <LabelBlock title="Linked client (optional)" />
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
              <div className="text-xs leading-relaxed text-text-secondary">
                <p className="font-bold uppercase tracking-wider">Buyer</p>
                <p className="mt-2 text-sm font-semibold text-text-primary dark:text-zinc-100">
                  {clientPreviewName}
                </p>
                {initial.partyContact?.email ? (
                  <p className="mt-1 break-all">{initial.partyContact.email}</p>
                ) : null}
              </div>
            </div>
          </div>

          <ProposalDocumentCanvas
            proposalId={initial.id}
            signatureImagePath={initial.signature_image_path}
            signatureSignerName={signatureSignerName}
            onSignatureSignerNameChange={setSignatureSignerName}
            title={title}
            onTitleChange={setTitle}
            buyerName={clientPreviewName}
            markdown={proposalBody}
            onMarkdownChange={setProposalBody}
            status={status}
            place={initial.google_place_snapshot}
            aiVisuals={initial.ai_visuals}
            serviceLines={lines}
            totalPriceEstimate={currentEstimate}
          />

          <details className="rounded-2xl border border-border bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
            <summary className="cursor-pointer text-xs font-bold uppercase tracking-widest text-text-secondary">
              Optional legacy narrative fields
            </summary>
            <div className="mt-4 space-y-4">
              <LegacyTextArea
                label="About us"
                rows={5}
                value={aboutUs}
                onChange={setAboutUs}
                placeholder="Who you are, positioning, credibility."
              />
              <LegacyTextArea
                label="Our story"
                rows={5}
                value={ourStory}
                onChange={setOurStory}
                placeholder="Why you exist — narrative for the buyer."
              />
              <LegacyTextArea
                label="Services overview"
                rows={5}
                value={servicesOverview}
                onChange={setServicesOverview}
                placeholder="How you help; engagement model, timelines, differentiation."
              />
              <LegacyTextArea
                label="Closing notes"
                rows={4}
                value={closingNotes}
                onChange={setClosingNotes}
                placeholder="Next steps, contact, reassurance."
              />
            </div>
          </details>

          <section className="space-y-4 rounded-2xl border border-border bg-zinc-50/80 p-4 dark:border-zinc-700 dark:bg-zinc-900/40">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-xs font-bold uppercase tracking-widest text-text-secondary dark:text-zinc-500">
                Selected services
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
                No services referenced yet — pick from Services or leave this
                section blank.
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
      </div>
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

function LegacyTextArea({
  label,
  rows,
  value,
  placeholder,
  onChange,
}: {
  label: string;
  rows: number;
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
}) {
  return (
    <section className="space-y-2">
      <LabelBlock title={label} />
      <textarea
        rows={rows}
        className={inputArea}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </section>
  );
}
