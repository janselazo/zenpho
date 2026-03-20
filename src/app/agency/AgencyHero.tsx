"use client";

import { motion } from "framer-motion";
import Button from "@/components/ui/Button";
import { experienceStats } from "@/lib/data";

export default function AgencyHero() {
  return (
    <section className="hero-sky relative flex min-h-[80vh] items-center justify-center overflow-hidden pt-28">
      <div className="relative z-10 mx-auto max-w-4xl px-6 text-center">
        <motion.span
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="mb-5 inline-block rounded-full bg-white/90 px-5 py-2 text-xs font-bold uppercase tracking-widest text-accent-green shadow-soft ring-1 ring-accent-green/25"
        >
          Agency
        </motion.span>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.06 }}
          className="heading-display text-4xl font-bold leading-tight text-text-primary sm:text-5xl lg:text-6xl"
        >
          Custom AI software
          <br />
          <span className="text-accent">for serious teams</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.14 }}
          className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-text-secondary sm:text-lg"
        >
          I partner with product and operations leaders to ship agents,
          assistants, automations, and the apps around them—scoped for security,
          cost, and how your org actually adopts new tools.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.22 }}
          className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4"
        >
          <Button href="/contact" variant="primary" size="lg">
            Discuss a project
          </Button>
          <Button href="/services" variant="dark" size="lg" showLiveDot>
            Services & pricing
          </Button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.3 }}
          className="mx-auto mt-16 grid max-w-2xl grid-cols-2 gap-3 sm:grid-cols-4"
        >
          {experienceStats.map((stat, i) => (
            <div
              key={stat.label}
              className="rounded-3xl border border-border bg-white/95 px-3 py-4 text-center shadow-soft backdrop-blur-sm"
            >
              <div
                className={`heading-display text-xl font-bold sm:text-2xl ${
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
