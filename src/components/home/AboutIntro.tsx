"use client";

import { motion } from "framer-motion";

export default function AboutIntro() {
  return (
    <section className="relative mx-auto max-w-3xl px-6 pb-16 pt-8 lg:px-8">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.3 }}
        transition={{ duration: 0.5 }}
        className="text-center"
      >
        <p className="text-lg leading-relaxed text-text-secondary sm:text-xl">
          <span className="font-medium text-text-primary">Who it&apos;s for:</span>{" "}
          early-stage founders who need a focused MVP to test demand; teams who
          want help scoping, accelerating delivery, or adding AI; and companies
          that prefer{" "}
          <span className="font-medium text-text-primary">
            transparent pricing and predictable weekly output
          </span>
          . Nine years shipping software — now organized like a modern AI product
          studio, with Labs for products we own (like SoldTools).
        </p>
      </motion.div>
    </section>
  );
}
