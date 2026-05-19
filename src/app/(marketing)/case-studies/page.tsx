import type { Metadata } from "next";
import CaseStudiesPageContent from "./CaseStudiesPageContent";

export const metadata: Metadata = {
  title: {
    absolute: "Case Studies · MVP, Mobile & Ecommerce Builds | Zenpho",
  },
  description:
    "Three Zenpho engagements — Taptok (SaaS), Apex Inspection Pro (mobile field app) and TQMuch (food ecommerce) — shipped on the same Design · Build · Launch cadence.",
};

export default function CaseStudiesPage() {
  return <CaseStudiesPageContent />;
}
