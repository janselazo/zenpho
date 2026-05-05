"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createProposalFromLead } from "@/app/(crm)/actions/proposals";
import type { ProposalLeadOption } from "@/lib/crm/fetch-leads-for-proposal-picker";

export default function NewProposalForm({
  leads,
}: {
  leads: ProposalLeadOption[];
}) {
  const router = useRouter();
  const [leadId, setLeadId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    const res = await createProposalFromLead(leadId);
    setPending(false);
    if ("error" in res && res.error) {
      setError(res.error);
      return;
    }
    if ("id" in res && res.id) {
      router.push(`/invoices/${res.id}`);
      router.refresh();
    }
  }

  return (
    <form onSubmit={(e) => void onSubmit(e)} className="mt-8 space-y-4">
      {error ? (
        <p className="whitespace-pre-wrap rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200">
          {error}
        </p>
      ) : null}
      <div>
        <label
          htmlFor="lead_id"
          className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-text-secondary dark:text-zinc-500"
        >
          Lead
        </label>
        <select
          id="lead_id"
          value={leadId}
          onChange={(e) => setLeadId(e.target.value)}
          required
          className="w-full rounded-xl border border-border bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
        >
          <option value="">Select contact…</option>
          {leads.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name}
              {l.company ? ` — ${l.company}` : ""}
            </option>
          ))}
        </select>
      </div>
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-xl bg-accent px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-accent-hover disabled:opacity-60"
      >
        {pending ? "Creating…" : "Continue"}
      </button>
    </form>
  );
}
