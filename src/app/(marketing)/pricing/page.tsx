import type { Metadata } from "next";
import PricingHero from "./PricingHero";
import PricingPackageNarratives from "@/components/pricing/PricingPackageNarratives";
import LocalServicePricingComparison from "@/components/pricing/LocalServicePricingComparison";
import PricingAuditCtaSection from "@/components/pricing/PricingAuditCtaSection";
import PricingFAQ from "@/components/pricing/PricingFAQ";
import PricingPageClosingCta from "@/components/pricing/PricingPageClosingCta";

export const metadata: Metadata = {
  title: {
    absolute: "Pricing | Zenpho",
  },
  description:
    "Zenpho Launch, Grow, and Scale pricing for local service businesses: setup plus monthly platform and marketing fees, ad spend billed separately, optional Launch alternate tier, and custom ecommerce / app builds quoted on request.",
};

export default function PricingPage() {
  return (
    <>
      <PricingHero />
      <PricingPackageNarratives />
      <LocalServicePricingComparison />
      <PricingAuditCtaSection />
      <PricingFAQ />
      <PricingPageClosingCta />
    </>
  );
}
