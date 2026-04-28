import type { Metadata } from "next";
import CaseStudiesHero from "./CaseStudiesHero";
import WorkIntro from "./WorkIntro";
import WorkConceptGrid from "./WorkConceptGrid";
import WorkPageCTA from "./WorkPageCTA";

export const metadata: Metadata = {
  title: {
    absolute: "MVP Builds and Product Concepts | Zenpho",
  },
  description:
    "View Zenpho's demo MVPs, AI product concepts, and studio builds showing how focused technology products can be scoped, built, and launched fast.",
};

export default function CaseStudiesPage() {
  return (
    <>
      <CaseStudiesHero />
      <WorkIntro />
      <WorkConceptGrid />
      <WorkPageCTA />
    </>
  );
}
