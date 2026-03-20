"use client";

import { motion } from "framer-motion";

export default function AboutIntro() {
  return (
    <section className="relative mx-auto max-w-3xl px-6 py-16 lg:px-8">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.3 }}
        transition={{ duration: 0.5 }}
        className="text-center"
      >
        <p className="text-lg leading-relaxed text-text-secondary sm:text-xl">
          For nine years I&apos;ve shipped custom software for startups and
          larger teams. Today that work centers on{" "}
          <span className="font-medium text-text-primary">
            practical AI in production
          </span>
          —not slideware—so your product stays reliable, measurable, and easy to
          improve.
        </p>
      </motion.div>
    </section>
  );
}
