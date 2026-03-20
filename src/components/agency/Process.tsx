"use client";

import { motion } from "framer-motion";
import { processSteps } from "@/lib/data";
import SectionHeading from "@/components/ui/SectionHeading";

export default function Process() {
  return (
    <section className="mx-auto max-w-7xl px-6 py-32 lg:px-8">
      <SectionHeading
        label="Process"
        title="How we work"
        titleAccent="together"
        titleAccentInline
        description="Clear phases so you always know what’s next—especially important when models, data, and UX evolve in parallel."
      />

      <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
        {processSteps.map((step, i) => (
          <motion.div
            key={step.number}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.5, delay: i * 0.1 }}
            className="relative"
          >
            <span className="mb-4 block font-mono text-5xl font-bold text-accent/15">
              {step.number}
            </span>
            <h3 className="text-lg font-semibold text-text-primary">
              {step.title}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-text-secondary">
              {step.description}
            </p>

            {i < processSteps.length - 1 && (
              <div className="absolute right-0 top-8 hidden h-px w-8 bg-gradient-to-r from-border to-transparent lg:block" />
            )}
          </motion.div>
        ))}
      </div>
    </section>
  );
}
