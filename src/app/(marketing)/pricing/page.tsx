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
    "Zenpho MVP launch packages: Custom Websites from $1,000, Web Apps from $2,000, Mobile Apps from $3,000 (limited-time 50% launch pricing); strategy through deployment; custom quotes for larger scopes.",
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
