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
            AI projects
          </p>
          <h2 className="mt-3 heading-display text-2xl font-bold text-text-primary sm:text-3xl">
            Start with a proof of concept
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-text-secondary sm:text-base">
            AI work is higher-variance than traditional software: models behave
            differently on real data, edge cases show up late, and integration
            cost is hard to estimate upfront. A focused PoC—often on the order
            of roughly{" "}
            <span className="font-medium text-text-primary">10% of a full
            program budget</span>
            —lets you validate feasibility, test with real users, and make a
            confident go/no-go before the larger build.
          </p>
          <ul className="mt-6 space-y-3 text-sm text-text-secondary">
            <li className="flex gap-3">
              <span className="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-accent-violet" />
              Stress-test the hardest technical assumptions first
            </li>
            <li className="flex gap-3">
              <span className="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-accent-violet" />
              Get a working slice in weeks, not months of blind commitment
            </li>
            <li className="flex gap-3">
              <span className="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-accent-violet" />
              Full build carries less risk once feasibility is grounded in data
            </li>
          </ul>
          <div className="mt-8">
            <Button href="/contact" variant="primary" size="lg">
              Discuss your AI project
            </Button>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
