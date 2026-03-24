"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { updateLead } from "@/app/(crm)/actions/crm";
import { LEAD_PROJECT_TYPE_OPTIONS } from "@/lib/crm/mock-data";
import CrmPopoverDateField from "@/components/crm/CrmPopoverDateField";
import TabBar from "@/components/crm/TabBar";

const inputClass =
  "w-full rounded-xl border border-border bg-white px-3 py-2 text-sm text-text-primary outline-none focus:border-accent focus:ring-2 focus:ring-accent/15";

const leadStages = [
  { value: "new", label: "New" },
  { value: "contacted", label: "Contacted" },
  { value: "qualified", label: "Qualified" },
  { value: "not_qualified", label: "Not Qualified" },
] as const;

const dealStages = [
  { value: "prospect", label: "Open" },
  { value: "proposal", label: "Proposal" },
  { value: "negotiation", label: "Negotiation" },
  { value: "closed_won", label: "Won" },
  { value: "closed_lost", label: "Lost" },
] as const;

const LEAD_TABS = [
  { id: "contact", label: "Contact" },
  { id: "deal", label: "Deal" },
] as const;

type Lead = {
  id: string;
  name: string | null;
  email: string | null;
  company: string | null;
  phone: string | null;
  source: string | null;
  stage: string | null;
  notes: string | null;
  project_type: string | null;
};

type DealRow = {
  id: string;
  title: string | null;
  company: string | null;
  value: number | null;
  stage: string | null;
  expected_close: string | null;
  contact_email: string | null;
  website: string | null;
};

function dateInputValue(iso: string | null | undefined): string {
  if (!iso) return "";
  return iso.slice(0, 10);
}

export default function LeadEditForm({
  lead,
  deal,
}: {
  lead: Lead;
  deal: DealRow | null;
}) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<string>("contact");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const dealStageDefault =
    deal?.stage &&
    dealStages.some((s) => s.value === deal.stage)
      ? deal.stage
      : "prospect";

  const [expectedClose, setExpectedClose] = useState(() =>
    dateInputValue(deal?.expected_close)
  );

  useEffect(() => {
    setExpectedClose(dateInputValue(deal?.expected_close));
  }, [lead.id, deal?.expected_close]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    setPending(true);
    const fd = new FormData(e.currentTarget);
    const res = await updateLead(fd);
    setPending(false);
    if ("error" in res && res.error) {
      setError(res.error);
      return;
    }
    setSaved(true);
    router.refresh();
  }

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-2xl border border-border bg-white shadow-sm"
    >
      <input type="hidden" name="id" value={lead.id} />

      <div className="px-6 pt-5">
        <TabBar
          tabs={[...LEAD_TABS]}
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />
      </div>

      <div className="border-t border-border px-6 pb-6 pt-5">
        {error ? (
          <p className="mb-4 text-sm text-red-700" role="alert">
            {error}
          </p>
        ) : null}
        {saved ? (
          <p className="mb-4 text-sm text-emerald-800">Saved.</p>
        ) : null}

        <div
          className={activeTab === "contact" ? "space-y-4" : "hidden"}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-text-secondary">
                Name
              </label>
              <input
                name="name"
                type="text"
                defaultValue={lead.name ?? ""}
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-text-secondary">
                Email
              </label>
              <input
                name="email"
                type="email"
                defaultValue={lead.email ?? ""}
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-text-secondary">
                Company
              </label>
              <input
                name="company"
                type="text"
                defaultValue={lead.company ?? ""}
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-text-secondary">
                Phone
              </label>
              <input
                name="phone"
                type="tel"
                defaultValue={lead.phone ?? ""}
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-text-secondary">
                Source
              </label>
              <input
                name="source"
                type="text"
                defaultValue={lead.source ?? ""}
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-text-secondary">
                Project type
              </label>
              <select
                name="project_type"
                defaultValue={lead.project_type ?? ""}
                className={inputClass}
              >
                <option value="">Not set</option>
                {LEAD_PROJECT_TYPE_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-text-secondary">
                Lead stage
              </label>
              <select
                name="stage"
                defaultValue={lead.stage ?? "new"}
                className={inputClass}
              >
                {leadStages.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-text-secondary">
              Notes
            </label>
            <textarea
              name="notes"
              rows={4}
              defaultValue={lead.notes ?? ""}
              className={inputClass}
            />
          </div>
        </div>

        <div className={activeTab === "deal" ? "space-y-4" : "hidden"}>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-text-secondary/60">
            Deal
          </p>
          {deal?.id ? (
            <input type="hidden" name="deal_id" value={deal.id} />
          ) : null}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-text-secondary">
                Deal title
              </label>
              <input
                name="deal_title"
                type="text"
                defaultValue={deal?.title ?? ""}
                className={inputClass}
                placeholder="e.g. MVP build"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-text-secondary">
                Company
              </label>
              <input
                name="deal_company"
                type="text"
                defaultValue={deal?.company ?? ""}
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-text-secondary">
                Budget ($)
              </label>
              <input
                name="deal_value"
                type="text"
                inputMode="decimal"
                defaultValue={
                  deal?.value != null && deal.value !== undefined
                    ? String(deal.value)
                    : ""
                }
                className={inputClass}
                placeholder="0"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-text-secondary">
                Stage
              </label>
              <select
                name="deal_stage"
                defaultValue={dealStageDefault}
                className={inputClass}
              >
                {dealStages.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label
                htmlFor="deal-expected-close"
                className="mb-1 block text-xs font-medium text-text-secondary"
              >
                Expected close
              </label>
              <input
                type="hidden"
                name="deal_expected_close"
                value={expectedClose}
              />
              <CrmPopoverDateField
                id="deal-expected-close"
                value={expectedClose}
                onChange={setExpectedClose}
                displayFormat="numeric"
                triggerClassName="relative flex h-11 w-full items-center rounded-full border border-zinc-200 bg-white text-left shadow-sm outline-none transition-[border-color,box-shadow] focus-visible:border-blue-500 focus-visible:ring-2 focus-visible:ring-blue-500/25 dark:border-zinc-600 dark:bg-zinc-900"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-text-secondary">
                Website
              </label>
              <input
                name="deal_website"
                type="text"
                inputMode="url"
                autoComplete="url"
                defaultValue={deal?.website ?? ""}
                className={inputClass}
                placeholder="https://example.com"
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-text-secondary">
              Contact email
            </label>
            <input
              name="deal_contact_email"
              type="email"
              defaultValue={deal?.contact_email ?? ""}
              className={inputClass}
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={pending}
          className="mt-6 rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-white hover:bg-accent-hover disabled:opacity-60"
        >
          {pending ? "Saving…" : "Save changes"}
        </button>
      </div>
    </form>
  );
}
