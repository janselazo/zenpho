import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { LEAD_PROJECT_TYPE_OPTIONS } from "@/lib/crm/mock-data";

function allowedProjectTypeSet(
  allowedProjectTypes?: readonly string[]
): Set<string> {
  if (allowedProjectTypes?.length) return new Set(allowedProjectTypes);
  return new Set(LEAD_PROJECT_TYPE_OPTIONS);
}
import type { NewProjectDealPrefill } from "@/lib/crm/new-project-deal-prefill";

export async function fetchLeadPrefillForNewProject(
  leadId: string,
  allowedProjectTypes?: readonly string[]
): Promise<NewProjectDealPrefill | null> {
  if (!isSupabaseConfigured()) return null;
  const trimmed = leadId.trim();
  if (!trimmed) return null;

  const sb = createClient();
  const { data: lead, error: lErr } = await sb
    .from("lead")
    .select("name, email, company, converted_client_id, project_type")
    .eq("id", trimmed)
    .maybeSingle();
  if (lErr || !lead) return null;

  const { data: deal } = await sb
    .from("deal")
    .select("title, value, website")
    .eq("lead_id", trimmed)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const clientId = lead.converted_client_id?.trim() || null;
  const dealTitle = deal?.title?.trim() || "";
  const company = lead.company?.trim() || "";
  const person = lead.name?.trim() || lead.email?.trim() || "";
  const title =
    dealTitle ||
    [company, person].filter(Boolean).join(" — ") ||
    person ||
    company ||
    "New project";

  const valueNum =
    deal?.value != null && deal.value !== ""
      ? Number(deal.value)
      : NaN;
  const budget =
    Number.isFinite(valueNum) && valueNum > 0
      ? String(Math.round(valueNum))
      : "";

  const website = String(deal?.website ?? "").trim();
  const pt = lead.project_type?.trim() || null;
  const allow = allowedProjectTypeSet(allowedProjectTypes);
  const projectTypeValid = !!pt && allow.has(pt);

  return {
    clientId,
    title,
    budget,
    website,
    projectType: projectTypeValid ? pt : null,
    missingClientNote: !clientId,
  };
}
