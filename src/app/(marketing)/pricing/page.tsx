import type { Metadata } from "next";
import PricingPageContent from "./PricingPageContent";

export const metadata: Metadata = {
  title: {
    absolute: "Pricing · Zenpho · Launch packages",
  },
  description:
    "Fixed-scope launch packages — Websites from $1,000, Web Apps from $2,000, Mobile Apps from $3,000, and ad creatives from $100/video. Custom commissions on request.",
};

export default function PricingPage() {
  return <PricingPageContent />;
}
