"use client";

import { motion } from "framer-motion";
import { SECTION_EYEBROW_CLASSNAME } from "@/components/ui/SectionHeading";

export default function ContactHero() {
  return (
    <section className="relative overflow-hidden px-6 pb-16 pt-[7.75rem] sm:pb-20 sm:pt-40">
      <div className="relative z-10 mx-auto max-w-3xl text-center">
        <motion.span
          initial={{ opacity: 1, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className={`mb-5 ${SECTION_EYEBROW_CLASSNAME}`}
        >
          Contact
        </motion.span>

        <motion.h1
          initial={{ opacity: 1, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.06 }}
          className="heading-display text-balance text-4xl font-bold leading-tight tracking-tight text-text-primary sm:text-5xl lg:text-6xl"
        >
          Let&apos;s fix leaks and{" "}
          <span className="text-accent">grow with clarity</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 1, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.14 }}
          className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-text-secondary"
        >
          Tell us about your market, leads, and what you want to improve—we&apos;ll help you choose the right next step,
          whether that is an audit, setup, or ongoing growth work.
        </motion.p>
      </div>
    </section>
  );
}
