"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, X } from "lucide-react";
import CrmPopoverDateField from "@/components/crm/CrmPopoverDateField";
import { createDealRecord } from "@/app/(crm)/actions/crm";
import {
  DEAL_STAGE_LABELS,
  type DealStage,
} from "@/lib/crm/mock-data";

const dealFormInputClass =
  "w-full rounded-xl border border-border bg-white px-3 py-2.5 text-sm text-text-primary outline-none focus:border-accent focus:ring-2 focus:ring-accent/15 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100";

const DEAL_FORM_STAGE_ORDER: DealStage[] = [
  "prospect",
  "proposal",
  "negotiation",
  "closed_won",
  "closed_lost",
];

export type CreateDealLeadRef = {
  id: string;
  name?: string | null;
  email?: string | null;
  company?: string | null;
};

export default function CreateDealForLeadModal({
  lead,
  onClose,
}: {
  lead: CreateDealLeadRef;
  onClose: () => void;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [expectedClose, setExpectedClose] = useState("");

  const leadLabel = lead.name?.trim() || lead.email?.trim() || "this lead";

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    const title = String(fd.get("title") ?? "").trim();
    const company = String(fd.get("company") ?? "").trim();
    const value = Number(fd.get("value")) || 0;
    const stage = String(fd.get("stage") ?? "prospect").trim();
    const expectedCloseRaw = expectedClose.trim();
    const contactEmailRaw = String(fd.get("contactEmail") ?? "").trim();
    const websiteRaw = String(fd.get("website") ?? "").trim();

    setPending(true);
    const res = await createDealRecord({
      leadId: lead.id,
      title,
      company,
      value,
      stage,
      expectedClose: expectedCloseRaw || null,
      contactEmail: contactEmailRaw || lead.email?.trim() || null,
      website: websiteRaw || null,
    });
    setPending(false);
    if ("error" in res && res.error) {
      setError(res.error);
      return;
    }
    router.refresh();
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/40 p-4 backdrop-blur-sm sm:items-center"
      onClick={onClose}
      onKeyDown={(e) => e.key === "Escape" && onClose()}
      role="presentation"
    >
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-border bg-white p-6 shadow-xl dark:border-zinc-700 dark:bg-zinc-950"
        role="dialog"
        onClick={(e) => e.stopPropagation()}
        aria-modal="true"
        aria-labelledby="create-deal-lead-title"
      >
        <div className="flex items-start justify-between gap-3">
          <h2
            id="create-deal-lead-title"
            className="text-lg font-bold text-text-primary dark:text-zinc-50"
          >
            Create deal
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-800 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
            aria-label="Close"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>
        <p className="mt-1 text-sm text-text-secondary dark:text-zinc-400">
          Linked to{" "}
          <span className="font-semibold text-text-primary dark:text-zinc-200">
            {leadLabel}
          </span>
        </p>

        {error && (
          <p
            className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200"
            role="alert"
          >
            {error}
          </p>
        )}

        <form onSubmit={(e) => void onSubmit(e)} className="mt-5 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm font-medium text-text-primary">
                Deal title
              </label>
              <input
                name="title"
                type="text"
                required
                placeholder="e.g. Website redesign — Phase 1"
                className={dealFormInputClass}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-text-primary">
                Company
              </label>
              <input
                name="company"
                type="text"
                defaultValue={lead.company ?? ""}
                className={dealFormInputClass}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-text-primary">
                Budget ($)
              </label>
              <input
                name="value"
                type="number"
                min="0"
                defaultValue={0}
                className={dealFormInputClass}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-text-primary">
                Stage
              </label>
              <select
                name="stage"
                defaultValue="prospect"
                className={dealFormInputClass}
              >
                {DEAL_FORM_STAGE_ORDER.map((s) => (
                  <option key={s} value={s}>
                    {DEAL_STAGE_LABELS[s]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label
                htmlFor="create-deal-expected-close"
                className="mb-1 block text-sm font-medium text-text-primary"
              >
                Expected close
              </label>
              <input type="hidden" name="expectedClose" value={expectedClose} />
              <CrmPopoverDateField
                id="create-deal-expected-close"
                value={expectedClose}
                onChange={setExpectedClose}
                displayFormat="numeric"
                triggerClassName={`${dealFormInputClass} relative flex min-h-[2.625rem] items-center text-left dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100`}
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm font-medium text-text-primary">
                Website
              </label>
              <input
                name="website"
                type="text"
                inputMode="url"
                autoComplete="url"
                placeholder="example.com or https://…"
                className={dealFormInputClass}
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm font-medium text-text-primary">
                Contact email
              </label>
              <input
                name="contactEmail"
                type="email"
                defaultValue={lead.email ?? ""}
                className={dealFormInputClass}
              />
            </div>
          </div>

          <div className="flex flex-wrap justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-800 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={pending}
              className="inline-flex items-center gap-1.5 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white hover:bg-accent-hover disabled:opacity-60"
            >
              {pending ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              ) : null}
              Create deal
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
