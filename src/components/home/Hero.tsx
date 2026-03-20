"use client";

import { motion } from "framer-motion";
import Button from "@/components/ui/Button";
import { SECTION_EYEBROW_CLASSNAME } from "@/components/ui/SectionHeading";
import { experienceStats } from "@/lib/data";

const clients = [
  "BeZazzy",
  "Craveclean",
  "TQMuch",
  "USRallyStripes",
  "Apex Inspection Pro",
];

export default function Hero() {
  return (
    <section className="hero-sky relative flex min-h-screen items-center justify-center overflow-hidden pt-28 pb-16">
      <div className="relative z-10 mx-auto max-w-4xl px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55 }}
        >
          <span className={`mb-5 ${SECTION_EYEBROW_CLASSNAME}`}>
            Custom AI software development and AI agents
          </span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.06 }}
          className="heading-display text-4xl font-bold leading-[1.15] text-text-primary sm:text-5xl sm:leading-[1.12] lg:text-6xl lg:leading-[1.1]"
        >
          <span className="block">
            Custom AI software development{" "}
            <span className="text-accent">and AI agents</span>
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.16 }}
          className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-text-secondary sm:text-lg"
        >
          I design and ship AI that runs in your real product—web, mobile, and
          agents tied to your data. You get working software and code you own.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.24 }}
          className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4"
        >
          <Button href="/contact" variant="primary" size="lg">
            Start a project
          </Button>
          <Button href="/case-studies" variant="dark" size="lg" showLiveDot>
            View Case Studies
          </Button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.55, delay: 0.4 }}
          className="mx-auto mt-20 grid max-w-3xl grid-cols-2 gap-3 sm:grid-cols-4"
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
          className="mt-16"
        >
          <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-text-secondary/80">
            Trusted by teams shipping AI
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

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.1, duration: 0.45 }}
          className="mt-14 flex justify-center pb-2 md:mt-16"
        >
          <div className="flex flex-col items-center gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-text-secondary/50">
              Scroll
            </span>
            <div className="h-6 w-px rounded-full bg-gradient-to-b from-accent/50 to-transparent" />
          </div>
        </motion.div>
      </div>
    </section>
  );
}
