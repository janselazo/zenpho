"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { resourceItems, type ResourceItem } from "@/lib/data";
import SectionHeading from "@/components/ui/SectionHeading";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";

interface ResourcesGridProps {
  /** If set, only the first N items are shown (e.g. home preview). */
  limit?: number;
  showSectionHeading?: boolean;
  showViewAll?: boolean;
}

function ResourceLink({
  item,
  children,
}: {
  item: ResourceItem;
  children: React.ReactNode;
}) {
  const className = "block h-full text-left outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 rounded-3xl";
  if (item.external) {
    return (
      <a
        href={item.href}
        target="_blank"
        rel="noopener noreferrer"
        className={className}
      >
        {children}
      </a>
    );
  }
  return (
    <Link href={item.href} className={className}>
      {children}
    </Link>
  );
}

export default function ResourcesGrid({
  limit,
  showSectionHeading = false,
  showViewAll = false,
}: ResourcesGridProps) {
  const items = limit != null ? resourceItems.slice(0, limit) : resourceItems;

  return (
    <section
      className={`mx-auto max-w-7xl px-6 py-24 lg:px-8 ${showSectionHeading ? "bg-surface/40" : ""}`}
    >
      {showSectionHeading && (
        <SectionHeading
          label="Resources"
          title="Go deeper on"
          titleAccent="AI software & agents"
          description="Writing, selected work, how engagements work, the studio product, and ways to follow along."
        />
      )}

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item, i) => (
          <motion.div
            key={item.href + item.title}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.45, delay: i * 0.06 }}
          >
            <ResourceLink item={item}>
              <Card className="flex h-full flex-col p-6 sm:p-8">
                <span className="mb-3 text-xs font-semibold uppercase tracking-wider text-accent-violet">
                  {item.tag}
                </span>
                <h3 className="heading-display text-lg font-bold text-text-primary">
                  {item.title}
                  {item.external ? (
                    <span className="ml-1 text-sm font-normal text-text-secondary">
                      ↗
                    </span>
                  ) : null}
                </h3>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-text-secondary">
                  {item.description}
                </p>
                <span className="mt-5 text-sm font-semibold text-accent">
                  Open →
                </span>
              </Card>
            </ResourceLink>
          </motion.div>
        ))}
      </div>

      {showViewAll && limit != null && resourceItems.length > limit ? (
        <div className="mt-12 flex justify-center">
          <Button href="/resources" variant="dark" size="lg" showLiveDot>
            All resources
          </Button>
        </div>
      ) : null}
    </section>
  );
}
