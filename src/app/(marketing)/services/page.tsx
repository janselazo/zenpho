import type { Metadata } from "next";
import ServicesHero from "./ServicesHero";
import ServicesGrid from "@/components/agency/ServicesGrid";
import Process from "@/components/agency/Process";
import CTASection from "@/components/home/CTASection";

export const metadata: Metadata = {
  title: "Services",
  description:
    "Custom web apps, mobile apps, websites, AI, and integrations — designed, built, and launched fast for founders and businesses. AI Product Studio.",
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
