"use client";

import { motion } from "framer-motion";
import Button from "@/components/ui/Button";
import {
  homeClearGrowthFinalCtaBody,
  homeClearGrowthFinalCtaHeadline,
} from "@/lib/home-clear-growth";

const CTA_ID = "home-clear-growth-cta-heading";

export default function HomeClearGrowthFinalCta() {
  return (
    <section
      className="relative w-full bg-background pt-12 pb-16 sm:pt-14 sm:pb-20 lg:pb-24"
      aria-labelledby={CTA_ID}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 1, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.08, margin: "0px 0px 120px 0px" }}
          transition={{ duration: 0.45 }}
          className="relative overflow-hidden rounded-[2rem] border border-border bg-white p-8 text-center shadow-soft-lg ring-1 ring-black/[0.04] sm:p-10 lg:p-14 dark:border-zinc-700/80 dark:bg-zinc-900/50"
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
