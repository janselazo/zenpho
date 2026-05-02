import type { Metadata } from "next";
import BrandingKitPageClient from "@/components/branding-kit/BrandingKitPageClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: {
    absolute: "Brand Kit + Sales Funnel | Zenpho",
  },
  description:
    "Search your Google Business Profile and generate a downloadable brand guidelines pack with sales funnel creative direction.",
};

export default function BrandingMarketingPage() {
  return <BrandingKitPageClient />;
}
