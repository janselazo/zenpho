import {
  mergeFieldOptionsFromDb,
  type MergedCrmFieldOptions,
} from "@/lib/crm/field-options";
import type { SupabaseClient } from "@supabase/supabase-js";

export async function mergedFieldOptionsFromSupabase(
  supabase: SupabaseClient
): Promise<MergedCrmFieldOptions> {
  const { data, error } = await supabase
    .from("crm_settings")
    .select("crm_field_options")
    .eq("id", 1)
    .maybeSingle();
  if (error || !data) return mergeFieldOptionsFromDb(null);
  try {
    return mergeFieldOptionsFromDb(data.crm_field_options);
  } catch {
    return mergeFieldOptionsFromDb(null);
  }
}
