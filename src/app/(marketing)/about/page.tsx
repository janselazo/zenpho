import type { Metadata } from "next";
import AboutPageContent from "./AboutPageContent";
import { buildMarketingMetadata } from "@/lib/marketing/seo";

export const metadata: Metadata = buildMarketingMetadata({
  title: "About · Zenpho · MVP Product Studio",
  description:
    "Who we are, how we work, and how Zenpho helps founders and businesses turn ideas into launch-ready digital products.",
  path: "/about",
});

export default function AboutPage() {
  return <AboutPageContent />;
}
