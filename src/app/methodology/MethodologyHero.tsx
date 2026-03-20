"use client";

import { motion } from "framer-motion";
import { experienceStats } from "@/lib/data";

export default function MethodologyHero() {
  return (
    <section className="relative flex min-h-[80vh] items-center justify-center overflow-hidden pt-24">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/3 top-1/4 h-80 w-80 rounded-full bg-accent/10 blur-[90px]" />
        <div className="absolute bottom-1/4 right-1/3 h-72 w-72 rounded-full bg-accent-warm/10 blur-[90px]" />
      </div>

      <div className="relative z-10 mx-auto max-w-4xl px-6 text-center">
        <motion.span
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="mb-5 inline-block text-xs font-semibold uppercase tracking-widest text-accent"
        >
          Methodology
        </motion.span>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.06 }}
          className="text-4xl font-semibold leading-tight tracking-tight text-text-primary sm:text-5xl lg:text-6xl"
        >
          Build for learning,
          <br />
          <span className="bg-gradient-to-r from-accent via-accent-violet to-accent-warm bg-clip-text text-transparent">
            architect for scale
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.14 }}
          className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-text-secondary"
        >
          Eight years shipping software taught me that growth and reliability
          are design choices—especially when models, data, and UX all have to
          move together.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.22 }}
          className="mx-auto mt-16 grid max-w-2xl grid-cols-2 gap-3 sm:grid-cols-4"
        >
          {experienceStats.map((stat, i) => (
            <div
              key={stat.label}
              className="rounded-2xl border border-border bg-white px-3 py-3 text-center shadow-sm"
            >
              <div
                className={`text-xl font-semibold sm:text-2xl ${
                  i % 3 === 0
                    ? "text-accent"
                    : i % 3 === 1
                      ? "text-accent-violet"
                      : "text-accent-warm"
                }`}
              >
                {stat.value}
              </div>
              <div className="mt-0.5 text-[10px] font-medium uppercase tracking-wide text-text-secondary">
                {stat.label}
              </div>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
