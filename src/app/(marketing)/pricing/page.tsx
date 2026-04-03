import type { Metadata } from "next";
import PricingHero from "./PricingHero";
import PricingGrid from "@/components/services/PricingGrid";
import FAQ from "@/components/services/FAQ";
import CTASection from "@/components/home/CTASection";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "Development pricing: MVP Development from $2,500, Web Apps from $5,000, Mobile Apps from $7,000. Book a call for a scoped quote. Custom work $100–$150/h.",
};

export default function PricingPage() {
  return (
    <>
      <PricingHero />
      <PricingGrid />
      <FAQ />
      <CTASection />
    </>
  );
}
