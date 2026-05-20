import type { Metadata } from "next";
import ResourcesHero from "./ResourcesHero";
import ResourcesGrid from "@/components/resources/ResourcesGrid";
import { buildMarketingMetadata } from "@/lib/marketing/seo";

export const metadata: Metadata = buildMarketingMetadata({
  title: "Resources · Zenpho",
  description:
    "Guides, tools, checklists, and frameworks to help you plan, build, launch, and improve your digital product—from Zenpho.",
  path: "/resources",
});

export default function ResourcesPage() {
  return (
    <>
      <ResourcesHero />
      <div className="border-t border-border/60 bg-background">
        <ResourcesGrid />
      </div>
    </>
  );
}
