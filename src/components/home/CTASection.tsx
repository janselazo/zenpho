"use client";

import { motion } from "framer-motion";
import Button from "@/components/ui/Button";
import { SECTION_EYEBROW_CLASSNAME } from "@/components/ui/SectionHeading";

export default function CTASection() {
  return (
    <section className="mx-auto max-w-7xl px-6 py-24 lg:px-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.3 }}
        transition={{ duration: 0.5 }}
        className="relative overflow-hidden rounded-3xl border border-border bg-white p-12 text-center shadow-soft-lg lg:p-16"
      >
        <div className="pointer-events-none absolute inset-0 opacity-50">
          <div className="absolute inset-0 scifi-grid" />
        </div>
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -right-24 -top-24 h-64 w-64 rounded-full bg-accent/12 blur-3xl" />
          <div className="absolute -bottom-20 -left-16 h-56 w-56 rounded-full bg-accent-violet/10 blur-3xl" />
        </div>

        <div className="relative z-10">
          <div className="mb-5 flex justify-center">
            <span className={SECTION_EYEBROW_CLASSNAME}>Next step</span>
          </div>
          <h2 className="heading-display text-3xl font-bold tracking-tight text-text-primary sm:text-4xl lg:text-5xl lg:leading-tight">
            <span className="block">Tell me what you&apos;re</span>
            <span className="mt-1 block text-accent">building</span>
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-sm leading-relaxed text-text-secondary sm:text-base">
            Share a short brief—problem, users, timeline—and I&apos;ll respond
            with how I&apos;d approach discovery, a sensible first milestone, and
            what “done” should mean.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
            <Button href="/contact" variant="primary" size="lg">
              Get started
            </Button>
            <Button href="/services" variant="dark" size="lg" showLiveDot>
              Services & pricing
            </Button>
          </div>
        </div>
      </motion.div>
    </section>
  );
}
