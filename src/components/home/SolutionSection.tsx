"use client";

import { motion } from "framer-motion";
import SectionHeading, {
  SECTION_EYEBROW_COMPACT_CLASSNAME,
} from "@/components/ui/SectionHeading";
import Card from "@/components/ui/Card";

const pillars = [
  {
    eyebrow: "Scope",
    body: "We help you define the core workflow, must-have features, user journey, and MVP roadmap.",
    initial: "1",
    badgeClass: "bg-accent text-white",
  },
  {
    eyebrow: "Build",
    body: "We design and develop your MVP using modern AI-assisted development workflows and scalable product architecture.",
    initial: "2",
    badgeClass: "bg-accent-violet text-white",
  },
  {
    eyebrow: "Launch",
    body: "We help you position, launch, track, and grow your MVP with landing pages, analytics, outreach, and growth experiments.",
    initial: "3",
    badgeClass: "bg-accent-warm text-white",
  },
] as const;

export default function SolutionSection() {
  return (
    <section className="relative border-t border-border/60 bg-surface/70 py-24 lg:py-28">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <SectionHeading
          title="From idea to MVP"
          titleAccent="to launch."
          align="center"
          description={
            <p className="!text-base sm:!text-lg">
              Zenpho combines product strategy, AI-assisted development, UX/UI
              design, and growth marketing to help founders build and launch
              technology products faster.
            </p>
          }
        />

        <div className="mt-4 grid gap-6 sm:mt-6 md:grid-cols-3">
          {pillars.map((pillar, i) => (
            <motion.div
              key={pillar.eyebrow}
              initial={{ opacity: 1, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.12 }}
              transition={{ duration: 0.45, delay: i * 0.08 }}
            >
              <Card className="flex h-full flex-col border-border/80 bg-white p-8 shadow-soft lg:p-9">
                <div
                  className={`mb-5 flex h-11 w-11 items-center justify-center rounded-full text-sm font-bold shadow-sm ${pillar.badgeClass}`}
                  aria-hidden
                >
                  {pillar.initial}
                </div>
                <span className={`${SECTION_EYEBROW_COMPACT_CLASSNAME} mb-3`}>
                  {pillar.eyebrow}
                </span>
                <p className="text-sm leading-relaxed text-text-secondary">
                  {pillar.body}
                </p>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
