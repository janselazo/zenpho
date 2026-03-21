"use client";

import { motion } from "framer-motion";
import Button from "@/components/ui/Button";

export default function PricingAIPocCallout() {
  return (
    <section className="border-b border-border bg-surface/80">
      <div className="mx-auto max-w-4xl px-6 py-16 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.25 }}
          transition={{ duration: 0.45 }}
          className="rounded-3xl border border-border bg-white p-8 shadow-soft sm:p-10"
        >
          <p className="text-xs font-semibold uppercase tracking-wider text-accent">
            Validate first
          </p>
          <h2 className="mt-3 heading-display text-2xl font-bold text-text-primary sm:text-3xl">
            Start small, then scale
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-text-secondary sm:text-base">
            The{" "}
            <span className="font-medium text-text-primary">$1,999 Product MVP</span>{" "}
            is scoped to prove traction with 4–5 core features — not a year-long
            bet. Not sure where to cut scope? Book a{" "}
            <span className="font-medium text-text-primary">$50 strategy hour</span>{" "}
            first and we&apos;ll map the smallest release that still tells you
            something real.
          </p>
          <ul className="mt-6 space-y-3 text-sm text-text-secondary">
            <li className="flex gap-3">
              <span className="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-accent-violet" />
              Align on users, metrics, and what &quot;done&quot; means before build
            </li>
            <li className="flex gap-3">
              <span className="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-accent-violet" />
              Ship something testable, then iterate weekly on Scale if you want
              ongoing capacity
            </li>
            <li className="flex gap-3">
              <span className="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-accent-violet" />
              Pause or cancel the Scale subscription when your roadmap shifts
            </li>
          </ul>
          <div className="mt-8">
            <Button href="/contact" variant="primary" size="lg">
              Discuss your project
            </Button>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
