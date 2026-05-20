import ToolsPageClient from "@/components/crm/tools/ToolsPageClient";
import { resolveGoogleMapsKeyFromEnv } from "@/lib/revenue-leak-audit/resolve-google-maps-key";

export const dynamic = "force-dynamic";

export default async function ToolsPage() {
  const { key: googleMapsApiKey } = resolveGoogleMapsKeyFromEnv();

  return (
    <div className="p-8">
      <ToolsPageClient googleMapsApiKey={googleMapsApiKey} />
    </div>
  );
}
