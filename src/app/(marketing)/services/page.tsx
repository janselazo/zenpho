import type { Metadata } from "next";
import ServicesHero from "./ServicesHero";
import ServicesGrid from "@/components/agency/ServicesGrid";
import Process from "@/components/agency/Process";
import CTASection from "@/components/home/CTASection";

export const metadata: Metadata = {
  title: "Services",
  description:
    "AI Product Studio Agency: web apps, mobile apps, websites, ecommerce, AI in-product, integrations, and product-led growth — weekly cadence, transparent pricing.",
};

export default function ServicesPage() {
  return (
    <>
      <ServicesHero />
      <ServicesGrid />
      <Process />
      <CTASection />
    </>
  );
}
