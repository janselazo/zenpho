import type { Metadata } from "next";
import RevenueLeakAuditClient from "@/components/revenue-leak-audit/RevenueLeakAuditClient";
import { resolveGoogleMapsKeyFromEnv } from "@/lib/revenue-leak-audit/resolve-google-maps-key";

export const metadata: Metadata = {
  title: {
    absolute: "Revenue Leak Audit | Zenpho",
  },
  description:
    "Search your Google Business Profile and uncover missed revenue opportunities across reviews, competitors, website conversion, tracking, and local positioning.",
};

export default function RevenueLeakAuditPage() {
  const { key: googleMapsApiKey } = resolveGoogleMapsKeyFromEnv();
  return <RevenueLeakAuditClient googleMapsApiKey={googleMapsApiKey} />;
}
