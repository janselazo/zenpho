"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { portfolioProjects, type ProjectCategory } from "@/lib/data";
import {
  WORK_CATEGORY_FILTER_ACTIVE_CLASS,
  WORK_CATEGORY_LABELS,
  WORK_CATEGORY_TYPE_PILL_CLASS,
  workResultPillClass,
} from "@/lib/marketing/work-pill-styles";
import SectionHeading from "@/components/ui/SectionHeading";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";

const categoryFilters: { id: ProjectCategory | "all"; label: string }[] = [
  { id: "all", label: "All" },
  { id: "mobile-app", label: "Mobile App" },
  { id: "web-app", label: "Web App" },
  { id: "website", label: "Website" },
];

function filterChipClass(
  id: ProjectCategory | "all",
  selected: boolean
): string {
  const base =
    "rounded-full border px-4 py-2 text-xs font-medium transition-all ";
  if (!selected) {
    return `${base}border-border bg-white text-text-secondary hover:border-accent/35 dark:bg-zinc-900/40 dark:hover:border-accent/40`;
  }
  if (id === "all") {
    return `${base}border-accent bg-accent/10 text-accent`;
  }
  return `${base}${WORK_CATEGORY_FILTER_ACTIVE_CLASS[id]}`;
}

export default function PortfolioGrid() {
  const [categoryFilter, setCategoryFilter] = useState<
    ProjectCategory | "all"
  >("all");

  const filteredProjects = useMemo(() => {
    return portfolioProjects.filter((p) => {
      return categoryFilter === "all" || p.category === categoryFilter;
    });
  }, [categoryFilter]);

  return (
    <section
      id="projects"
      className="mx-auto max-w-7xl bg-gradient-to-b from-slate-50/90 via-white to-violet-50/35 px-6 py-32 dark:from-zinc-950 dark:via-zinc-950 dark:to-violet-950/20 lg:px-8"
    >
      <SectionHeading
        label="Case studies"
        title="Selected"
        titleAccent="work"
        titleAccentInline
        description="Sampling of AI-assisted products we have shipped alongside founders — no cookie-cutter portfolios or generic local retainers."
      />

      <div className="mb-12 flex flex-wrap justify-center gap-2">
        {categoryFilters.map((filter) => (
          <button
            key={filter.id}
            type="button"
            onClick={() => setCategoryFilter(filter.id)}
            className={filterChipClass(filter.id, categoryFilter === filter.id)}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {filteredProjects.length === 0 ? (
        <p className="text-center text-sm text-text-secondary">
          No case studies in this category yet —{" "}
          <Link href="/contact" className="font-medium text-accent hover:underline">
            tell us about your project
          </Link>
          .
        </p>
      ) : null}

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filteredProjects.map((project, i) => (
          <motion.div
            key={`${project.client ?? project.title}-${project.type}-${project.category}`}
            initial={{ opacity: 1, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.5, delay: i * 0.05 }}
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
                      project.type === "agency"
                        ? "bg-accent"
                        : "bg-accent-violet"
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
              <h3 className="text-lg font-semibold text-text-primary">
                {project.title}
              </h3>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-text-secondary">
                {project.description}
              </p>
              {(project.result || project.metrics) && (
                <div className="mt-3">
                  <span
                    className={workResultPillClass(
                      project.result ?? project.metrics ?? ""
                    )}
                  >
                    {project.result ?? project.metrics}
                  </span>
                </div>
              )}
            </Card>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
