import type { Metadata } from "next";
import PricingHero from "./PricingHero";
import PricingGrid from "@/components/services/PricingGrid";
import FAQ from "@/components/services/FAQ";
import CTASection from "@/components/home/CTASection";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "Development Services: Web App & SaaS ($2,999–$14,999), Mobile App ($3,999–$18,999), Website & Ecommerce ($999–$9,999). Starter, Growth, and Scale tiers. Book a call. Custom work $100–$150/h.",
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
