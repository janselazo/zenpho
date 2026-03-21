import type { Metadata } from "next";
import BlogHero from "./BlogHero";
import PostGrid from "./PostGrid";
import NewsletterSignup from "@/components/ui/NewsletterSignup";

export const metadata: Metadata = {
  title: "Blog",
  description:
    "Insights on AI engineering, startup building, growth methodology, and the craft of scalable software — from Janse Lazo.",
};

export default function BlogPage() {
  return (
    <>
      <BlogHero />
      <NewsletterSignup />
      <PostGrid />
    </>
  );
}
