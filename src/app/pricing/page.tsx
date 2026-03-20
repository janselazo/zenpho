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
    "AI software development and AI solutions deployment: flexible consultancy, PoC, production, and enterprise programs—from $100–150/h T&M to fixed-phase packages.",
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
