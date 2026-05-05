"use client";

import { motion } from "framer-motion";
import Button from "@/components/ui/Button";
import { SECTION_EYEBROW_CLASSNAME } from "@/components/ui/SectionHeading";

export default function StudioHero() {
  return (
    <section className="hero-sky relative overflow-hidden pb-24 pt-28 sm:pb-32 sm:pt-32">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute right-1/4 top-1/4 h-80 w-80 rounded-full bg-accent-warm/10 blur-[90px]" />
        <div className="absolute bottom-1/3 left-1/4 h-72 w-72 rounded-full bg-accent/10 blur-[90px]" />
      </div>

      <div className="relative z-10 mx-auto flex max-w-3xl flex-col items-center px-6 text-center">
        <motion.span
          initial={{ opacity: 1, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className={`mb-5 ${SECTION_EYEBROW_CLASSNAME}`}
        >
          Zenpho Studio
        </motion.span>

        <motion.h1
          initial={{ opacity: 1, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.06 }}
          className="heading-display text-balance text-4xl font-bold leading-[1.12] tracking-tight text-text-primary sm:text-5xl sm:leading-[1.1] lg:text-6xl lg:leading-[1.08]"
        >
          Zenpho{" "}
          <span className="text-accent">Studio</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 1, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.14 }}
          className="mx-auto mt-8 max-w-xl text-base font-medium leading-relaxed text-pretty text-text-primary/80 sm:mt-9 sm:text-lg"
        >
          We are building more than an agency. Zenpho is evolving into an AI
          Product Studio focused on developing and growing tech startups and
          ecommerce brands—while building our own AI-powered software.
        </motion.p>

        <motion.div
          initial={{ opacity: 1, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.22 }}
          className="mt-11 flex w-full max-w-md flex-col items-stretch justify-center gap-3 sm:mt-12 sm:flex-row sm:items-center sm:justify-center sm:gap-4"
        >
          <Button
            href="#studio-model"
            variant="primary"
            size="lg"
            className="whitespace-nowrap"
          >
            How the model works
          </Button>
          <Button
            href="/booking"
            variant="dark"
            size="lg"
            showLiveDot
            className="whitespace-nowrap"
          >
            Book an MVP Strategy Call
          </Button>
        </motion.div>
      </div>
    </section>
  );
}
