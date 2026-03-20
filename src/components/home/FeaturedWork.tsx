"use client";

import { motion } from "framer-motion";
import { featuredProjects } from "@/lib/data";
import SectionHeading from "@/components/ui/SectionHeading";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";

export default function FeaturedWork() {
  return (
    <section className="relative mx-auto max-w-7xl px-6 py-24 lg:px-8">
      <SectionHeading
        label="Featured case studies"
        title="Recent"
        titleAccent="outcomes"
        titleAccentInline
        description="SaaS web apps, ecommerce stores, and marketing sites for the teams you see above. Each build is meant to ship cleanly and hand off without friction."
      />

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {featuredProjects.map((project, i) => (
          <motion.div
            key={`${project.client ?? "project"}-${project.title}`}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.45, delay: i * 0.08 }}
          >
            <Card className="flex h-full flex-col">
              <div className="mb-3 flex items-center justify-between gap-2">
                <span
                  className={`text-xs font-semibold uppercase tracking-wider ${
                    project.type === "agency" ? "text-accent" : "text-accent-violet"
                  }`}
                >
                  {project.type === "agency" ? "Client build" : "Studio"}
                </span>
                {project.result && (
                  <span className="rounded-full bg-surface px-2.5 py-0.5 text-xs font-medium text-accent">
                    {project.result}
                  </span>
                )}
              </div>
              {project.client ? (
                <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-text-secondary/90">
                  {project.client}
                </p>
              ) : null}
              <h3 className="heading-display text-lg font-bold text-text-primary">
                {project.title}
              </h3>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-text-secondary">
                {project.description}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {project.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-border bg-surface px-2.5 py-0.5 text-xs text-text-secondary"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="mt-12 flex justify-center">
        <Button href="/case-studies" variant="dark" size="lg" showLiveDot>
          All case studies
        </Button>
      </div>
    </section>
  );
}
