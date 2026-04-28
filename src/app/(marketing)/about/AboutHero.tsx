"use client";

import { motion } from "framer-motion";
import { SECTION_EYEBROW_CLASSNAME } from "@/components/ui/SectionHeading";

export default function AboutHero() {
  return (
    <section className="relative overflow-hidden px-6 pb-12 pt-36">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute right-1/4 top-1/4 h-72 w-72 rounded-full bg-accent/10 blur-[90px]" />
        <div className="absolute bottom-1/4 left-1/4 h-64 w-64 rounded-full bg-accent-violet/10 blur-[80px]" />
      </div>
      <div className="relative z-10 mx-auto max-w-3xl text-center">
        <motion.span
          initial={{ opacity: 1, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className={`mb-5 ${SECTION_EYEBROW_CLASSNAME}`}
        >
          About
        </motion.span>

        <motion.h1
          initial={{ opacity: 1, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.06 }}
          className="heading-display max-w-[22rem] text-2xl font-bold leading-snug tracking-tight text-text-primary min-[460px]:max-w-none sm:text-4xl sm:leading-tight lg:text-[2.5rem] lg:leading-[1.15]"
        >
          We help founders build and launch technology products faster
        </motion.h1>
        <motion.p
          initial={{ opacity: 1, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.12 }}
          className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-text-secondary sm:text-lg"
        >
          Zenpho is an AI MVP development studio helping startup founders turn
          ideas into working products through product strategy, design,
          development, AI integrations, and launch support.
        </motion.p>
      </div>
    </section>
  );
}
