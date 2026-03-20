import type { Metadata } from "next";
import AgencyHero from "./AgencyHero";
import ServicesGrid from "@/components/agency/ServicesGrid";
import Process from "@/components/agency/Process";
import CaseStudies from "@/components/agency/CaseStudies";
import CTASection from "@/components/home/CTASection";

export const metadata: Metadata = {
  title: "Agency",
  description:
    "Custom AI software development: agents, conversational AI, integrations, automation, and full-stack apps—for teams that need calm, shippable systems.",
};

export default function AgencyPage() {
  return (
    <>
      <AgencyHero />
      <ServicesGrid />
      <CaseStudies />
      <Process />
      <CTASection />
    </>
  );
}
