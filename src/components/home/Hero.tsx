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
            AI MVP Development Studio
          </span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 1, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.06 }}
          className="heading-display mx-auto max-w-2xl text-3xl font-bold leading-[1.02] tracking-tight text-text-primary min-[390px]:text-4xl min-[390px]:leading-[1] sm:max-w-4xl sm:text-7xl sm:leading-[0.98] md:text-7xl md:leading-[0.98] lg:max-w-5xl lg:text-8xl lg:leading-[0.97]"
        >
          <span className="block leading-[1.02] text-text-primary">
            We build and scale
          </span>
          <span className="mt-0 block text-pretty leading-[1.02] text-accent sm:mt-0.5 lg:mt-1">
            software startups
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 1, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.12 }}
          className="mx-auto mt-5 max-w-2xl text-center text-base font-medium leading-snug text-text-secondary text-pretty sm:mt-6 sm:text-lg sm:leading-relaxed md:mt-7 md:text-xl md:leading-relaxed"
        >
          <span className="block">
            We help founders design, build, and launch AI-powered
          </span>
          <span className="mt-1 block">
            <span className="text-text-secondary">MVPs in </span>
            <span className="rounded-md bg-accent/12 px-1.5 py-0.5 font-semibold text-accent tabular-nums sm:px-2">
              2 weeks
            </span>
          </span>
        </motion.p>

        <motion.div
          initial={{ opacity: 1, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.18 }}
          className="mx-auto mt-8 flex w-full max-w-lg flex-row items-stretch justify-center gap-2 sm:mt-10 sm:max-w-none sm:gap-4 md:items-center"
        >
          <Button
            href="/booking"
            variant="primary"
            size="lg"
            className="min-h-9 flex-1 !gap-1.5 !px-2 !py-2 !text-[11px] leading-tight sm:min-h-11 sm:flex-initial sm:!gap-2.5 sm:!px-6 sm:!py-3.5 sm:!text-sm sm:leading-normal"
          >
            Book an MVP Strategy Call
          </Button>
          <Button
            href="/services"
            variant="dark"
            size="lg"
            showLiveDot
            className="min-h-9 flex-1 !gap-1.5 !px-3 !py-2 !text-xs sm:min-h-11 sm:flex-initial sm:!gap-2.5 sm:!px-8 sm:!py-3.5 sm:!text-sm"
          >
            View Services
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
            Clients we&apos;ve shipped for
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
