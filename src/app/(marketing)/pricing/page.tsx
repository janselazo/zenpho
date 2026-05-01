import type { Metadata } from "next";
import PricingHero from "./PricingHero";
import LocalServicePricingPlans from "@/components/pricing/LocalServicePricingPlans";
import PricingAuditCtaSection from "@/components/pricing/PricingAuditCtaSection";
import PricingFAQ from "@/components/pricing/PricingFAQ";
import PricingPageClosingCta from "@/components/pricing/PricingPageClosingCta";

export const metadata: Metadata = {
  title: {
    absolute: "Pricing | Zenpho",
  },
  description:
    "Growth plans for local service businesses: Lead-to-Revenue Setup, Growth Engine Management, and Full Growth Partner. Track ROI, fix leaks, and scale what works.",
};

export default function PricingPage() {
  return (
    <>
      <PricingHero />
      <LocalServicePricingPlans />
      <PricingAuditCtaSection />
      <PricingFAQ />
      <PricingPageClosingCta />
    </>
  );
}
