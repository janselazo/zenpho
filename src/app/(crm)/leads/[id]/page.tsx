import Link from "next/link";
import { notFound } from "next/navigation";
import LeadEditForm from "@/components/crm/LeadEditForm";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

type Props = { params: Promise<{ id: string }> };

export default async function LeadDetailPage({ params }: Props) {
  const { id } = await params;

  if (!isSupabaseConfigured()) {
    return (
      <div className="p-8">
        <p className="text-text-secondary">Configure Supabase first.</p>
      </div>
    );
  }

  const supabase = await createClient();
  const { data: lead, error } = await supabase
    .from("lead")
    .select(
      "id, name, email, company, phone, source, stage, notes, project_type, created_at"
    )
    .eq("id", id)
    .maybeSingle();

  if (error || !lead) notFound();

  const dealQuery = await supabase
    .from("deal")
    .select(
      "id, title, company, value, stage, expected_close, contact_email, website"
    )
    .eq("lead_id", id)
    .order("updated_at", { ascending: false })
    .limit(1);

  const deal =
    dealQuery.error || !dealQuery.data?.length ? null : dealQuery.data[0];

  return (
    <div className="p-8">
      <Link
        href="/leads"
        className="text-sm text-accent hover:underline"
      >
        ← All leads
      </Link>
      <h1 className="mt-4 heading-display text-2xl font-bold text-text-primary">
        {lead.name || lead.email || "Lead"}
      </h1>
      <p className="text-sm text-text-secondary">
        Created{" "}
        {lead.created_at
          ? new Date(lead.created_at).toLocaleString()
          : "—"}
      </p>
      <div className="mt-8 max-w-2xl">
        <LeadEditForm lead={lead} deal={deal} />
      </div>
    </div>
  );
}
