"use client";

import { motion } from "framer-motion";
import { methodologyPillars } from "@/lib/data";
import SectionHeading from "@/components/ui/SectionHeading";

export default function Pillars() {
  return (
    <section className="border-t border-border bg-surface">
      <div className="mx-auto max-w-7xl px-6 py-32 lg:px-8">
        <SectionHeading
          label="Pillars"
          title="The Four Pillars"
          titleAccent="of My Methodology"
          description="Principles that guide every decision, from initial architecture to production operations."
        />

        <div className="grid gap-12 lg:grid-cols-2">
          {methodologyPillars.map((pillar, i) => (
            <motion.div
              key={pillar.number}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="rounded-2xl border border-border bg-background p-8"
            >
              <div className="mb-4 flex items-center gap-4">
                <span className="font-mono text-4xl font-bold text-accent/20">
                  {pillar.number}
                </span>
                <h3 className="text-xl font-bold text-text-primary">
                  {pillar.title}
                </h3>
              </div>
              <p className="mb-6 leading-relaxed text-text-secondary">
                {pillar.description}
              </p>
              <ul className="space-y-3">
                {pillar.principles.map((principle) => (
                  <li
                    key={principle}
                    className="flex items-start gap-3 text-sm text-text-secondary"
                  >
                    <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-accent" />
                    {principle}
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
