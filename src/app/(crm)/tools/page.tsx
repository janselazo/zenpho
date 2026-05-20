import ToolsPageClient from "@/components/crm/tools/ToolsPageClient";
import { fetchMergedCrmFieldOptions } from "@/lib/crm/fetch-crm-field-options";
import { mergeFieldOptionsFromDb } from "@/lib/crm/field-options";
import { resolveGoogleMapsKeyFromEnv } from "@/lib/revenue-leak-audit/resolve-google-maps-key";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const dynamic = "force-dynamic";

export default async function ToolsPage() {
  const fieldOptions = isSupabaseConfigured()
    ? await fetchMergedCrmFieldOptions()
    : mergeFieldOptionsFromDb(null);
  const { key: googleMapsApiKey } = resolveGoogleMapsKeyFromEnv();

  return (
    <div className="p-8">
      <ToolsPageClient
        fieldOptions={fieldOptions}
        googleMapsApiKey={googleMapsApiKey}
      />
    </div>
  );
}
