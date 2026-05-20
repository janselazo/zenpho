import type { Metadata } from "next";
import ServicesHero from "./ServicesHero";
import ServicesPreview from "@/components/agency/ServicesPreview";
import ServicesProcess from "@/components/agency/ServicesProcess";
import ServicesClosingCTA from "./ServicesClosingCTA";
import { buildMarketingMetadata } from "@/lib/marketing/seo";

export const metadata: Metadata = buildMarketingMetadata({
  title: "MVP Development and Growth Services | Zenpho",
  description:
    "Explore Zenpho MVP Development and Growth services for founders building AI-powered sites, ecommerce, mobile-first experiences, internal tools, and marketplaces.",
  path: "/services",
});

export default function ServicesPage() {
  return (
    <>
      <ServicesHero />
      <ServicesPreview />
      <ServicesProcess />
      <ServicesClosingCTA />
    </>
  );
}
