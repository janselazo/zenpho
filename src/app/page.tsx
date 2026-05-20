import type { Metadata } from "next";
import MarketingShell from "@/components/layout/MarketingShell";
import HomePageContent from "@/components/home/HomePageContent";
import { buildMarketingMetadata } from "@/lib/marketing/seo";

export const metadata: Metadata = buildMarketingMetadata({
  title: "Zenpho — MVP Development Agency | Miami · US · Worldwide",
  description:
    "Zenpho is a Miami-based MVP development agency working with founders and operators across the US and worldwide. Websites, web apps, mobile apps and ad creatives shipped in as little as two weeks.",
  path: "/",
});

export default function HomePage() {
  return (
    <MarketingShell>
      <HomePageContent />
    </MarketingShell>
  );
}
