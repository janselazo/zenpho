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
    "Zenpho Launch, Grow, and Scale for local service businesses: $1,500 / $2,000 / $3,000 per month (ad spend separate for Grow and Scale), optional Launch alternate tier, and custom ecommerce / app builds quoted on request.",
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
