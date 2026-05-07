import { mergeFieldOptionsFromDb, type MergedCrmFieldOptions } from "@/lib/crm/field-options";
import { fetchCurrentOrganizationId } from "@/lib/organization";
import { createClient } from "@/lib/supabase/server";

export type { MergedCrmFieldOptions };

export async function fetchMergedCrmFieldOptions(): Promise<MergedCrmFieldOptions> {
  try {
    const supabase = await createClient();
    const organizationId = await fetchCurrentOrganizationId(supabase);
    if (!organizationId) return mergeFieldOptionsFromDb(null);

    const { data, error } = await supabase
      .from("crm_settings")
      .select("crm_field_options")
      .eq("organization_id", organizationId)
      .maybeSingle();

    if (error || !data) {
      return mergeFieldOptionsFromDb(null);
    }

    return mergeFieldOptionsFromDb(data.crm_field_options);
  } catch {
    return mergeFieldOptionsFromDb(null);
  }
}
