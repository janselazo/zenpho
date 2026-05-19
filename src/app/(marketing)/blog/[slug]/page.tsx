import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { blogPosts } from "@/lib/data";
import ArticleContent from "./ArticleContent";
import Link from "next/link";
import BlogArticleCTA from "@/components/marketing/blog/BlogArticleCTA";

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
    <section className="section section-light blog-article-page">
      <div className="shell blog-article-shell">
        <Link href="/blog" className="blog-article-back">
          ← Back to blog
        </Link>

        <header className="blog-article-head">
          <div className="eyebrow left">{post.category}</div>
          <h1 className="blog-article-title">{post.title}</h1>
          <div className="blog-article-meta">
            <span>{formatDate(post.date)}</span>
            <span>{post.readTime}</span>
          </div>
          <p className="blog-article-dek">{post.excerpt}</p>
        </header>

        <div className="blog-article-doc">
          <ArticleContent content={post.content} />
        </div>

        <BlogArticleCTA />
      </div>
    </section>
  );
}
