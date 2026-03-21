import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { blogPosts } from "@/lib/data";
import ArticleContent from "./ArticleContent";
import Link from "next/link";
import { SECTION_EYEBROW_COMPACT_CLASSNAME } from "@/components/ui/SectionHeading";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return blogPosts.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = blogPosts.find((p) => p.slug === slug);
  if (!post) return { title: "Post Not Found" };

  return {
    title: post.title,
    description: post.excerpt,
  };
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const post = blogPosts.find((p) => p.slug === slug);

  if (!post) notFound();

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }

  return (
    <article className="relative px-6 pt-40 pb-32">
      <div className="mx-auto max-w-3xl">
        <Link
          href="/blog"
          className="mb-8 inline-flex items-center gap-2 text-sm text-text-secondary transition-colors hover:text-text-primary"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18"
            />
          </svg>
          Back to Blog
        </Link>

        <div className="mb-8 flex flex-wrap items-center gap-4">
          <span className={SECTION_EYEBROW_COMPACT_CLASSNAME}>
            {post.category}
          </span>
          <span className="text-sm text-text-secondary">
            {formatDate(post.date)}
          </span>
          <span className="text-sm text-text-secondary">{post.readTime}</span>
        </div>

        <h1 className="heading-display text-3xl font-bold leading-tight tracking-tight text-text-primary sm:text-4xl lg:text-5xl">
          {post.title}
        </h1>

        <p className="mt-6 text-lg leading-relaxed text-text-secondary">
          {post.excerpt}
        </p>

        <div className="mt-12 border-t border-border pt-12">
          <ArticleContent content={post.content} />
        </div>

        <div className="mt-16 rounded-2xl border border-border bg-surface p-8 text-center">
          <p className="text-lg font-semibold text-text-primary">
            Want to discuss this topic?
          </p>
          <p className="mt-2 text-sm text-text-secondary">
            I love talking shop. Reach out and let&apos;s explore how these
            ideas apply to your project.
          </p>
          <Link
            href="/contact"
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-accent px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-accent/90"
          >
            Get in Touch
          </Link>
        </div>
      </div>
    </article>
  );
}
