"use client";

import { motion } from "framer-motion";
import { featuredProjects } from "@/lib/data";
import {
  WORK_CATEGORY_LABELS,
  WORK_CATEGORY_TYPE_PILL_CLASS,
  workResultPillClass,
} from "@/lib/marketing/work-pill-styles";
import { SECTION_EYEBROW_CLASSNAME } from "@/components/ui/SectionHeading";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";

export default function FeaturedWork() {
  return (
    <section
      id="featured-work"
      className="relative border-t border-border/40 bg-white/95 backdrop-blur-[2px]"
    >
      <div className="hero-sky relative overflow-hidden pb-24 pt-24 sm:pb-32 sm:pt-28">
        <div className="relative z-10 mx-auto flex max-w-3xl flex-col items-center px-6 text-center">
          <motion.span
            initial={{ opacity: 1, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.45 }}
            className={`mb-5 ${SECTION_EYEBROW_CLASSNAME}`}
          >
            Track record
          </motion.span>

          <motion.h2
            initial={{ opacity: 1, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.06 }}
            className="heading-display text-balance text-4xl font-bold leading-[1.12] tracking-tight text-text-primary sm:text-5xl sm:leading-[1.1] lg:text-6xl lg:leading-[1.08]"
          >
            <span className="block text-text-primary">We ship our own products</span>
            <span className="mt-1 block text-accent">Same standards as founder work</span>
          </motion.h2>

          <motion.p
            initial={{ opacity: 1, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.45, delay: 0.14 }}
            className="mx-auto mt-8 max-w-xl text-base font-medium leading-relaxed text-pretty text-text-primary/80 sm:mt-9 sm:text-lg"
          >
            Products we operate on our own roadmap — SoldTools lives here — the
            same accountability we promise on founder engagements.
          </motion.p>

          <motion.div
            initial={{ opacity: 1, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.45, delay: 0.22 }}
            className="mt-11 flex w-full max-w-md flex-col items-stretch justify-center gap-3 sm:mt-12 sm:flex-row sm:items-center sm:justify-center sm:gap-4"
          >
            <Button
              href="/case-studies"
              variant="primary"
              size="lg"
              className="whitespace-nowrap"
            >
              Explore concepts
            </Button>
            <Button
              href="/booking"
              variant="dark"
              size="lg"
              showLiveDot
              className="whitespace-nowrap"
            >
              Book a Call
            </Button>
          </motion.div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-6 pb-24 lg:px-8 lg:pb-28">
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
      </div>
    </section>
  );
}
