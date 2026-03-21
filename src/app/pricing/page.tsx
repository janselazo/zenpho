import type { Metadata } from "next";
import PricingHero from "./PricingHero";
import PricingAIPocCallout from "./PricingAIPocCallout";
import PricingGrid from "@/components/services/PricingGrid";
import ServicePackages from "@/components/services/ServicePackages";
import FAQ from "@/components/services/FAQ";
import CTASection from "@/components/home/CTASection";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "Transparent pricing: $50 strategy hour, $1,999 Product MVP, $3,999/mo Scale (10 hrs/week, pause anytime). Plus $100–150/h outside packages.",
};

export default function PricingPage() {
  return (
    <>
      <PricingHero />
      <PricingAIPocCallout />
      <PricingGrid />
      <ServicePackages />
      <FAQ />
      <CTASection />
    </>
  );
}
