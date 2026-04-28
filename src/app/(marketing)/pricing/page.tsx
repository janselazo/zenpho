import type { Metadata } from "next";
import PricingHero from "./PricingHero";
import PricingGrid from "@/components/services/PricingGrid";
import FoundingClientSection from "@/components/pricing/FoundingClientSection";
import FAQ from "@/components/services/FAQ";
import CTASection from "@/components/home/CTASection";

export const metadata: Metadata = {
  title: {
    absolute: "MVP Development Pricing | Zenpho",
  },
  description:
    "Simple pricing for MVP Development and MVP Growth. Build your AI-powered MVP, launch faster, attract early users, and validate demand.",
};

export default function PricingPage() {
  return (
    <>
      <PricingHero />
      <PricingGrid />
      <FoundingClientSection />
      <FAQ />
      <CTASection />
    </>
  );
}
