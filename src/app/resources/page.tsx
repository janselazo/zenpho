import type { Metadata } from "next";
import ResourcesHero from "./ResourcesHero";
import ResourcesGrid from "@/components/resources/ResourcesGrid";

export const metadata: Metadata = {
  title: "Resources",
  description:
    "Resources from Janse Lazo: blog, case studies, pricing, Studio (personal projects), newsletter, and LinkedIn—custom AI software and agents.",
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
