import type { Metadata } from "next";
import ServicesHero from "./ServicesHero";
import ServicesGrid from "@/components/agency/ServicesGrid";
import Process from "@/components/agency/Process";
import CTASection from "@/components/home/CTASection";

export const metadata: Metadata = {
  title: "Services",
  description:
    "Custom AI software development: AI web apps, iOS and Android, websites, ecommerce stores, and AI agents tailored to your workflows.",
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
