import { isSupabaseConfigured } from "@/lib/supabase/config";
import SalesProposalListView from "@/components/crm/SalesProposalListView";
import { fetchSalesProposalsForList } from "@/lib/crm/fetch-sales-proposals-for-list";

export const dynamic = "force-dynamic";

export default async function ProposalsLandingPage() {
  if (!isSupabaseConfigured()) {
    return (
      <div className="p-8">
        <h1 className="heading-display text-2xl font-bold">Proposals</h1>
        <p className="mt-2 text-text-secondary">
          Configure Supabase to load proposal documents.
        </p>
      </div>
    );
  }

  const rows = await fetchSalesProposalsForList();

  return (
    <div className="p-8">
      <SalesProposalListView rows={rows} />
    </div>
  );
}
