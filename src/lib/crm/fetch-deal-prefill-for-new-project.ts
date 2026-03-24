import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { LEAD_PROJECT_TYPE_OPTIONS } from "@/lib/crm/mock-data";
import type { NewProjectDealPrefill } from "@/lib/crm/new-project-deal-prefill";

export async function fetchDealPrefillForNewProject(
  dealId: string
): Promise<NewProjectDealPrefill | null> {
  if (!isSupabaseConfigured()) return null;
  const trimmed = dealId.trim();
  if (!trimmed) return null;

  const sb = createClient();
  const { data: deal, error: dErr } = await sb
    .from("deal")
    .select("title, value, website, lead_id")
    .eq("id", trimmed)
    .maybeSingle();
  if (dErr || !deal?.lead_id) return null;

  const { data: lead } = await sb
    .from("lead")
    .select("converted_client_id, project_type")
    .eq("id", deal.lead_id)
    .maybeSingle();

  const clientId = lead?.converted_client_id?.trim() || null;
  const title = deal.title?.trim() || "New project";
  const valueNum =
    deal.value != null && deal.value !== "" ? Number(deal.value) : NaN;
  const budget =
    Number.isFinite(valueNum) && valueNum > 0
      ? String(Math.round(valueNum))
      : "";
  const website = String(deal.website ?? "").trim();
  const pt = lead?.project_type?.trim() || null;
  const projectTypeValid =
    !!pt && (LEAD_PROJECT_TYPE_OPTIONS as readonly string[]).includes(pt);

  return {
    clientId,
    title,
    budget,
    website,
    projectType: projectTypeValid ? pt : null,
    missingClientNote: !clientId,
  };
}
