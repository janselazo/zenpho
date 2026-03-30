import Link from "next/link";
import NewProposalForm from "@/components/crm/NewProposalForm";
import { fetchClientsForProposalPicker } from "@/lib/crm/fetch-clients-for-proposal-picker";
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

  const clients = await fetchClientsForProposalPicker();

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
          Choose a client, then build the proposal on the next screen.
        </p>

        {clients.length === 0 ? (
          <p className="mt-8 rounded-xl border border-border bg-white p-6 text-sm text-text-secondary dark:border-zinc-800 dark:bg-zinc-900/40 dark:text-zinc-400">
            No clients yet.{" "}
            <Link href="/leads?section=clients" className="text-accent underline">
              Add a client
            </Link>{" "}
            first.
          </p>
        ) : (
          <NewProposalForm clients={clients} />
        )}
      </div>
    </div>
  );
}
