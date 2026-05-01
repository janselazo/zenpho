import type { Metadata } from "next";
import ResourcesHero from "./ResourcesHero";
import ResourcesGrid from "@/components/resources/ResourcesGrid";

export const metadata: Metadata = {
  title: "Resources",
  description:
    "Resources: blog, case studies, pricing, and LinkedIn — for local service businesses growing leads, reviews, and ROI.",
};

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
