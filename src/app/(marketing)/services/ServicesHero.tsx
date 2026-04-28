"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import Button from "@/components/ui/Button";
import { SECTION_EYEBROW_CLASSNAME } from "@/components/ui/SectionHeading";

export default function ServicesHero() {
  return (
    <section className="hero-sky relative flex min-h-[50vh] items-center justify-center overflow-hidden pb-14 pt-28 sm:min-h-[55vh] sm:pb-16">
      <div className="relative z-10 mx-auto max-w-4xl px-6 text-center">
        <motion.span
          initial={{ opacity: 1, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className={`mb-5 ${SECTION_EYEBROW_CLASSNAME}`}
        >
          Services
        </motion.span>

        <motion.h1
          initial={{ opacity: 1, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.06 }}
          className="heading-display text-balance text-3xl font-bold leading-[1.2] tracking-tight text-text-primary sm:text-4xl sm:leading-[1.15] lg:text-5xl lg:leading-[1.1]"
        >
          MVP development and growth services for startup founders.
        </motion.h1>

        <motion.p
          initial={{ opacity: 1, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.14 }}
          className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-text-primary/88 sm:mt-8 sm:text-lg"
        >
          Zenpho helps founders scope, build, launch, and grow AI-powered MVPs
          with a simple two-service model: MVP Development and MVP Growth.
        </motion.p>

        <motion.div
          initial={{ opacity: 1, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.22 }}
          className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4"
        >
          <Button href="/booking" variant="primary" size="lg">
            Book an MVP Strategy Call
          </Button>
          <Button href="/pricing" variant="dark" size="lg" showLiveDot>
            View pricing
          </Button>
        </motion.div>

        <motion.p
          initial={{ opacity: 1, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.28 }}
          className="mt-6 text-sm font-medium text-text-secondary"
        >
          <Link
            href="/case-studies"
            className="text-accent underline-offset-4 hover:underline"
          >
            See work
          </Link>
        </motion.p>
      </div>
    </section>
  );
}
