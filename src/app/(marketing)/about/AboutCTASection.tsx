"use client";

import { motion } from "framer-motion";
import Button from "@/components/ui/Button";

export default function AboutCTASection() {
  return (
    <section className="mx-auto max-w-7xl px-4 pb-24 pt-4 sm:px-6 lg:px-8">
      <motion.div
        initial={{ opacity: 1, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.12 }}
        transition={{ duration: 0.45 }}
        className="relative overflow-hidden rounded-2xl border border-border bg-white p-8 text-center shadow-soft-lg sm:rounded-3xl sm:p-12 lg:p-14"
      >
        <div className="pointer-events-none absolute inset-0 opacity-40">
          <div className="absolute inset-0 scifi-grid" />
        </div>
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-accent/10 blur-3xl" />
          <div className="absolute -bottom-16 -left-12 h-48 w-48 rounded-full bg-accent-violet/10 blur-3xl" />
        </div>

        <div className="relative z-10">
          <h2 className="heading-display text-balance text-3xl font-bold tracking-tight text-text-primary sm:text-4xl">
            See where revenue is leaking
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-base leading-relaxed text-text-secondary sm:mt-5">
            Run a Revenue Leak Audit on your business, or book a call and we&apos;ll align on the right plan—setup,
            monthly growth, or full partnership.
          </p>
          <div className="mx-auto mt-9 flex max-w-md flex-col items-stretch justify-center gap-3 sm:mx-auto sm:max-w-none sm:flex-row sm:gap-4">
            <Button href="/revenue" variant="primary" size="lg" className="sm:min-w-[200px]">
              Run Revenue Leak Audit
            </Button>
            <Button href="/booking" variant="dark" size="lg" showLiveDot className="sm:min-w-[200px]">
              Book a growth call
            </Button>
          </div>
        </div>
      </motion.div>
    </section>
  );
}
