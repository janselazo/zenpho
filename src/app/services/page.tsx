import type { Metadata } from "next";
import ServicesHero from "./ServicesHero";
import PricingGrid from "@/components/services/PricingGrid";
import ServicePackages from "@/components/services/ServicePackages";
import FAQ from "@/components/services/FAQ";
import CTASection from "@/components/home/CTASection";

export const metadata: Metadata = {
  title: "Services & Pricing",
  description:
    "Advisory retainers and engagement models for AI product teams—plus how scoped builds fit when you need hands-on delivery.",
};

export default function ServicesPage() {
  return (
    <>
      <ServicesHero />
      <PricingGrid />
      <ServicePackages />
      <FAQ />
      <CTASection />
    </>
  );
}
