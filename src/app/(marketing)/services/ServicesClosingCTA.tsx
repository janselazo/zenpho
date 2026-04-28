"use client";

import { motion } from "framer-motion";
import Button from "@/components/ui/Button";

export default function ServicesClosingCTA() {
  return (
    <section className="mx-auto max-w-7xl px-4 pb-24 pt-8 sm:px-6 lg:px-8">
      <motion.div
        initial={{ opacity: 1, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.12 }}
        transition={{ duration: 0.45 }}
        className="relative mx-auto max-w-2xl overflow-hidden rounded-2xl border border-border bg-white p-8 text-center shadow-soft-lg sm:rounded-3xl sm:p-12"
      >
        <div className="pointer-events-none absolute inset-0 opacity-35">
          <div className="absolute inset-0 scifi-grid" />
        </div>
        <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-accent/10 blur-3xl" />
        <div className="relative z-10">
          <h2 className="heading-display text-balance text-2xl font-bold tracking-tight text-text-primary sm:text-3xl lg:text-4xl">
            Not sure what your MVP should include?
          </h2>
          <p className="mx-auto mt-4 max-w-md text-base leading-relaxed text-text-secondary">
            Book a strategy call and we&apos;ll help you define a focused version
            one.
          </p>
          <div className="mt-8 flex justify-center">
            <Button href="/booking" variant="primary" size="lg">
              Book an MVP Strategy Call
            </Button>
          </div>
        </div>
      </motion.div>
    </section>
  );
}
