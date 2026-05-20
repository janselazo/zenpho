import type { Metadata } from "next";
import CaseStudiesPageContent from "./CaseStudiesPageContent";
import { buildMarketingMetadata } from "@/lib/marketing/seo";

export const metadata: Metadata = buildMarketingMetadata({
  title: "Case Studies · MVP, Mobile & Ecommerce Builds | Zenpho",
  description:
    "Three Zenpho engagements — Taptok (SaaS), Apex Inspection Pro (mobile field app) and TQMuch (food ecommerce) — shipped on the same Design · Build · Launch cadence.",
  path: "/case-studies",
});

export default function CaseStudiesPage() {
  return <CaseStudiesPageContent />;
}
