import type { Metadata } from "next";
import BlogPageContent from "./BlogPageContent";
import { buildMarketingMetadata } from "@/lib/marketing/seo";

export const metadata: Metadata = buildMarketingMetadata({
  title: "Zenpho Blog · MVPs, product launches and software delivery",
  description:
    "Tactical notes on MVPs, websites, apps, ad creatives and product launches — from the Zenpho studio.",
  path: "/blog",
});

export default function BlogPage() {
  return <BlogPageContent />;
}
