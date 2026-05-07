import type { Metadata } from "next";
import PricingHero from "./PricingHero";
import LocalServicePricingComparison from "@/components/pricing/LocalServicePricingComparison";
import PricingAuditCtaSection from "@/components/pricing/PricingAuditCtaSection";
import PricingFAQ from "@/components/pricing/PricingFAQ";
import PricingPageClosingCta from "@/components/pricing/PricingPageClosingCta";

export const metadata: Metadata = {
  title: {
    absolute: "Pricing | Zenpho",
  },
  description:
    "Zenpho MVP launch packages: Website Launch from $2,497, Web App MVP from $4,997, Mobile App MVP from $5,997 (limited-time 50% launch pricing); strategy through deployment; custom quotes for larger scopes.",
};

export default function PricingPage() {
  return (
    <>
      <PricingHero />
      <LocalServicePricingComparison />
      <PricingAuditCtaSection />
      <PricingFAQ />
      <PricingPageClosingCta />
    </>
  );
}
