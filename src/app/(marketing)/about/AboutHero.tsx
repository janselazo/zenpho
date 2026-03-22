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
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className={`mb-5 ${SECTION_EYEBROW_CLASSNAME}`}
        >
          About
        </motion.span>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.06 }}
          className="heading-display text-4xl font-bold leading-tight tracking-tight text-text-primary sm:text-5xl lg:text-6xl"
        >
          Janse Lazo
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.12 }}
          className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-text-secondary sm:text-lg"
        >
          Founder of{" "}
          <span className="font-medium text-text-primary">AI Product Studio</span>
          . We run an Agency for client builds and a Studio for products we own —
          same team, Miami-based, English &amp; Spanish.
        </motion.p>
      </div>
    </section>
  );
}
