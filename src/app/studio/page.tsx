import type { Metadata } from "next";
import StudioHero from "./StudioHero";
import VenturesGrid from "@/components/studio/VenturesGrid";
import CTASection from "@/components/home/CTASection";

export const metadata: Metadata = {
  title: "Studio",
  description:
    "Studio product—SoldTools—for car sales teams, built alongside client work. Custom software starts on Services or Contact.",
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
