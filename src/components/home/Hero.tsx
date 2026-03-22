"use client";

import { motion } from "framer-motion";
import Button from "@/components/ui/Button";
import { SECTION_EYEBROW_CLASSNAME } from "@/components/ui/SectionHeading";
import { experienceStats } from "@/lib/data";

const clients = [
  "Taptok",
  "Apex Inspection Pro",
  "Craveclean",
  "TQMuch",
  "USRallyStripes",
];

export default function Hero() {
  return (
    <section className="hero-sky relative overflow-hidden pb-12 pt-32 sm:pt-36">
      <div className="relative z-10 mx-auto flex w-full max-w-4xl flex-col px-6 pb-2 pt-2 text-center sm:pt-4">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55 }}
        >
          <span className={`mb-4 ${SECTION_EYEBROW_CLASSNAME}`}>
            AI Product Studio
          </span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.06 }}
          className="heading-display text-4xl font-bold leading-[1.15] text-text-primary sm:text-5xl sm:leading-[1.12] lg:text-6xl lg:leading-[1.1]"
        >
          <span className="block">We build and scale</span>
          <span className="mt-1 block text-accent">software products</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.12 }}
          className="mx-auto mt-4 max-w-2xl text-lg font-medium leading-snug text-text-secondary sm:text-xl"
        >
          Web apps, mobile apps, websites, and ecommerce stores — from idea to
          product-market fit.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.24 }}
          className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4"
        >
          <Button href="/booking" variant="primary" size="lg">
            Book a call
          </Button>
          <Button href="/pricing" variant="dark" size="lg" showLiveDot>
            View Pricing
          </Button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.55, delay: 0.4 }}
          className="mx-auto mt-14 grid max-w-3xl grid-cols-2 gap-3 sm:mt-16 sm:grid-cols-4"
        >
          {experienceStats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.45 + i * 0.06 }}
              className="rounded-3xl border border-border/80 bg-white/90 px-4 py-5 text-center shadow-soft backdrop-blur-sm"
            >
              <div
                className={`heading-display text-2xl font-bold sm:text-3xl ${
                  i % 3 === 0
                    ? "text-accent"
                    : i % 3 === 1
                      ? "text-accent-violet"
                      : "text-accent-warm"
                }`}
              >
                {stat.value}
              </div>
              <div className="mt-1.5 text-xs font-medium text-text-secondary">
                {stat.label}
              </div>
            </motion.div>
          ))}
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.75 }}
          className="mt-12 sm:mt-14"
        >
          <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-text-secondary/80">
            Built for
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-3">
            {clients.map((client) => (
              <span
                key={client}
                className="text-sm font-medium text-text-secondary/45 transition-colors hover:text-accent"
              >
                {client}
              </span>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
