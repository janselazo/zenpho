import Link from "next/link";
import { redirect } from "next/navigation";
import { createSalesProposalDraft } from "@/app/(crm)/actions/sales-proposals";
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

  if (!proposalPid) {
    const created = await createSalesProposalDraft({});
    if ("error" in created && created.error) {
      return (
        <div className="px-4 py-8 md:px-8">
          <h1 className="heading-display text-2xl font-bold text-text-primary dark:text-zinc-100">
            Proposal generation
          </h1>
          <p className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
            {created.error}
          </p>
          <Link
            href="/proposals"
            className="mt-6 inline-block text-sm font-semibold text-accent underline underline-offset-2"
          >
            Back to proposals
          </Link>
        </div>
      );
    }
    const id = "id" in created && created.id ? created.id : null;
    if (!id) {
      return (
        <div className="px-4 py-8 md:px-8">
          <h1 className="heading-display text-2xl font-bold">Proposal generation</h1>
          <p className="mt-2 text-text-secondary">Could not create a draft proposal.</p>
          <Link
            href="/proposals"
            className="mt-6 inline-block text-sm font-semibold text-accent underline"
          >
            Back to proposals
          </Link>
        </div>
      );
    }
    redirect(`/proposals/new?proposal=${encodeURIComponent(id)}`);
  }

  const [clients, catalog, resume] = await Promise.all([
    fetchClientsForProposalPicker(),
    fetchActiveCrmCatalog(),
    fetchSalesProposalDetail(proposalPid),
  ]);

  const initialProposalId =
    resume && resume.id === proposalPid ? resume.id : proposalPid;

  return (
    <div className="px-4 py-8 md:px-8">
      <ProposalGenerationWizard
        key={initialProposalId}
        clients={clients}
        catalog={catalog}
        initialProposalId={initialProposalId}
        resume={resume ?? null}
      />
    </div>
  );
}
