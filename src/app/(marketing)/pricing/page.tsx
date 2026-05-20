import type { Metadata } from "next";
import PricingPageContent from "./PricingPageContent";
import JsonLd from "@/components/marketing/seo/JsonLd";
import { buildMarketingMetadata, faqPageJsonLd } from "@/lib/marketing/seo";
import { PRICING_PAGE_FAQS } from "@/lib/marketing/pricing-page-faq-items";

export const metadata: Metadata = buildMarketingMetadata({
  title: "Pricing · Zenpho · Launch packages",
  description:
    "Fixed-scope MVP development packages for websites, web apps, mobile apps and ad creatives. Custom commissions on request.",
  path: "/pricing",
});

export default function PricingPage() {
  return (
    <>
      <JsonLd data={faqPageJsonLd(PRICING_PAGE_FAQS)} />
      <PricingPageContent />
    </>
  );
}
