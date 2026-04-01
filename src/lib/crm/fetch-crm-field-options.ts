import { mergeFieldOptionsFromDb, type MergedCrmFieldOptions } from "@/lib/crm/field-options";
import { createClient } from "@/lib/supabase/server";

export type { MergedCrmFieldOptions };

export async function fetchMergedCrmFieldOptions(): Promise<MergedCrmFieldOptions> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("crm_settings")
      .select("crm_field_options")
      .eq("id", 1)
      .maybeSingle();

    if (error || !data) {
      return mergeFieldOptionsFromDb(null);
    }

    return mergeFieldOptionsFromDb(data.crm_field_options);
  } catch {
    return mergeFieldOptionsFromDb(null);
  }
}
