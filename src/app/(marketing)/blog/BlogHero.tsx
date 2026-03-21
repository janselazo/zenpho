"use client";

import { motion } from "framer-motion";
import { SECTION_EYEBROW_CLASSNAME } from "@/components/ui/SectionHeading";

export default function BlogHero() {
  return (
    <section className="relative overflow-hidden px-6 pb-12 pt-36">
      <div className="relative z-10 mx-auto max-w-3xl text-center">
        <motion.span
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="mb-5 inline-block text-xs font-semibold uppercase tracking-widest text-accent"
        >
          Blog
        </motion.span>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.06 }}
          className="heading-display text-4xl font-bold leading-tight tracking-tight text-text-primary sm:text-5xl lg:text-6xl"
        >
          <span className="block">Notes on</span>
          <span className="mt-1 block text-accent">building software</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.14 }}
          className="mx-auto mt-4 max-w-xl text-base text-text-secondary"
        >
          Engineering, product craft, and lessons from nine years of shipping
          custom software for startups and growing teams.
        </motion.p>
      </div>
    </section>
  );
}
