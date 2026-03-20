"use client";

import { motion } from "framer-motion";

export default function ServicesHero() {
  return (
    <section className="relative flex min-h-[70vh] items-center justify-center overflow-hidden pt-24">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/4 top-1/3 h-72 w-72 rounded-full bg-accent/10 blur-[90px]" />
        <div className="absolute bottom-1/4 right-1/4 h-64 w-64 rounded-full bg-accent-warm/10 blur-[90px]" />
      </div>

      <div className="relative z-10 mx-auto max-w-4xl px-6 text-center">
        <motion.span
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="mb-5 inline-block text-xs font-semibold uppercase tracking-widest text-accent"
        >
          Services & pricing
        </motion.span>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.06 }}
          className="text-4xl font-semibold leading-tight tracking-tight text-text-primary sm:text-5xl lg:text-6xl"
        >
          Advisory when you want a steady partner,
          <br />
          <span className="bg-gradient-to-r from-accent-violet to-accent bg-clip-text text-transparent">
            builds when you need delivery
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.14 }}
          className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-text-secondary"
        >
          Retainers for architecture, roadmap, and growth rhythm—alongside scoped
          development for AI features and full products. Pick the shape that
          matches where you are today.
        </motion.p>
      </div>
    </section>
  );
}
