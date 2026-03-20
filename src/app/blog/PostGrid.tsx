"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { blogPosts } from "@/lib/data";
import Card from "@/components/ui/Card";
import { SECTION_EYEBROW_COMPACT_CLASSNAME } from "@/components/ui/SectionHeading";

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function PostGrid() {
  return (
    <section className="mx-auto max-w-7xl px-6 pb-32 lg:px-8">
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {blogPosts.map((post, i) => (
          <motion.div
            key={post.slug}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.5, delay: i * 0.1 }}
          >
            <Link href={`/blog/${post.slug}`} className="group block h-full">
              <Card className="flex h-full flex-col transition-all duration-300 group-hover:border-accent/30">
                <div className="mb-4 flex items-center justify-between">
                  <span className={SECTION_EYEBROW_COMPACT_CLASSNAME}>
                    {post.category}
                  </span>
                  <span className="text-xs text-text-secondary">
                    {post.readTime}
                  </span>
                </div>

                <h3 className="text-lg font-bold leading-snug text-text-primary transition-colors group-hover:text-accent">
                  {post.title}
                </h3>

                <p className="mt-3 flex-1 text-sm leading-relaxed text-text-secondary">
                  {post.excerpt}
                </p>

                <div className="mt-4 pt-4 border-t border-border">
                  <span className="text-xs text-text-secondary">
                    {formatDate(post.date)}
                  </span>
                </div>
              </Card>
            </Link>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
