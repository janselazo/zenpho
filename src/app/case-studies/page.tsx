import type { Metadata } from "next";
import CaseStudiesHero from "./CaseStudiesHero";
import PortfolioGrid from "@/components/portfolio/PortfolioGrid";

export const metadata: Metadata = {
  title: "Case Studies",
  description:
    "Case studies in custom AI software: web apps, mobile, agents, and automation for teams that ship to production.",
};

export default function CaseStudiesPage() {
  return (
    <>
      <CaseStudiesHero />
      <PortfolioGrid />
    </>
  );
}
