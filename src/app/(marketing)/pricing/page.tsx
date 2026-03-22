import type { Metadata } from "next";
import PricingHero from "./PricingHero";
import PricingAIPocCallout from "./PricingAIPocCallout";
import PricingGrid from "@/components/services/PricingGrid";
import FAQ from "@/components/services/FAQ";
import CTASection from "@/components/home/CTASection";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "Development & Growth pricing: $150 strategy hour, $1,999 sprint (Product MVP or Growth sprint), $3,999/mo Scale per track (pause anytime). $100–150/h outside packages.",
};

export default function PricingPage() {
  return (
    <>
      <PricingHero />
      <PricingAIPocCallout />
      <PricingGrid />
      <FAQ />
      <CTASection />
    </>
  );
}
