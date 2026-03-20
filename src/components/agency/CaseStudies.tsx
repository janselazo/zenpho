"use client";

import { motion } from "framer-motion";
import { featuredProjects } from "@/lib/data";
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
        description="SaaS web apps, ecommerce, and websites where the goal was something real customers could use—not a slide deck milestone."
      />

      <div className="grid gap-8 lg:grid-cols-2">
        {agencyProjects.map((project, i) => (
          <motion.div
            key={`${project.client ?? "project"}-${project.title}`}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.5, delay: i * 0.1 }}
          >
            <Card className="flex h-full flex-col">
              <div className="mb-4 flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-widest text-accent">
                  Case study
                </span>
                {project.result && (
                  <span className="rounded-full bg-accent/10 px-3 py-1 text-xs font-medium text-accent">
                    {project.result}
                  </span>
                )}
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
              <div className="mt-4 flex flex-wrap gap-2">
                {project.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-surface-light px-3 py-1 text-xs text-text-secondary"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </Card>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
