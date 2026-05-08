import type { Metadata } from "next";
import BlogHero from "./BlogHero";
import PostGrid from "./PostGrid";

export const metadata: Metadata = {
  title: "Blog",
  description:
    "MVP Development Agency & Product Studio notes on discovery, product strategy, UX, engineering, and shipping web and mobile launches—from Zenpho.",
};

export default function BlogPage() {
  return (
    <>
      <BlogHero />
      <PostGrid />
    </>
  );
}
