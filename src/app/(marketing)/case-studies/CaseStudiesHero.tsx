"use client";

import { motion } from "framer-motion";
import Button from "@/components/ui/Button";
import { SECTION_EYEBROW_CLASSNAME } from "@/components/ui/SectionHeading";

export default function CaseStudiesHero() {
  return (
    <section className="hero-sky relative flex min-h-[75vh] items-center justify-center overflow-hidden pt-28">
      <div className="relative z-10 mx-auto max-w-4xl px-6 text-center">
        <motion.span
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className={`mb-5 ${SECTION_EYEBROW_CLASSNAME}`}
        >
          Work
        </motion.span>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.06 }}
          className="heading-display text-4xl font-bold leading-tight text-text-primary sm:text-5xl lg:text-6xl"
        >
          <span className="block">Products that</span>
          <span className="mt-1 block text-accent">scale</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.14 }}
          className="mx-auto mt-6 max-w-2xl text-base font-medium leading-relaxed text-text-secondary sm:text-lg"
        >
          Web apps, mobile apps, websites, and ecommerce — from idea toward
          product-market fit. Agency builds for clients and Studio products we
          own; each write-up is something in production, built with growth in mind
          and handed off so your team can run it.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.22 }}
          className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4"
        >
          <Button href="#projects" variant="primary" size="lg">
            Explore projects
          </Button>
          <Button href="/contact#booking" variant="dark" size="lg" showLiveDot>
            Book a call
          </Button>
        </motion.div>
      </div>
    </section>
  );
}
