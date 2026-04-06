"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { portfolioProjects, type ProjectCategory } from "@/lib/data";
import SectionHeading from "@/components/ui/SectionHeading";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";

const categoryFilters: { id: ProjectCategory | "all"; label: string }[] = [
  { id: "all", label: "All" },
  { id: "mobile-app", label: "Mobile App" },
  { id: "web-app", label: "Web App" },
  { id: "website", label: "Website" },
];

/** Category chips (right-aligned) + filter selected state + result pill. */
const CATEGORY_STYLES: Record<
  ProjectCategory,
  { typePill: string; filterActive: string; resultPill: string }
> = {
  "mobile-app": {
    typePill:
      "border border-emerald-200/90 bg-emerald-50 text-emerald-900 dark:border-emerald-800/55 dark:bg-emerald-950/45 dark:text-emerald-100",
    filterActive:
      "border-emerald-500/80 bg-emerald-500/10 text-emerald-900 dark:border-emerald-500/45 dark:bg-emerald-950/55 dark:text-emerald-100",
    resultPill:
      "border border-emerald-200/90 bg-emerald-50 text-emerald-900 dark:border-emerald-800/55 dark:bg-emerald-950/45 dark:text-emerald-100",
  },
  "web-app": {
    typePill:
      "border border-sky-200/90 bg-sky-50 text-sky-900 dark:border-sky-800/55 dark:bg-sky-950/45 dark:text-sky-100",
    filterActive:
      "border-sky-500/80 bg-sky-500/10 text-sky-900 dark:border-sky-500/45 dark:bg-sky-950/55 dark:text-sky-100",
    resultPill:
      "border border-sky-200/90 bg-sky-50 text-sky-900 dark:border-sky-800/55 dark:bg-sky-950/45 dark:text-sky-100",
  },
  website: {
    typePill:
      "border border-violet-200/90 bg-violet-50 text-violet-900 dark:border-violet-800/55 dark:bg-violet-950/45 dark:text-violet-100",
    filterActive:
      "border-violet-500/80 bg-violet-500/10 text-violet-900 dark:border-violet-500/45 dark:bg-violet-950/55 dark:text-violet-100",
    resultPill:
      "border border-violet-200/90 bg-violet-50 text-violet-900 dark:border-violet-800/55 dark:bg-violet-950/45 dark:text-violet-100",
  },
};

const TAG_CHIP_ROTATION = [
  "border-sky-200/70 bg-sky-50/90 text-sky-900 dark:border-sky-800/45 dark:bg-sky-950/35 dark:text-sky-200",
  "border-amber-200/70 bg-amber-50/90 text-amber-950 dark:border-amber-800/45 dark:bg-amber-950/30 dark:text-amber-100",
  "border-slate-200/80 bg-slate-50 text-slate-800 dark:border-slate-600/50 dark:bg-slate-800/55 dark:text-slate-100",
] as const;

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
  return `${base}${CATEGORY_STYLES[id].filterActive}`;
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
        description="Some of the products we've designed, built, and launched for founders around the world."
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
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${CATEGORY_STYLES[project.category].typePill}`}
                  >
                    {categoryFilters.find((f) => f.id === project.category)
                      ?.label ?? project.category}
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
                    className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${CATEGORY_STYLES[project.category].resultPill}`}
                  >
                    {project.result ?? project.metrics}
                  </span>
                </div>
              )}
              <div className="mt-4 flex flex-wrap gap-2">
                {project.tags.map((tag, ti) => (
                  <span
                    key={tag}
                    className={`rounded-full border px-2 py-1 text-[10px] font-medium ${TAG_CHIP_ROTATION[ti % TAG_CHIP_ROTATION.length]}`}
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
