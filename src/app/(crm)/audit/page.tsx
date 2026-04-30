import RevenueLeakAuditClient from "@/components/revenue-leak-audit/RevenueLeakAuditClient";
import { resolveGoogleMapsKeyFromEnv } from "@/lib/revenue-leak-audit/resolve-google-maps-key";

export const dynamic = "force-dynamic";

export default function AuditPage() {
  const { key: googleMapsApiKey } = resolveGoogleMapsKeyFromEnv();
  return <RevenueLeakAuditClient googleMapsApiKey={googleMapsApiKey} />;
}
