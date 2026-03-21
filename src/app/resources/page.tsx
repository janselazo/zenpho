import type { Metadata } from "next";
import ResourcesHero from "./ResourcesHero";
import ResourcesGrid from "@/components/resources/ResourcesGrid";

export const metadata: Metadata = {
  title: "Resources",
  description:
    "Resources: blog, case studies, pricing, Studio, newsletter, and LinkedIn — AI product development agency.",
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
