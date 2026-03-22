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
          Most agencies build what you ask for. We build what you need to win.
          From concept to launch, every decision is made with growth in mind
          — so your product doesn&apos;t just work, it scales.{" "}
          <span className="font-medium text-text-primary">
            First working version in 2 weeks.
          </span>
        </p>
      </motion.div>
    </section>
  );
}
