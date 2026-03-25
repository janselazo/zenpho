import AgreementsListView from "@/components/crm/AgreementsListView";
import { fetchContractsForAgreementsList } from "@/lib/crm/fetch-contracts-for-agreements-list";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const dynamic = "force-dynamic";

export default async function AgreementsPage() {
  if (!isSupabaseConfigured()) {
    return (
      <div className="p-8">
        <h1 className="heading-display text-2xl font-bold">Agreements</h1>
        <p className="mt-2 text-text-secondary">
          Configure Supabase to load agreements.
        </p>
      </div>
    );
  }

  const rows = await fetchContractsForAgreementsList();

  return (
    <div className="p-8">
      <AgreementsListView rows={rows} />
    </div>
  );
}
