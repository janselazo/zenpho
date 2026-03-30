import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import LeadEditForm from "@/components/crm/LeadEditForm";
import { fetchCrmPipelineSettings } from "@/lib/crm/fetch-pipeline-settings";
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
      "id, name, email, company, phone, source, stage, notes, project_type, created_at, converted_client_id"
    )
    .eq("id", id)
    .maybeSingle();

  if (error || !lead) notFound();

  const cid = (lead.converted_client_id as string | null)?.trim() ?? null;
  let clientProjects: { id: string; title: string | null }[] = [];
  if (cid) {
    const { data: rows } = await supabase
      .from("project")
      .select("id, title, created_at")
      .eq("client_id", cid)
      .is("parent_project_id", null)
      .order("created_at", { ascending: false })
      .limit(50);
    clientProjects = rows ?? [];
  }

  const pipeline = await fetchCrmPipelineSettings();

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
        <Suspense
          fallback={
            <div className="h-64 animate-pulse rounded-2xl border border-border bg-surface/60 dark:bg-zinc-800/40" />
          }
        >
          <LeadEditForm
            lead={lead}
            clientProjects={clientProjects}
            convertedClientId={cid}
            leadPipelineColumns={pipeline.lead}
          />
        </Suspense>
      </div>
    </div>
  );
}
