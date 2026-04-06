"use client";

import { motion } from "framer-motion";
import Button from "@/components/ui/Button";
import { SECTION_EYEBROW_CLASSNAME } from "@/components/ui/SectionHeading";
import { experienceStats } from "@/lib/data";

const clients = [
  "Taptok",
  "Apex Inspection Pro",
  "TQMuch",
];

export default function Hero() {
  return (
    <section className="hero-sky relative overflow-hidden pb-10 pt-32 sm:pb-12 md:pt-36">
      <div className="relative z-10 mx-auto flex w-full max-w-4xl flex-col px-4 pb-2 pt-1 text-center sm:px-6 sm:pt-4">
        <motion.div
          initial={{ opacity: 1, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55 }}
        >
          <span className={`mb-3 sm:mb-4 ${SECTION_EYEBROW_CLASSNAME}`}>
            AI Product Studio
          </span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 1, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.06 }}
          className="heading-display text-6xl font-bold leading-[1.08] tracking-tight text-text-primary sm:text-7xl sm:leading-[1.06] md:text-7xl md:leading-[1.06] lg:text-8xl lg:leading-[1.04]"
        >
          <span className="block">We build and scale</span>
          <span className="mt-0.5 block text-accent sm:mt-1">software products</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 1, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.12 }}
          className="mx-auto mt-3 max-w-2xl text-base font-medium leading-snug text-text-secondary sm:mt-4 sm:text-lg md:text-xl"
        >
          We turn your{" "}
          <span className="font-semibold text-emerald-500">idea</span> into a
          software product in{" "}
          <span className="font-semibold text-accent">2 weeks</span> — fast,
          affordable, and built to grow
        </motion.p>

        <motion.div
          initial={{ opacity: 1, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.24 }}
          className="mx-auto mt-6 flex w-full max-w-md flex-row items-stretch justify-center gap-2 sm:mt-10 sm:max-w-none sm:gap-4 md:items-center"
        >
          <Button
            href="/pricing"
            variant="primary"
            size="lg"
            className="min-h-9 flex-1 !gap-1.5 !px-3 !py-2 !text-xs sm:min-h-11 sm:flex-initial sm:!gap-2.5 sm:!px-8 sm:!py-3.5 sm:!text-sm"
          >
            Agency
          </Button>
          <Button
            href="/studio"
            variant="dark"
            size="lg"
            showLiveDot
            className="min-h-9 flex-1 !gap-1.5 !px-3 !py-2 !text-xs sm:min-h-11 sm:flex-initial sm:!gap-2.5 sm:!px-8 sm:!py-3.5 sm:!text-sm"
          >
            Studio
          </Button>
        </motion.div>

        <motion.div
          initial={{ opacity: 1 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.55, delay: 0.4 }}
          className="mx-auto mt-10 grid max-w-3xl grid-cols-2 gap-2 sm:mt-16 sm:gap-3 sm:grid-cols-4"
        >
          {experienceStats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 1, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.45 + i * 0.06 }}
              className="flex min-h-[5.25rem] flex-col justify-center rounded-2xl border border-border/80 bg-white/90 px-3 py-3.5 text-center shadow-soft backdrop-blur-sm sm:min-h-0 sm:rounded-3xl sm:px-4 sm:py-5"
            >
              <div
                className={`heading-display text-xl font-bold tabular-nums sm:text-2xl md:text-3xl ${
                  i % 3 === 0
                    ? "text-accent"
                    : i % 3 === 1
                      ? "text-accent-violet"
                      : "text-accent-warm"
                }`}
              >
                {stat.value}
              </div>
              <div className="mt-1 text-[11px] font-medium leading-snug text-text-secondary text-balance sm:mt-1.5 sm:text-xs">
                {stat.label}
              </div>
            </motion.div>
          ))}
        </motion.div>

        <motion.div
          initial={{ opacity: 1 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.75 }}
          className="mt-10 sm:mt-14"
        >
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-text-secondary/80 sm:mb-4">
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
