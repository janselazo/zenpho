"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  acceptProposal,
  saveProposal,
  updateProposalClient,
  type ProposalLineInput,
} from "@/app/(crm)/actions/proposals";
import type { ProposalClientOption } from "@/lib/crm/fetch-clients-for-proposal-picker";
import type { CrmProductServiceRow } from "@/lib/crm/crm-catalog-types";
import type {
  AgencySnapshot,
  BillingSnapshot,
  ProposalDetail,
  ProposalStatus,
} from "@/lib/crm/proposal-types";
import {
  formatProposalId,
  PROPOSAL_STATUSES,
} from "@/lib/crm/proposal-types";
import CrmPopoverDateField from "@/components/crm/CrmPopoverDateField";
import { Loader2, Plus, Trash2 } from "lucide-react";

const STEPS = ["Client", "Addresses", "Services", "Review"] as const;

function formatMoney(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(n);
}

function lineTotal(q: number, p: number) {
  return Math.round(q * p * 100) / 100;
}

type LineDraft = {
  description: string;
  quantity: number;
  unit_price: number;
  catalog_item_id: string | null;
};

export default function ProposalBuilderView({
  initial,
  clientOptions,
  catalogOptions = [],
}: {
  initial: ProposalDetail;
  clientOptions: ProposalClientOption[];
  catalogOptions?: CrmProductServiceRow[];
}) {
  const router = useRouter();
  const readOnly = initial.status === "accepted";

  const [step, setStep] = useState(0);
  const [title, setTitle] = useState(initial.title);
  const [status, setStatus] = useState<ProposalStatus>(initial.status);
  const [issuedAt, setIssuedAt] = useState(initial.issuedAt);
  const [validUntil, setValidUntil] = useState(initial.validUntil ?? "");
  const [discountAmount, setDiscountAmount] = useState(initial.discountAmount);
  const [notes, setNotes] = useState(initial.notes ?? "");
  const [paymentInstructions, setPaymentInstructions] = useState(
    initial.paymentInstructions ?? ""
  );
  const [agency, setAgency] = useState<AgencySnapshot>(initial.agency);
  const [billing, setBilling] = useState<BillingSnapshot>(initial.billing);
  const [catalogPick, setCatalogPick] = useState("");

  const [lines, setLines] = useState<LineDraft[]>(
    initial.lineItems.length
      ? initial.lineItems.map((li) => ({
          description: li.description,
          quantity: li.quantity,
          unit_price: li.unit_price,
          catalog_item_id: li.catalog_item_id,
        }))
      : [{ description: "", quantity: 1, unit_price: 0, catalog_item_id: null }]
  );

  const [saving, setSaving] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [clientBusy, setClientBusy] = useState(false);

  useEffect(() => {
    setTitle(initial.title);
    setStatus(initial.status);
    setIssuedAt(initial.issuedAt);
    setValidUntil(initial.validUntil ?? "");
    setDiscountAmount(initial.discountAmount);
    setNotes(initial.notes ?? "");
    setPaymentInstructions(initial.paymentInstructions ?? "");
    setAgency({ ...initial.agency });
    setBilling({ ...initial.billing });
    setLines(
      initial.lineItems.length
        ? initial.lineItems.map((li) => ({
            description: li.description,
            quantity: li.quantity,
            unit_price: li.unit_price,
            catalog_item_id: li.catalog_item_id,
          }))
        : [{ description: "", quantity: 1, unit_price: 0, catalog_item_id: null }]
    );
  }, [initial.id, initial.updatedAt]);

  const subtotal = useMemo(() => {
    let s = 0;
    for (const li of lines) {
      s += lineTotal(li.quantity, li.unit_price);
    }
    return Math.round(s * 100) / 100;
  }, [lines]);

  const total = useMemo(() => {
    const d = Math.max(0, discountAmount || 0);
    return Math.max(0, Math.round((subtotal - d) * 100) / 100);
  }, [subtotal, discountAmount]);

  const persist = useCallback(
    async (nextStatus?: ProposalStatus) => {
      setMessage(null);
      setSaving(true);
      const st = nextStatus ?? status;
      const lineInputs: ProposalLineInput[] = lines.map((li, i) => ({
        description: li.description,
        quantity: li.quantity,
        unit_price: li.unit_price,
        sort_order: i,
        catalog_item_id: li.catalog_item_id,
      }));
      const res = await saveProposal(initial.id, {
        title,
        status: st,
        issuedAt,
        validUntil: validUntil.trim() || null,
        discountAmount: Math.max(0, discountAmount || 0),
        notes: notes.trim() || null,
        paymentInstructions: paymentInstructions.trim() || null,
        billing: { ...billing },
        agency: { ...agency },
        lineItems: lineInputs,
      });
      setSaving(false);
      if ("error" in res && res.error) {
        setMessage(res.error);
        return false;
      }
      if (nextStatus != null) setStatus(nextStatus);
      router.refresh();
      return true;
    },
    [
      status,
      lines,
      initial.id,
      title,
      issuedAt,
      validUntil,
      discountAmount,
      notes,
      paymentInstructions,
      billing,
      agency,
      router,
    ]
  );

  async function onClientChange(newClientId: string) {
    if (newClientId === initial.clientId || readOnly) return;
    setMessage(null);
    setClientBusy(true);
    const res = await updateProposalClient(initial.id, newClientId);
    setClientBusy(false);
    if ("error" in res && res.error) {
      setMessage(res.error);
      return;
    }
    router.refresh();
  }

  async function onAccept() {
    const ok = await persist();
    if (!ok) return;
    setAccepting(true);
    setMessage(null);
    const res = await acceptProposal(initial.id);
    setAccepting(false);
    if ("error" in res && res.error) {
      setMessage(res.error);
      return;
    }
    if ("contractId" in res && res.contractId) {
      router.push(`/invoices/agreements/${res.contractId}`);
      router.refresh();
    }
  }

  function updateLine(i: number, patch: Partial<LineDraft>) {
    setLines((prev) =>
      prev.map((row, j) => (j === i ? { ...row, ...patch } : row))
    );
  }

  function addLine() {
    setLines((prev) => [
      ...prev,
      { description: "", quantity: 1, unit_price: 0, catalog_item_id: null },
    ]);
  }

  function addFromCatalog() {
    const id = catalogPick.trim();
    if (!id) return;
    const item = catalogOptions.find((c) => c.id === id);
    if (!item) return;
    const desc = item.description.trim()
      ? `${item.name}\n\n${item.description.trim()}`
      : item.name;
    setLines((prev) => [
      ...prev,
      {
        description: desc,
        quantity: 1,
        unit_price: item.unit_price,
        catalog_item_id: item.id,
      },
    ]);
    setCatalogPick("");
  }

  function removeLine(i: number) {
    setLines((prev) =>
      prev.length <= 1
        ? [{ description: "", quantity: 1, unit_price: 0, catalog_item_id: null }]
        : prev.filter((_, j) => j !== i)
    );
  }

  const nextLabel =
    step < STEPS.length - 1
      ? `Next (${step + 2}/${STEPS.length})`
      : "Done";

  return (
    <div className="min-h-[calc(100vh-4rem)]">
      <div className="border-b border-border bg-white px-6 py-3 dark:border-zinc-800 dark:bg-zinc-900/50">
        <div className="mx-auto flex max-w-[1400px] flex-wrap items-center gap-3">
          <Link
            href="/invoices"
            className="text-sm text-text-secondary hover:text-text-primary dark:text-zinc-500"
          >
            ← Invoices
          </Link>
          <Link
            href="/dashboard"
            className="ml-auto text-sm text-text-secondary hover:text-text-primary dark:text-zinc-500 sm:ml-0"
          >
            Dashboard
          </Link>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={readOnly}
            className="min-w-[12rem] flex-1 rounded-lg border border-border bg-surface px-3 py-1.5 text-sm font-semibold outline-none focus:border-blue-400 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
            placeholder="Invoice title"
          />
          {!readOnly ? (
            <select
              value={status}
              onChange={(e) =>
                setStatus(e.target.value as ProposalStatus)
              }
              className="rounded-lg border border-border bg-white px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
            >
              {PROPOSAL_STATUSES.filter((s) => s !== "accepted").map((s) => (
                <option key={s} value={s}>
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </option>
              ))}
            </select>
          ) : (
            <span className="rounded-lg bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300">
              Accepted
            </span>
          )}
          {!readOnly ? (
            <button
              type="button"
              disabled={saving}
              onClick={() => void persist()}
              className="rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-accent-hover disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save"}
            </button>
          ) : null}
        </div>
      </div>

      <div className="mx-auto grid max-w-[1400px] gap-6 px-4 py-6 lg:grid-cols-[minmax(0,1fr)_minmax(340px,480px)]">
        <div className="space-y-6 rounded-2xl border border-border bg-zinc-50/80 p-6 dark:border-zinc-800 dark:bg-zinc-900/30">
          {message ? (
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200">
              {message}
            </p>
          ) : null}

          {readOnly && initial.contractId ? (
            <Link
              href={`/invoices/agreements/${initial.contractId}`}
              className="inline-flex rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Open contract
            </Link>
          ) : null}

          {step === 0 && (
            <section className="space-y-3">
              <h2 className="text-xs font-bold uppercase tracking-widest text-text-secondary dark:text-zinc-500">
                Your client
              </h2>
              {!readOnly && clientOptions.length > 0 ? (
                <div className="space-y-2">
                  <label
                    htmlFor="proposal-client"
                    className="block text-xs font-semibold uppercase tracking-wide text-text-secondary dark:text-zinc-500"
                  >
                    Linked client
                  </label>
                  <select
                    id="proposal-client"
                    value={initial.clientId}
                    disabled={clientBusy}
                    onChange={(e) => void onClientChange(e.target.value)}
                    className="w-full rounded-xl border border-border bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400/20 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                  >
                    {clientOptions.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                        {c.company ? ` — ${c.company}` : ""}
                      </option>
                    ))}
                  </select>
                  {clientBusy ? (
                    <p className="text-xs text-text-secondary dark:text-zinc-500">
                      Updating…
                    </p>
                  ) : (
                    <p className="text-xs text-text-secondary dark:text-zinc-500">
                      Changing the client updates the CRM link and refreshes
                      company/email on the billing block; you can still edit
                      addresses on the next step.
                    </p>
                  )}
                </div>
              ) : null}
              <div className="rounded-xl border border-border bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900">
                <p className="text-[10px] font-bold uppercase tracking-wider text-text-secondary dark:text-zinc-500">
                  {readOnly ? "Client" : "Preview"}
                </p>
                <p className="mt-2 font-semibold text-text-primary dark:text-zinc-100">
                  {initial.clientName}
                </p>
                {initial.clientEmail ? (
                  <p className="mt-1 text-sm text-text-secondary dark:text-zinc-400">
                    {initial.clientEmail}
                  </p>
                ) : null}
                {initial.clientCompany ? (
                  <p className="text-sm text-text-secondary dark:text-zinc-400">
                    {initial.clientCompany}
                  </p>
                ) : null}
              </div>
            </section>
          )}

          {step === 1 && (
            <section className="space-y-6">
              <FieldGroup title="From (agency)">
                <input
                  className={inputClass}
                  placeholder="Name"
                  value={agency.name ?? ""}
                  disabled={readOnly}
                  onChange={(e) =>
                    setAgency((a) => ({ ...a, name: e.target.value }))
                  }
                />
                <input
                  className={inputClass}
                  placeholder="Email"
                  value={agency.email ?? ""}
                  disabled={readOnly}
                  onChange={(e) =>
                    setAgency((a) => ({ ...a, email: e.target.value }))
                  }
                />
                <input
                  className={inputClass}
                  placeholder="Address"
                  value={agency.address ?? ""}
                  disabled={readOnly}
                  onChange={(e) =>
                    setAgency((a) => ({ ...a, address: e.target.value }))
                  }
                />
                <div className="grid gap-2 sm:grid-cols-2">
                  <input
                    className={inputClass}
                    placeholder="City"
                    value={agency.city ?? ""}
                    disabled={readOnly}
                    onChange={(e) =>
                      setAgency((a) => ({ ...a, city: e.target.value }))
                    }
                  />
                  <input
                    className={inputClass}
                    placeholder="State"
                    value={agency.state ?? ""}
                    disabled={readOnly}
                    onChange={(e) =>
                      setAgency((a) => ({ ...a, state: e.target.value }))
                    }
                  />
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <input
                    className={inputClass}
                    placeholder="ZIP"
                    value={agency.zip ?? ""}
                    disabled={readOnly}
                    onChange={(e) =>
                      setAgency((a) => ({ ...a, zip: e.target.value }))
                    }
                  />
                  <input
                    className={inputClass}
                    placeholder="Country"
                    value={agency.country ?? ""}
                    disabled={readOnly}
                    onChange={(e) =>
                      setAgency((a) => ({ ...a, country: e.target.value }))
                    }
                  />
                </div>
                <input
                  className={inputClass}
                  placeholder="Tax ID"
                  value={agency.taxId ?? ""}
                  disabled={readOnly}
                  onChange={(e) =>
                    setAgency((a) => ({ ...a, taxId: e.target.value }))
                  }
                />
              </FieldGroup>

              <FieldGroup title="Billing (client)">
                <input
                  className={inputClass}
                  placeholder="Company name"
                  value={billing.company ?? ""}
                  disabled={readOnly}
                  onChange={(e) =>
                    setBilling((b) => ({ ...b, company: e.target.value }))
                  }
                />
                <input
                  className={inputClass}
                  placeholder="Email"
                  value={billing.email ?? ""}
                  disabled={readOnly}
                  onChange={(e) =>
                    setBilling((b) => ({ ...b, email: e.target.value }))
                  }
                />
                <input
                  className={inputClass}
                  placeholder="Address"
                  value={billing.address ?? ""}
                  disabled={readOnly}
                  onChange={(e) =>
                    setBilling((b) => ({ ...b, address: e.target.value }))
                  }
                />
                <div className="grid gap-2 sm:grid-cols-2">
                  <input
                    className={inputClass}
                    placeholder="City"
                    value={billing.city ?? ""}
                    disabled={readOnly}
                    onChange={(e) =>
                      setBilling((b) => ({ ...b, city: e.target.value }))
                    }
                  />
                  <input
                    className={inputClass}
                    placeholder="State"
                    value={billing.state ?? ""}
                    disabled={readOnly}
                    onChange={(e) =>
                      setBilling((b) => ({ ...b, state: e.target.value }))
                    }
                  />
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <input
                    className={inputClass}
                    placeholder="ZIP"
                    value={billing.zip ?? ""}
                    disabled={readOnly}
                    onChange={(e) =>
                      setBilling((b) => ({ ...b, zip: e.target.value }))
                    }
                  />
                  <input
                    className={inputClass}
                    placeholder="Country"
                    value={billing.country ?? ""}
                    disabled={readOnly}
                    onChange={(e) =>
                      setBilling((b) => ({ ...b, country: e.target.value }))
                    }
                  />
                </div>
                <input
                  className={inputClass}
                  placeholder="Tax ID"
                  value={billing.taxId ?? ""}
                  disabled={readOnly}
                  onChange={(e) =>
                    setBilling((b) => ({ ...b, taxId: e.target.value }))
                  }
                />
              </FieldGroup>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <span className="block text-xs font-semibold uppercase text-text-secondary dark:text-zinc-500">
                    Issued
                  </span>
                  <div className="mt-1">
                    <CrmPopoverDateField
                      id="proposal-issued"
                      value={issuedAt}
                      onChange={setIssuedAt}
                      disabled={readOnly}
                      triggerClassName="w-full"
                    />
                  </div>
                </div>
                <div>
                  <span className="block text-xs font-semibold uppercase text-text-secondary dark:text-zinc-500">
                    Valid until
                  </span>
                  <div className="mt-1">
                    <CrmPopoverDateField
                      id="proposal-valid-until"
                      value={validUntil}
                      onChange={setValidUntil}
                      disabled={readOnly}
                      triggerClassName="w-full"
                    />
                  </div>
                </div>
              </div>
            </section>
          )}

          {step === 2 && (
            <section className="space-y-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <h2 className="text-xs font-bold uppercase tracking-widest text-text-secondary dark:text-zinc-500">
                  Services
                </h2>
                {!readOnly ? (
                  <div className="flex flex-wrap items-center gap-2">
                    {catalogOptions.length > 0 ? (
                      <>
                        <select
                          value={catalogPick}
                          onChange={(e) => setCatalogPick(e.target.value)}
                          className="min-w-[12rem] rounded-lg border border-border bg-white px-2 py-1.5 text-xs font-medium dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
                          aria-label="Pick from Products and Services catalog"
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
                          className="inline-flex items-center gap-1 rounded-lg border border-border bg-white px-2 py-1 text-xs font-semibold disabled:opacity-50 dark:border-zinc-600 dark:bg-zinc-800"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          Add
                        </button>
                      </>
                    ) : null}
                    <button
                      type="button"
                      onClick={addLine}
                      className="inline-flex items-center gap-1 rounded-lg border border-border bg-white px-2 py-1 text-xs font-semibold dark:border-zinc-600 dark:bg-zinc-800"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Add line
                    </button>
                  </div>
                ) : null}
              </div>
              {catalogOptions.length === 0 && !readOnly ? (
                <p className="text-xs text-text-secondary dark:text-zinc-500">
                  <Link
                    href="/products-services"
                    className="font-medium text-accent underline"
                  >
                    Add catalog items
                  </Link>{" "}
                  under Products & Services to fill lines from your price list.
                </p>
              ) : null}
              <div className="space-y-3">
                {lines.map((li, i) => (
                  <div
                    key={i}
                    className="rounded-xl border border-border bg-white p-3 dark:border-zinc-700 dark:bg-zinc-900"
                  >
                    {li.catalog_item_id ? (
                      <span className="mb-2 inline-block rounded bg-zinc-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                        Catalog
                      </span>
                    ) : null}
                    <textarea
                      className={`${inputClass} mb-2 min-h-[2.75rem]`}
                      placeholder="Description"
                      rows={li.description.includes("\n") ? 4 : 2}
                      value={li.description}
                      disabled={readOnly}
                      onChange={(e) =>
                        updateLine(i, { description: e.target.value })
                      }
                    />
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                      <label className="text-[10px] font-semibold uppercase text-text-secondary dark:text-zinc-500">
                        Qty
                        <input
                          type="number"
                          min={0}
                          step="any"
                          className={`${inputClass} mt-0.5`}
                          value={li.quantity}
                          disabled={readOnly}
                          onChange={(e) =>
                            updateLine(i, {
                              quantity: Number(e.target.value) || 0,
                            })
                          }
                        />
                      </label>
                      <label className="text-[10px] font-semibold uppercase text-text-secondary dark:text-zinc-500">
                        Price
                        <input
                          type="number"
                          min={0}
                          step="0.01"
                          className={`${inputClass} mt-0.5`}
                          value={li.unit_price}
                          disabled={readOnly}
                          onChange={(e) =>
                            updateLine(i, {
                              unit_price: Number(e.target.value) || 0,
                            })
                          }
                        />
                      </label>
                      <div className="col-span-2 flex items-end justify-between gap-2 sm:col-span-2">
                        <span className="text-xs text-text-secondary dark:text-zinc-500">
                          Amount:{" "}
                          <strong className="text-text-primary dark:text-zinc-200">
                            {formatMoney(lineTotal(li.quantity, li.unit_price))}
                          </strong>
                        </span>
                        {!readOnly ? (
                          <button
                            type="button"
                            onClick={() => removeLine(i)}
                            className="rounded-lg p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                            title="Remove"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <label className="block text-xs font-semibold uppercase text-text-secondary dark:text-zinc-500">
                Discount (USD)
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  className={`${inputClass} mt-1 max-w-xs`}
                  value={discountAmount}
                  disabled={readOnly}
                  onChange={(e) =>
                    setDiscountAmount(Number(e.target.value) || 0)
                  }
                />
              </label>
            </section>
          )}

          {step === 3 && (
            <section className="space-y-4">
              <h2 className="text-xs font-bold uppercase tracking-widest text-text-secondary dark:text-zinc-500">
                Notes & payment
              </h2>
              <label className="block text-xs font-semibold uppercase text-text-secondary dark:text-zinc-500">
                Terms / notes
                <textarea
                  className={`${inputClass} mt-1 min-h-[100px] resize-y`}
                  value={notes}
                  disabled={readOnly}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </label>
              <label className="block text-xs font-semibold uppercase text-text-secondary dark:text-zinc-500">
                Payment instructions
                <textarea
                  className={`${inputClass} mt-1 min-h-[80px] resize-y`}
                  value={paymentInstructions}
                  disabled={readOnly}
                  onChange={(e) => setPaymentInstructions(e.target.value)}
                />
              </label>

              {!readOnly ? (
                <div className="flex flex-wrap gap-2 border-t border-border pt-4 dark:border-zinc-700">
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => void persist("draft")}
                    className="rounded-xl border border-border bg-white px-4 py-2 text-sm font-semibold dark:border-zinc-600 dark:bg-zinc-800"
                  >
                    Save as draft
                  </button>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => void persist("sent")}
                    className="rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-accent-hover disabled:opacity-50"
                  >
                    Mark as sent
                  </button>
                  {(status === "draft" ||
                    status === "sent" ||
                    status === "pending") && (
                    <button
                      type="button"
                      disabled={saving || accepting}
                      onClick={() => void onAccept()}
                      className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                    >
                      {accepting ? (
                        <span className="inline-flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Accepting…
                        </span>
                      ) : (
                        "Accept & create contract"
                      )}
                    </button>
                  )}
                </div>
              ) : null}
            </section>
          )}

          <div className="flex items-center justify-between border-t border-border pt-4 dark:border-zinc-700">
            <button
              type="button"
              disabled={step === 0}
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              className="rounded-xl px-4 py-2 text-sm font-medium text-text-secondary hover:bg-white disabled:opacity-40 dark:hover:bg-zinc-800"
            >
              Back
            </button>
            <button
              type="button"
              onClick={() => {
                if (step < STEPS.length - 1) setStep((s) => s + 1);
              }}
              className="rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-accent-hover"
            >
              {nextLabel}
            </button>
          </div>
        </div>

        <ProposalPreview
          proposalNumber={initial.proposalNumber}
          title={title}
          issuedAt={issuedAt}
          validUntil={validUntil}
          agency={agency}
          billing={billing}
          lines={lines}
          discountAmount={discountAmount}
          subtotal={subtotal}
          total={total}
          notes={notes}
          paymentInstructions={paymentInstructions}
        />
      </div>
    </div>
  );
}

const inputClass =
  "w-full rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-blue-400 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100";

function FieldGroup({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <h3 className="text-xs font-bold uppercase tracking-widest text-text-secondary dark:text-zinc-500">
        {title}
      </h3>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function ProposalPreview({
  proposalNumber,
  title,
  issuedAt,
  validUntil,
  agency,
  billing,
  lines,
  discountAmount,
  subtotal,
  total,
  notes,
  paymentInstructions,
}: {
  proposalNumber: number;
  title: string;
  issuedAt: string;
  validUntil: string;
  agency: AgencySnapshot;
  billing: BillingSnapshot;
  lines: LineDraft[];
  discountAmount: number;
  subtotal: number;
  total: number;
  notes: string;
  paymentInstructions: string;
}) {
  const fmt = (d: string) => {
    if (!d?.trim()) return "—";
    const t = Date.parse(d);
    if (Number.isNaN(t)) return d;
    return new Date(t).toLocaleDateString("en-US", {
      month: "2-digit",
      day: "2-digit",
      year: "2-digit",
    });
  };

  const agencyLines = [
    agency.name || "Agency",
    agency.address,
    [agency.city, agency.state].filter(Boolean).join(", "),
    [agency.zip, agency.country].filter(Boolean).join(" "),
    agency.taxId ? `Tax ID: ${agency.taxId}` : null,
  ].filter(Boolean) as string[];

  const billingLines = [
    billing.company || "Client",
    billing.address,
    [billing.city, billing.state].filter(Boolean).join(", "),
    [billing.zip, billing.country].filter(Boolean).join(" "),
    billing.taxId ? `Tax ID: ${billing.taxId}` : null,
  ].filter(Boolean) as string[];

  return (
    <div className="lg:sticky lg:top-6 lg:self-start">
      <div className="rounded-2xl border border-border bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-start justify-between gap-4 border-b border-border pb-4 dark:border-zinc-800">
          <div>
            <p className="text-lg font-bold text-text-primary dark:text-zinc-100">
              Zenpho · Local Growth Platform
            </p>
            <p className="text-xs text-text-secondary dark:text-zinc-500">
              Invoice
            </p>
          </div>
          <div className="text-right text-xs text-text-secondary dark:text-zinc-400">
            <p>
              <span className="font-semibold text-text-primary dark:text-zinc-300">
                {formatProposalId(proposalNumber)}
              </span>
            </p>
            <p>Issued {fmt(issuedAt)}</p>
            {validUntil ? <p>Valid until {fmt(validUntil)}</p> : null}
          </div>
        </div>

        <p className="mt-4 text-center text-sm font-semibold text-text-primary dark:text-zinc-200">
          {title || "Untitled invoice"}
        </p>

        <div className="mt-6 grid gap-6 sm:grid-cols-2">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-text-secondary dark:text-zinc-500">
              From
            </p>
            <div className="mt-2 space-y-0.5 text-xs text-text-primary dark:text-zinc-300">
              {agencyLines.map((line, i) => (
                <p key={i}>{line}</p>
              ))}
              {agency.email ? <p>{agency.email}</p> : null}
            </div>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-text-secondary dark:text-zinc-500">
              To
            </p>
            <div className="mt-2 space-y-0.5 text-xs text-text-primary dark:text-zinc-300">
              {billingLines.map((line, i) => (
                <p key={i}>{line}</p>
              ))}
              {billing.email ? <p>{billing.email}</p> : null}
            </div>
          </div>
        </div>

        <div className="mt-6 overflow-hidden rounded-lg border border-border dark:border-zinc-700">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-border bg-surface dark:border-zinc-700 dark:bg-zinc-800/50">
                <th className="px-3 py-2 font-semibold">Description</th>
                <th className="px-3 py-2 font-semibold">QTY</th>
                <th className="px-3 py-2 font-semibold">Price</th>
                <th className="px-3 py-2 font-semibold text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((li, i) => (
                <tr
                  key={i}
                  className="border-b border-border last:border-0 dark:border-zinc-800"
                >
                  <td className="whitespace-pre-wrap px-3 py-2 text-text-primary dark:text-zinc-200">
                    {li.description || "—"}
                  </td>
                  <td className="px-3 py-2 text-text-secondary dark:text-zinc-400">
                    {li.quantity}
                  </td>
                  <td className="px-3 py-2 text-text-secondary dark:text-zinc-400">
                    {formatMoney(li.unit_price)}
                  </td>
                  <td className="px-3 py-2 text-right font-medium text-text-primary dark:text-zinc-200">
                    {formatMoney(lineTotal(li.quantity, li.unit_price))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4 space-y-1 text-right text-xs">
          <p className="text-text-secondary dark:text-zinc-400">
            Subtotal{" "}
            <span className="ml-4 font-medium text-text-primary dark:text-zinc-200">
              {formatMoney(subtotal)}
            </span>
          </p>
          {discountAmount > 0 ? (
            <p className="text-text-secondary dark:text-zinc-400">
              Discount{" "}
              <span className="ml-4 font-medium text-red-600 dark:text-red-400">
                −{formatMoney(discountAmount)}
              </span>
            </p>
          ) : null}
          <p className="text-sm font-bold text-text-primary dark:text-zinc-100">
            Total{" "}
            <span className="ml-4">{formatMoney(total)}</span>
          </p>
        </div>

        <div className="mt-8 min-h-[48px] rounded-lg border border-dashed border-border text-center text-xs text-text-secondary dark:border-zinc-700 dark:text-zinc-500">
          <span className="inline-block pt-3">Signature</span>
        </div>

        {notes.trim() ? (
          <div className="mt-6 border-t border-border pt-4 text-xs dark:border-zinc-800">
            <p className="font-semibold text-text-primary dark:text-zinc-300">
              Terms
            </p>
            <p className="mt-1 whitespace-pre-wrap text-text-secondary dark:text-zinc-400">
              {notes}
            </p>
          </div>
        ) : null}

        {paymentInstructions.trim() ? (
          <div className="mt-4 text-xs">
            <p className="font-semibold text-text-primary dark:text-zinc-300">
              Payment
            </p>
            <p className="mt-1 whitespace-pre-wrap text-text-secondary dark:text-zinc-400">
              {paymentInstructions}
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
