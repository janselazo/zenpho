import type { Metadata } from "next";
import StudioHero from "./StudioHero";
import VenturesGrid from "@/components/studio/VenturesGrid";
import CTASection from "@/components/home/CTASection";

export const metadata: Metadata = {
  title: "Studio",
  description:
    "AI Product Studio: products we own and scale — same team as our Agency, separate roadmap. SoldTools for car sales teams is live. Client work: Work, Services, or book a call.",
};

export default function StudioPage() {
  return (
    <>
      <StudioHero />
      <VenturesGrid />
      <CTASection />
    </>
  );
}
