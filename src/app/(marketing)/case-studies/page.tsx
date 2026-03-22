import type { Metadata } from "next";
import CaseStudiesHero from "./CaseStudiesHero";
import PortfolioGrid from "@/components/portfolio/PortfolioGrid";

export const metadata: Metadata = {
  title: "Work",
  description:
    "Agency & Studio work: web apps, mobile apps, websites, and ecommerce — shipped for growth, handed off cleanly. Case studies from AI Product Studio.",
};

export default function CaseStudiesPage() {
  return (
    <>
      <CaseStudiesHero />
      <PortfolioGrid />
    </>
  );
}
