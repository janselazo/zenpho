import { createClient } from "@/lib/supabase/server";
import { fetchCurrentOrganizationId } from "@/lib/organization";
import {
  mergeDealPipelineFromDb,
  mergeLeadPipelineFromDb,
  type PipelineColumnDef,
} from "@/lib/crm/pipeline-columns";

export type CrmPipelineSettings = {
  deal: PipelineColumnDef[];
  lead: PipelineColumnDef[];
};

export async function fetchCrmPipelineSettings(): Promise<CrmPipelineSettings> {
  try {
    const supabase = await createClient();
    const organizationId = await fetchCurrentOrganizationId(supabase);
    if (!organizationId) {
      return {
        deal: mergeDealPipelineFromDb(null),
        lead: mergeLeadPipelineFromDb(null),
      };
    }

    const { data, error } = await supabase
      .from("crm_settings")
      .select("deal_pipeline, lead_pipeline")
      .eq("organization_id", organizationId)
      .maybeSingle();

    if (error || !data) {
      return {
        deal: mergeDealPipelineFromDb(null),
        lead: mergeLeadPipelineFromDb(null),
      };
    }

    return {
      deal: mergeDealPipelineFromDb(data.deal_pipeline),
      lead: mergeLeadPipelineFromDb(data.lead_pipeline),
    };
  } catch (e) {
    console.error("fetchCrmPipelineSettings:", e);
    return {
      deal: mergeDealPipelineFromDb(null),
      lead: mergeLeadPipelineFromDb(null),
    };
  }
}
