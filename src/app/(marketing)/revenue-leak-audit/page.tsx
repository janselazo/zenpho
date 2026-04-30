import type { Metadata } from "next";
import RevenueLeakAuditClient from "@/components/revenue-leak-audit/RevenueLeakAuditClient";

export const metadata: Metadata = {
  title: {
    absolute: "Revenue Leak Audit | Zenpho",
  },
  description:
    "Search your Google Business Profile and uncover missed revenue opportunities across reviews, competitors, website conversion, tracking, and local positioning.",
};

export default function RevenueLeakAuditPage() {
  const googleMapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim() || null;
  return <RevenueLeakAuditClient googleMapsApiKey={googleMapsApiKey} />;
}
