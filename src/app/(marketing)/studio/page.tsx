import type { Metadata } from "next";
import StudioHero from "./StudioHero";
import StudioVision from "./StudioVision";
import StudioModelSection from "./StudioModelSection";
import FutureProductAreas from "./FutureProductAreas";
import VenturesGrid from "@/components/studio/VenturesGrid";
import StudioPageCTA from "./StudioPageCTA";

export const metadata: Metadata = {
  title: {
    absolute: "Zenpho Studio | AI Product Studio",
  },
  description:
    "Zenpho Studio is building toward an AI Product Studio model—developing and growing tech startups and ecommerce brands while creating our own AI-powered software.",
};

export default function StudioPage() {
  return (
    <>
      <StudioHero />
      <StudioVision />
      <StudioModelSection />
      <FutureProductAreas />
      <VenturesGrid />
      <StudioPageCTA />
    </>
  );
}
