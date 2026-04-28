"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import Button from "@/components/ui/Button";
import { SECTION_EYEBROW_CLASSNAME } from "@/components/ui/SectionHeading";

export default function ServicesHero() {
  return (
    <section className="hero-sky relative overflow-hidden pb-24 pt-28 sm:pb-32 sm:pt-32">
      <div className="relative z-10 mx-auto flex max-w-3xl flex-col items-center px-6 text-center">
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
          className="heading-display text-balance text-4xl font-bold leading-[1.12] tracking-tight text-text-primary sm:text-5xl sm:leading-[1.1] lg:text-6xl lg:leading-[1.08]"
        >
          MVP development and growth services
        </motion.h1>

        <motion.p
          initial={{ opacity: 1, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.14 }}
          className="mx-auto mt-8 max-w-xl text-base font-medium leading-relaxed text-pretty text-text-primary/80 sm:mt-9 sm:text-lg"
        >
          We help founders scope, build, launch, and grow AI-powered MVPs
        </motion.p>

        <motion.div
          initial={{ opacity: 1, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.22 }}
          className="mt-11 flex w-full max-w-md flex-col items-stretch justify-center gap-3 sm:mt-12 sm:flex-row sm:items-center sm:justify-center sm:gap-4"
        >
          <Button href="/booking" variant="primary" size="lg" className="whitespace-nowrap">
            Book an MVP Strategy Call
          </Button>
          <Button
            href="/pricing"
            variant="dark"
            size="lg"
            showLiveDot
            className="whitespace-nowrap"
          >
            View pricing
          </Button>
        </motion.div>

        <motion.p
          initial={{ opacity: 1, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.28 }}
          className="mt-8 text-sm font-medium text-text-secondary"
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
