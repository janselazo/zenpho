import type { Metadata } from "next";
import ServicesHero from "./ServicesHero";
import ServicesPreview from "@/components/agency/ServicesPreview";
import ServicesProcess from "@/components/agency/ServicesProcess";
import ServicesClosingCTA from "./ServicesClosingCTA";

export const metadata: Metadata = {
  title: {
    absolute: "MVP Development and Growth Services | Zenpho",
  },
  description:
    "Explore Zenpho's MVP Development and MVP Growth services for founders building AI SaaS products, web apps, mobile-first apps, internal tools, and marketplaces.",
};

export default function ServicesPage() {
  return (
    <>
      <ServicesHero />
      <ServicesPreview />
      <ServicesProcess />
      <ServicesClosingCTA />
    </>
  );
}
