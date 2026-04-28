"use client";

import { motion } from "framer-motion";
import Button from "@/components/ui/Button";

/** Homepage closing CTA (single primary action). */
export default function HomeFinalCTA() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
      <motion.div
        initial={{ opacity: 1, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.05, margin: "0px 0px 160px 0px" }}
        transition={{ duration: 0.5 }}
        className="relative overflow-hidden rounded-2xl border border-border bg-white p-8 text-center shadow-soft-lg sm:rounded-3xl sm:p-12 lg:p-16"
      >
        <div className="pointer-events-none absolute inset-0 opacity-50">
          <div className="absolute inset-0 scifi-grid" />
        </div>
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -right-24 -top-24 h-64 w-64 rounded-full bg-accent/12 blur-3xl" />
          <div className="absolute -bottom-20 -left-16 h-56 w-56 rounded-full bg-accent-violet/10 blur-3xl" />
        </div>

        <div className="relative z-10">
          <h2 className="heading-display text-balance text-3xl font-bold tracking-tight text-text-primary sm:text-4xl lg:text-5xl lg:leading-tight">
            Have an idea for an{" "}
            <span className="text-accent">AI-powered MVP?</span>
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-sm leading-relaxed text-text-secondary sm:mt-5 sm:text-base">
            Let&apos;s map out what a focused version one could look like and what
            can realistically be built in 2 weeks.
          </p>
          <div className="mx-auto mt-8 flex justify-center sm:mt-10">
            <Button href="/booking" variant="primary" size="lg">
              Book an MVP Strategy Call
            </Button>
          </div>
        </div>
      </motion.div>
    </section>
  );
}
