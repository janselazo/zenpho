"use client";

import { motion } from "framer-motion";
import { SECTION_EYEBROW_CLASSNAME } from "@/components/ui/SectionHeading";

export default function PricingHero() {
  return (
    <section className="relative flex min-h-[44vh] items-center justify-center overflow-hidden pb-10 pt-28 sm:min-h-[48vh] sm:pb-12">
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
          className="heading-display flex flex-col gap-2 text-4xl font-bold leading-[1.12] tracking-tight text-text-primary sm:gap-3 sm:text-5xl sm:leading-[1.1] lg:text-6xl lg:leading-[1.08]"
        >
          <span className="block">Development</span>
          <span className="block text-accent">Services</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 1, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.12 }}
          className="mx-auto mt-6 max-w-2xl text-pretty text-base font-medium leading-relaxed text-text-primary/85 sm:mt-7 sm:text-lg sm:leading-relaxed"
        >
          We design, build, and launch custom software products from MVPs to
          full-scale platforms — fast, affordable, and built to grow with your
          business.
        </motion.p>
      </div>
    </section>
  );
}
