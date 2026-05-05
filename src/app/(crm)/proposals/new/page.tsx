import Link from "next/link";
import SalesProposalNewStarter from "@/components/crm/SalesProposalNewStarter";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const dynamic = "force-dynamic";

export default function NewSalesProposalPage() {
  if (!isSupabaseConfigured()) {
    return (
      <div className="p-8">
        <h1 className="heading-display text-2xl font-bold">New proposal</h1>
        <p className="mt-2 text-text-secondary">Configure Supabase first.</p>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mx-auto max-w-lg text-center">
        <Link
          href="/proposals"
          className="text-sm text-text-secondary hover:text-text-primary dark:text-zinc-500"
        >
          ← Proposals
        </Link>
        <h1 className="heading-display mt-4 text-2xl font-bold text-text-primary dark:text-zinc-100">
          New proposal document
        </h1>
        <p className="mt-2 text-sm text-text-secondary dark:text-zinc-400">
          Build a narrative for your buyer: positioning, story, services, plus
          optional catalog picks for reference pricing.
        </p>
        <SalesProposalNewStarter />
      </div>
    </div>
  );
}
