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
    "Zenpho pricing: Development ($1,000 one-time), Growth ($2,000/month + ad spend), and Scale ($3,000/month + ad spend). Compare platform, website and GBP, Meta ads, SEO, and Google Ads.",
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
