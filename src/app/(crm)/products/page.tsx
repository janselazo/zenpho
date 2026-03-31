import { mergeFieldOptionsFromDb } from "@/lib/crm/field-options";
import { fetchMergedCrmFieldOptions } from "@/lib/crm/fetch-crm-field-options";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import ProductsPageClient from "./ProductsPageClient";

export default async function ProductsPage() {
  const fieldOptions = isSupabaseConfigured()
    ? await fetchMergedCrmFieldOptions()
    : mergeFieldOptionsFromDb(null);

  return <ProductsPageClient fieldOptions={fieldOptions} />;
}
