"use client";

import { motion } from "framer-motion";
import Button from "@/components/ui/Button";

export default function PricingAIPocCallout() {
  return (
    <section className="border-b border-border bg-surface/80">
      <div className="mx-auto max-w-6xl px-6 py-16 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-2">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.25 }}
            transition={{ duration: 0.45 }}
            className="rounded-3xl border border-border bg-white p-8 shadow-soft sm:p-10"
          >
            <p className="text-xs font-semibold uppercase tracking-wider text-accent">
              Development
            </p>
            <h2 className="mt-3 heading-display text-2xl font-bold text-text-primary sm:text-3xl">
              Validate the build first
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-text-secondary sm:text-base">
              The{" "}
              <span className="font-medium text-text-primary">$1,999 Product MVP</span>{" "}
              is scoped to ship a real first version — web, mobile, or store — not a
              year-long bet. Not sure what to cut? Start with a{" "}
              <span className="font-medium text-text-primary">
                $150 Development strategy
              </span>{" "}
              hour and map the smallest release that still proves demand.
            </p>
            <ul className="mt-6 space-y-3 text-sm text-text-secondary">
              <li className="flex gap-3">
                <span className="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-accent" />
                Align on users, stack, and what “done” means before code
              </li>
              <li className="flex gap-3">
                <span className="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-accent" />
                Ship something testable, then use Development Scale for weekly
                momentum
              </li>
              <li className="flex gap-3">
                <span className="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-accent" />
                Pause Scale when your roadmap shifts — same flexibility as always
              </li>
            </ul>
            <div className="mt-8">
              <Button href="/contact#booking" variant="primary" size="lg">
                Book a Development call
              </Button>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.25 }}
            transition={{ duration: 0.45, delay: 0.06 }}
            className="rounded-3xl border border-border bg-white p-8 shadow-soft sm:p-10"
          >
            <p className="text-xs font-semibold uppercase tracking-wider text-accent-green">
              Growth
            </p>
            <h2 className="mt-3 heading-display text-2xl font-bold text-text-primary sm:text-3xl">
              Validate the metric first
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-text-secondary sm:text-base">
              The{" "}
              <span className="font-medium text-text-primary">$1,999 Growth sprint</span>{" "}
              is a two-week push: baseline, hypothesis, ship 1–2 experiments, read
              results. Unsure where leakage is? Book a{" "}
              <span className="font-medium text-text-primary">
                $150 Growth strategy
              </span>{" "}
              hour to prioritize funnel, retention, or monetization before a sprint.
            </p>
            <ul className="mt-6 space-y-3 text-sm text-text-secondary">
              <li className="flex gap-3">
                <span className="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-accent-green" />
                Honest baseline — not dashboards nobody uses
              </li>
              <li className="flex gap-3">
                <span className="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-accent-green" />
                Shipped tests with clear success criteria
              </li>
              <li className="flex gap-3">
                <span className="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-accent-green" />
                Growth Scale for weekly experiment rhythm when you’re ready
              </li>
            </ul>
            <div className="mt-8">
              <Button
                href="/contact#booking"
                variant="primary"
                size="lg"
                className="!border-0 !bg-accent-green !text-white shadow-sm hover:!bg-emerald-700 hover:!shadow-md"
              >
                Book a Growth call
              </Button>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
