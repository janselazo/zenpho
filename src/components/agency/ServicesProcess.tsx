"use client";

import { motion } from "framer-motion";
import { servicesPageProcessSteps } from "@/lib/data";
import SectionHeading from "@/components/ui/SectionHeading";

export default function ServicesProcess() {
  return (
    <section className="mx-auto max-w-7xl px-6 py-16 lg:px-8 lg:py-20">
      <SectionHeading
        className="!mb-8 sm:!mb-10"
        title="Simple, fast, and"
        titleAccent="founder-focused"
        align="center"
      />

      <div className="mx-auto mt-8 grid max-w-6xl gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {servicesPageProcessSteps.map((step, i) => (
          <motion.div
            key={step.number}
            initial={{ opacity: 1, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.08 }}
            transition={{ duration: 0.45, delay: i * 0.06 }}
            className="relative"
          >
            <span className="mb-4 block font-mono text-4xl font-bold text-accent/20 sm:text-5xl">
              {step.number}
            </span>
            <h3 className="text-lg font-semibold text-text-primary">
              {step.title}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-text-secondary">
              {step.description}
            </p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
