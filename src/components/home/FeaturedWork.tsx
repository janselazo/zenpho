"use client";

import { motion } from "framer-motion";
import { featuredProjects } from "@/lib/data";
import {
  WORK_CATEGORY_LABELS,
  WORK_CATEGORY_TYPE_PILL_CLASS,
  workResultPillClass,
} from "@/lib/marketing/work-pill-styles";
import SectionHeading from "@/components/ui/SectionHeading";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";

export default function FeaturedWork() {
  return (
    <section className="relative mx-auto max-w-7xl px-6 py-24 lg:px-8">
      <SectionHeading
        label="Featured case studies"
        title="Recent"
        titleAccent="outcomes"
        titleAccentInline
        description="Founder-facing MVPs in production — product-led builds, not page-only launches."
      />

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {featuredProjects.map((project, i) => (
          <motion.div
            key={`${project.client ?? "project"}-${project.title}`}
            initial={{ opacity: 1, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.05, margin: "0px 0px 160px 0px" }}
            transition={{ duration: 0.45, delay: i * 0.08 }}
          >
            <Card className="flex h-full flex-col border-border/80 bg-white/90 shadow-soft backdrop-blur-[2px] dark:border-zinc-800/80 dark:bg-zinc-900/60">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <span
                  className={`inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide ${
                    project.type === "agency"
                      ? "text-accent"
                      : "text-accent-violet"
                  }`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      project.type === "agency" ? "bg-accent" : "bg-accent-violet"
                    }`}
                  />
                  {project.type === "agency" ? "Client" : "Studio"}
                </span>
                <div className="flex flex-wrap items-center justify-end gap-2">
                  {project.status ? <Badge status={project.status} /> : null}
                  <span className={WORK_CATEGORY_TYPE_PILL_CLASS[project.category]}>
                    {WORK_CATEGORY_LABELS[project.category]}
                  </span>
                </div>
              </div>
              {project.client ? (
                <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-text-secondary/90">
                  {project.client}
                </p>
              ) : null}
              <h3 className="heading-display text-lg font-bold text-text-primary">
                {project.title}
              </h3>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-text-secondary">
                {project.description}
              </p>
              {project.result ? (
                <div className="mt-3">
                  <span className={workResultPillClass(project.result)}>
                    {project.result}
                  </span>
                </div>
              ) : null}
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
