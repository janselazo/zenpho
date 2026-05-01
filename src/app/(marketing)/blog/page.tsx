import type { Metadata } from "next";
import BlogHero from "./BlogHero";
import PostGrid from "./PostGrid";

export const metadata: Metadata = {
  title: "Blog",
  description:
    "Notes on local service growth: revenue leaks, tracking, reviews, referrals, paid media, and ROI—from Zenpho.",
};

export default function BlogPage() {
  return (
    <>
      <BlogHero />
      <PostGrid />
    </>
  );
}
