import { notFound } from "next/navigation";
import AgreementEditorView from "@/components/crm/AgreementEditorView";
import { fetchContractDetail } from "@/lib/crm/fetch-contract-detail";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const dynamic = "force-dynamic";

export default async function AgreementEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  if (!isSupabaseConfigured()) {
    return (
      <div className="p-8">
        <h1 className="heading-display text-2xl font-bold">Agreement</h1>
        <p className="mt-2 text-text-secondary">Configure Supabase first.</p>
      </div>
    );
  }

  const detail = await fetchContractDetail(id);
  if (!detail) notFound();

  return (
    <AgreementEditorView
      key={detail.status + (detail.signedAt ?? "") + (detail.termsSnapshot ?? "").slice(0, 80)}
      initial={detail}
    />
  );
}
