"use client";

import { motion } from "framer-motion";
import Button from "@/components/ui/Button";
import { SECTION_EYEBROW_CLASSNAME } from "@/components/ui/SectionHeading";

export default function StudioPageCTA() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:pb-24 lg:px-8">
      <motion.div
        initial={{ opacity: 1, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.05 }}
        transition={{ duration: 0.5 }}
        className="relative overflow-hidden rounded-2xl border border-border bg-white p-8 text-center shadow-soft-lg sm:rounded-3xl sm:p-12 lg:p-16"
      >
        <div className="pointer-events-none absolute inset-0 opacity-45">
          <div className="absolute inset-0 scifi-grid" />
        </div>
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -right-20 -top-20 h-60 w-60 rounded-full bg-accent-warm/15 blur-3xl" />
        </div>
        <div className="relative z-10">
          <div className="mb-4 flex justify-center">
            <span className={SECTION_EYEBROW_CLASSNAME}>Next step</span>
          </div>
          <h2 className="heading-display text-balance text-3xl font-bold tracking-tight text-text-primary sm:text-4xl lg:text-5xl">
            Want to build with Zenpho?
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-sm leading-relaxed text-text-secondary sm:text-base">
            If you are building a tech startup or ecommerce brand and need a
            product shipped, we can help you build the first version and launch
            it to the market.
          </p>
          <div className="mx-auto mt-8 flex justify-center">
            <Button href="/booking" variant="primary" size="lg">
              Book an MVP Strategy Call
            </Button>
          </div>
        </div>
      </motion.div>
    </section>
  );
}
