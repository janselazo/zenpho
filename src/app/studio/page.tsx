import type { Metadata } from "next";
import StudioHero from "./StudioHero";
import VenturesGrid from "@/components/studio/VenturesGrid";
import CTASection from "@/components/home/CTASection";

export const metadata: Metadata = {
  title: "Studio",
  description:
    "Studio — in-house products like SoldTools for car sales teams, built alongside client work. Custom builds start on Services or Contact.",
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
