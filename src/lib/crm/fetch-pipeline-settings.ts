import { createClient } from "@/lib/supabase/server";
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
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("crm_settings")
    .select("deal_pipeline, lead_pipeline")
    .eq("id", 1)
    .maybeSingle();

  if (error) {
    return {
      deal: mergeDealPipelineFromDb(null),
      lead: mergeLeadPipelineFromDb(null),
    };
  }

  if (!data) {
    return {
      deal: mergeDealPipelineFromDb(null),
      lead: mergeLeadPipelineFromDb(null),
    };
  }

  return {
    deal: mergeDealPipelineFromDb(data.deal_pipeline),
    lead: mergeLeadPipelineFromDb(data.lead_pipeline),
  };
}
