import type { Metadata } from "next";
import ServicesHero from "./ServicesHero";
import ServicesGrid from "@/components/agency/ServicesGrid";
import Process from "@/components/agency/Process";
import CTASection from "@/components/home/CTASection";

export const metadata: Metadata = {
  title: "Services",
  description:
    "What we build: AI apps, web, mobile, automation & workflows, content generation, and APIs — AI product studio with transparent pricing.",
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
