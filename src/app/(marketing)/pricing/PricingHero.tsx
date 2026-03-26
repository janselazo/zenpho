"use client";

import { motion } from "framer-motion";
import { SECTION_EYEBROW_CLASSNAME } from "@/components/ui/SectionHeading";

export default function PricingHero() {
  return (
    <section className="relative flex min-h-[55vh] items-center justify-center overflow-hidden pt-28">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/4 top-1/3 h-72 w-72 rounded-full bg-accent/10 blur-[90px]" />
        <div className="absolute bottom-1/4 right-1/4 h-64 w-64 rounded-full bg-accent/10 blur-[90px]" />
      </div>

      <div className="relative z-10 mx-auto max-w-4xl px-6 text-center">
        <motion.span
          initial={{ opacity: 1, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className={`mb-5 inline-block ${SECTION_EYEBROW_CLASSNAME}`}
        >
          Pricing
        </motion.span>

        <motion.h1
          initial={{ opacity: 1, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.06 }}
          className="heading-display text-4xl font-bold leading-tight tracking-tight text-text-primary sm:text-5xl lg:text-6xl"
        >
          <span className="block">Development &amp; Growth</span>
          <span className="mt-1 block text-accent">Services</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 1, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.14 }}
          className="mx-auto mt-6 max-w-2xl text-base font-medium leading-relaxed text-text-secondary sm:text-lg"
        >
          Pick{" "}
          <span className="text-text-primary">Development</span> to build product,
          or <span className="text-text-primary">Growth</span> for acquisition,
          retention, and monetization experiments. Outside packages:{" "}
          <span className="font-medium text-text-primary">$100–$150/h</span>.
        </motion.p>
      </div>
    </section>
  );
}
