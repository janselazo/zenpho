import type { Metadata } from "next";
import BlogPageContent from "./BlogPageContent";

export const metadata: Metadata = {
  title: "Blog",
  description:
    "Tactical notes on MVPs, websites, apps, ad creatives and product launches — from the Zenpho studio.",
};

export default function BlogPage() {
  return <BlogPageContent />;
}
