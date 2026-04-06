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

export default function CaseStudies() {
  const agencyProjects = featuredProjects.filter((p) => p.type === "agency");

  return (
    <section className="mx-auto max-w-7xl px-6 py-32 lg:px-8">
      <SectionHeading
        label="Results"
        title="Client"
        titleAccent="outcomes"
        titleAccentInline
        description="Web apps, mobile apps, and marketing sites — real customers, real production systems, not slide-deck milestones."
      />

      <div className="grid gap-8 lg:grid-cols-2">
        {agencyProjects.map((project, i) => (
          <motion.div
            key={`${project.client ?? "project"}-${project.title}`}
            initial={{ opacity: 1, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.5, delay: i * 0.1 }}
          >
            <Card className="flex h-full flex-col">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-semibold uppercase tracking-widest text-accent">
                  Case study
                </span>
                <div className="flex flex-wrap items-center justify-end gap-2">
                  <span className={WORK_CATEGORY_TYPE_PILL_CLASS[project.category]}>
                    {WORK_CATEGORY_LABELS[project.category]}
                  </span>
                  {project.result ? (
                    <span className={workResultPillClass(project.result)}>
                      {project.result}
                    </span>
                  ) : null}
                </div>
              </div>
              {project.client ? (
                <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-text-secondary">
                  {project.client}
                </p>
              ) : null}
              <h3 className="text-xl font-semibold text-text-primary">
                {project.title}
              </h3>
              <p className="mt-3 flex-1 text-sm leading-relaxed text-text-secondary">
                {project.description}
              </p>
            </Card>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
