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
          initial={{ opacity: 1, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55 }}
        >
          <span className={`mb-4 ${SECTION_EYEBROW_CLASSNAME}`}>
            AI Product Studio
          </span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 1, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.06 }}
          className="heading-display text-5xl font-bold leading-[1.12] text-text-primary sm:text-6xl sm:leading-[1.1] lg:text-7xl lg:leading-[1.08]"
        >
          <span className="block">We build and scale</span>
          <span className="mt-1 block text-accent">software products</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 1, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.12 }}
          className="mx-auto mt-4 max-w-2xl text-lg font-medium leading-snug text-text-secondary sm:text-xl"
        >
          We turn your{" "}
          <span className="font-semibold text-emerald-500">idea</span> into a
          ready-to-launch software product in{" "}
          <span className="font-semibold text-accent">2 weeks</span> — fast,
          affordable, and built to grow.
        </motion.p>

        <motion.div
          initial={{ opacity: 1, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.24 }}
          className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4"
        >
          <Button href="/pricing" variant="primary" size="lg">
            Agency
          </Button>
          <Button href="/studio" variant="dark" size="lg" showLiveDot>
            Studio
          </Button>
        </motion.div>

        <motion.div
          initial={{ opacity: 1 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.55, delay: 0.4 }}
          className="mx-auto mt-14 grid max-w-3xl grid-cols-2 gap-3 sm:mt-16 sm:grid-cols-4"
        >
          {experienceStats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 1, y: 12 }}
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
          initial={{ opacity: 1 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.75 }}
          className="mt-12 sm:mt-14"
        >
          <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-text-secondary/80">
            Trusted by industry leaders
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
