import type { Metadata } from "next";
import RevenueLeakAuditClient from "@/components/revenue-leak-audit/RevenueLeakAuditClient";
import { resolveGoogleMapsKeyFromEnv } from "@/lib/revenue-leak-audit/resolve-google-maps-key";
import { buildMarketingMetadata } from "@/lib/marketing/seo";

export const dynamic = "force-dynamic";

export const metadata: Metadata = buildMarketingMetadata({
  title: "Revenue Leak Audit | Zenpho",
  description:
    "Search your Google Business Profile and uncover missed revenue opportunities across reviews, competitors, website conversion, tracking, and local positioning.",
  path: "/revenue",
});

export default async function RevenueLeakToolPage({
  searchParams,
}: {
  searchParams: Promise<{ placeId?: string }>;
}) {
  const { placeId } = await searchParams;
  const { key: googleMapsApiKey } = resolveGoogleMapsKeyFromEnv();
  const initialPlaceId = typeof placeId === "string" && placeId.trim() ? placeId.trim() : null;
  return (
    <RevenueLeakAuditClient googleMapsApiKey={googleMapsApiKey} initialPlaceId={initialPlaceId} />
  );
}
