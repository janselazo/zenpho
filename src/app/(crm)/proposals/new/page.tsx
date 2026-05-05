import ProposalGenerationWizard from "@/components/crm/proposal-generation/ProposalGenerationWizard";
import { fetchActiveCrmCatalog } from "@/lib/crm/fetch-crm-catalog";
import { fetchClientsForProposalPicker } from "@/lib/crm/fetch-clients-for-proposal-picker";
import { fetchSalesProposalDetail } from "@/lib/crm/fetch-sales-proposal-detail";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const dynamic = "force-dynamic";

export default async function NewSalesProposalPage({
  searchParams,
}: {
  searchParams?: Promise<{ proposal?: string }>;
}) {
  const sp = searchParams ? await searchParams : {};
  const proposalPid =
    typeof sp?.proposal === "string" && sp.proposal.trim()
      ? sp.proposal.trim()
      : null;

  if (!isSupabaseConfigured()) {
    return (
      <div className="p-8">
        <h1 className="heading-display text-2xl font-bold">Proposal generation</h1>
        <p className="mt-2 text-text-secondary">Configure Supabase first.</p>
      </div>
    );
  }

  const [clients, catalog, resume] = await Promise.all([
    fetchClientsForProposalPicker(),
    fetchActiveCrmCatalog(),
    proposalPid
      ? fetchSalesProposalDetail(proposalPid)
      : Promise.resolve(null),
  ]);

  const initialProposalId =
    resume && resume.id === proposalPid ? resume.id : proposalPid;

  return (
    <div className="px-4 py-8 md:px-8">
      <ProposalGenerationWizard
        key={initialProposalId ?? "proposal-gen-new"}
        clients={clients}
        catalog={catalog}
        initialProposalId={initialProposalId}
        resume={resume ?? null}
      />
    </div>
  );
}
