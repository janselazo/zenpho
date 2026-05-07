import type { Metadata } from "next";
import BlogHero from "./BlogHero";
import PostGrid from "./PostGrid";

export const metadata: Metadata = {
  title: "Blog",
  description:
    "Insights on MVP development, product strategy, websites, ecommerce, mobile, and launching faster—from Zenpho.",
};

export default function BlogPage() {
  return (
    <>
      <BlogHero />
      <PostGrid />
    </>
  );
}
