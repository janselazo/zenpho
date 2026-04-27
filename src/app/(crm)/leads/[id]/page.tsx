import { notFound } from "next/navigation";
import { Suspense } from "react";
import LeadEditForm from "@/components/crm/LeadEditForm";
import { fetchMergedCrmFieldOptions } from "@/lib/crm/fetch-crm-field-options";
import { fetchCrmPipelineSettings } from "@/lib/crm/fetch-pipeline-settings";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import type { LeadFollowUpAppointment } from "@/lib/crm/lead-follow-up-appointment";

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
      "id, name, email, company, phone, facebook, instagram, google_business_category, google_place_types, source, stage, notes, project_type, contact_category, created_at, converted_client_id, prospect_preview_id, branding_funnel_pdf_path, branding_funnel_pdf_created_at"
    )
    .eq("id", id)
    .maybeSingle();

  if (error || !lead) notFound();

  const pvId =
    typeof lead.prospect_preview_id === "string" && lead.prospect_preview_id.trim()
      ? lead.prospect_preview_id.trim()
      : null;
  let previewMeta: {
    slug: string | null;
    preview_target: string | null;
  } | null = null;
  if (pvId) {
    const { data: pv } = await supabase
      .from("prospect_preview")
      .select("slug, preview_target")
      .eq("id", pvId)
      .maybeSingle();
    if (pv && typeof pv === "object") {
      previewMeta = {
        slug:
          typeof (pv as { slug?: unknown }).slug === "string"
            ? (pv as { slug: string }).slug
            : null,
        preview_target:
          typeof (pv as { preview_target?: unknown }).preview_target === "string"
            ? (pv as { preview_target: string }).preview_target
            : null,
      };
    }
  }

  let brandingPdfPublicUrl: string | null = null;
  const bPath =
    typeof lead.branding_funnel_pdf_path === "string"
      ? lead.branding_funnel_pdf_path.trim()
      : "";
  if (bPath) {
    const {
      data: { publicUrl },
    } = supabase.storage.from("prospect-attachments").getPublicUrl(bPath);
    brandingPdfPublicUrl = publicUrl || null;
  }

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

  const [pipeline, fieldOptions] = await Promise.all([
    fetchCrmPipelineSettings(),
    fetchMergedCrmFieldOptions(),
  ]);

  const tagsRes = await supabase
    .from("lead_tag")
    .select("id, name, color")
    .order("name");
  const leadTagCatalog =
    !tagsRes.error && tagsRes.data
      ? tagsRes.data.map((t) => ({
          id: t.id as string,
          name: t.name as string,
          color:
            typeof t.color === "string" && t.color.trim()
              ? t.color.trim()
              : "#2563eb",
        }))
      : [];

  const assignRes = await supabase
    .from("lead_tag_assignment")
    .select("tag_id")
    .eq("lead_id", id);
  const leadTagIds =
    !assignRes.error && assignRes.data
      ? assignRes.data.map((r) => r.tag_id as string)
      : [];

  const followUpsRes = await supabase
    .from("appointment")
    .select("id, title, starts_at, ends_at")
    .eq("lead_id", id)
    .order("starts_at", { ascending: true });
  const followUpAppointments: LeadFollowUpAppointment[] =
    !followUpsRes.error && followUpsRes.data
      ? (followUpsRes.data as LeadFollowUpAppointment[])
      : [];

  return (
    <div className="min-h-full bg-zinc-50/90 px-4 py-6 sm:px-8 sm:py-8 dark:bg-zinc-950">
      <Suspense
        fallback={
          <div className="mx-auto max-w-6xl">
            <div className="h-10 w-32 animate-pulse rounded-lg bg-zinc-200 dark:bg-zinc-800" />
            <div className="mt-8 h-48 animate-pulse rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900/60" />
          </div>
        }
      >
        <LeadEditForm
          lead={lead}
          clientProjects={clientProjects}
          convertedClientId={cid}
          fieldOptions={fieldOptions}
          leadPipelineColumns={pipeline.lead}
          leadTagCatalog={leadTagCatalog}
          leadTagIds={leadTagIds}
          followUpAppointments={followUpAppointments}
          hostedProspectPreviewId={pvId}
          hostedProspectPreviewMeta={previewMeta}
          brandingFunnelPdfUrl={brandingPdfPublicUrl}
          brandingFunnelPdfCreatedAt={
            typeof lead.branding_funnel_pdf_created_at === "string"
              ? lead.branding_funnel_pdf_created_at
              : null
          }
        />
      </Suspense>
    </div>
  );
}
