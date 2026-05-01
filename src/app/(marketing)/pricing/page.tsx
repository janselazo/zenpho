import type { Metadata } from "next";
import PricingHero from "./PricingHero";
import PricingGrid from "@/components/services/PricingGrid";
import FoundingClientSection from "@/components/pricing/FoundingClientSection";
import FAQ from "@/components/services/FAQ";
import CTASection from "@/components/home/CTASection";

export const metadata: Metadata = {
  title: {
    absolute: "Pricing | Zenpho",
  },
  description:
    "Transparent starting points for product and growth work with Zenpho—scoped on a call for local service businesses.",
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
