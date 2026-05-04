import Link from "next/link";
import NewProposalForm from "@/components/crm/NewProposalForm";
import { fetchLeadsForProposalPicker } from "@/lib/crm/fetch-leads-for-proposal-picker";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const dynamic = "force-dynamic";

export default async function NewProposalPage() {
  if (!isSupabaseConfigured()) {
    return (
      <div className="p-8">
        <h1 className="heading-display text-2xl font-bold">New proposal</h1>
        <p className="mt-2 text-text-secondary">Configure Supabase first.</p>
      </div>
    );
  }

  const leads = await fetchLeadsForProposalPicker();

  return (
    <div className="p-8">
      <div className="mx-auto max-w-lg">
        <Link
          href="/proposals"
          className="text-sm text-text-secondary hover:text-text-primary dark:text-zinc-500 dark:hover:text-zinc-300"
        >
          ← Proposals
        </Link>
        <h1 className="heading-display mt-4 text-2xl font-bold text-text-primary dark:text-zinc-100">
          New proposal
        </h1>
        <p className="mt-2 text-sm text-text-secondary dark:text-zinc-400">
          Choose a lead (not yet a client), then build the proposal on the next screen.
        </p>

        {leads.length === 0 ? (
          <p className="mt-8 rounded-xl border border-border bg-white p-6 text-sm text-text-secondary dark:border-zinc-800 dark:bg-zinc-900/40 dark:text-zinc-400">
            No open leads without a client record.{" "}
            <Link href="/leads?section=leads" className="text-accent underline">
              Add or review leads
            </Link>
            .
          </p>
        ) : (
          <NewProposalForm leads={leads} />
        )}
      </div>
    </div>
  );
}
