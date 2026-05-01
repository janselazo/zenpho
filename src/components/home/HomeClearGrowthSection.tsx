"use client";

import { motion } from "framer-motion";
import Button from "@/components/ui/Button";
import {
  homeClearGrowthClosing,
  homeClearGrowthFinalCtaBody,
  homeClearGrowthFinalCtaHeadline,
  homeClearGrowthHeadline,
  homeClearGrowthIntro,
  homeClearGrowthMetrics,
} from "@/lib/home-clear-growth";

const MAIN_ID = "home-clear-growth-heading";
const CTA_ID = "home-clear-growth-cta-heading";

export default function HomeClearGrowthSection() {
  return (
    <section
      id="clear-growth"
      className="relative w-full border-t border-border/50 bg-background py-16 sm:py-20 lg:py-24"
      aria-labelledby={MAIN_ID}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="rounded-[2rem] border border-slate-200/90 bg-gradient-to-b from-slate-50/90 via-background to-background p-8 shadow-soft ring-1 ring-black/[0.04] sm:p-10 lg:p-12 dark:border-slate-800/80 dark:from-slate-950/40 dark:via-background dark:to-background">
          <div className="mx-auto max-w-3xl text-center">
            <h2
              id={MAIN_ID}
              className="heading-display text-balance text-3xl font-bold leading-[1.12] tracking-tight text-text-primary sm:text-4xl lg:text-[2.35rem] lg:leading-[1.08]"
            >
              {homeClearGrowthHeadline}
            </h2>
            <p className="mx-auto mt-5 max-w-2xl text-pretty text-base leading-relaxed text-text-secondary sm:text-lg">
              {homeClearGrowthIntro}
            </p>
          </div>

          <ul className="mx-auto mt-10 grid max-w-4xl list-none grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-3 lg:mt-12">
            {homeClearGrowthMetrics.map((line) => (
              <li
                key={line}
                className="flex items-center gap-3 rounded-2xl border border-border/80 bg-white/90 px-4 py-3.5 text-left text-sm font-medium leading-snug text-text-primary shadow-sm sm:text-[15px] dark:border-zinc-700/80 dark:bg-zinc-900/60"
              >
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent" aria-hidden />
                <span>{line}</span>
              </li>
            ))}
          </ul>

          <p className="mx-auto mt-12 max-w-2xl text-center text-base font-semibold leading-relaxed text-text-primary sm:mt-14 sm:text-lg">
            {homeClearGrowthClosing}
          </p>
        </div>

        <motion.div
          initial={{ opacity: 1, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.08, margin: "0px 0px 120px 0px" }}
          transition={{ duration: 0.45 }}
          className="relative mt-10 overflow-hidden rounded-[2rem] border border-border bg-white p-8 text-center shadow-soft-lg ring-1 ring-black/[0.04] sm:mt-12 sm:p-10 lg:p-14 dark:border-zinc-700/80 dark:bg-zinc-900/50"
          aria-labelledby={CTA_ID}
        >
          <div className="pointer-events-none absolute inset-0 opacity-50">
            <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-accent/10 blur-3xl" />
            <div className="absolute -bottom-16 -left-12 h-48 w-48 rounded-full bg-accent-violet/10 blur-3xl" />
          </div>
          <div className="relative z-10">
            <h2
              id={CTA_ID}
              className="heading-display text-balance text-2xl font-bold tracking-tight text-text-primary sm:text-3xl lg:text-4xl"
            >
              {homeClearGrowthFinalCtaHeadline}
            </h2>
            <p className="mx-auto mt-4 max-w-lg text-sm leading-relaxed text-text-secondary sm:mt-5 sm:text-base">
              {homeClearGrowthFinalCtaBody}
            </p>
            <div className="mx-auto mt-8 flex max-w-xl flex-col items-stretch justify-center gap-3 sm:flex-row sm:gap-4">
              <Button href="/revenue" variant="primary" size="lg" className="sm:flex-1">
                Run Revenue Leak Audit
              </Button>
              <Button href="/booking" variant="dark" size="lg" showLiveDot className="sm:flex-1">
                Book a growth call
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
