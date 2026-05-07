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
    "Explore Zenpho MVP Development and Growth services for founders building AI-powered sites, ecommerce, mobile-first experiences, internal tools, and marketplaces.",
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
