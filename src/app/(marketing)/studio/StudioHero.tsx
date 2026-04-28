"use client";

import { motion } from "framer-motion";
import Button from "@/components/ui/Button";
import { SECTION_EYEBROW_CLASSNAME } from "@/components/ui/SectionHeading";

export default function StudioHero() {
  return (
    <section className="relative flex min-h-[72vh] items-center justify-center overflow-hidden pt-24">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute right-1/4 top-1/4 h-80 w-80 rounded-full bg-accent-warm/10 blur-[90px]" />
        <div className="absolute bottom-1/3 left-1/4 h-72 w-72 rounded-full bg-accent/10 blur-[90px]" />
      </div>

      <div className="relative z-10 mx-auto max-w-4xl px-6 text-center">
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
          className="heading-display text-4xl font-bold leading-tight tracking-tight text-text-primary sm:text-5xl lg:text-6xl"
        >
          <span className="block">Zenpho Studio</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 1, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.14 }}
          className="mx-auto mt-6 max-w-2xl text-base font-medium leading-relaxed text-text-secondary sm:text-lg"
        >
          We are building more than an agency. Zenpho is evolving into an AI
          Product Studio that helps founders launch products while creating our
          own software.
        </motion.p>

        <motion.div
          initial={{ opacity: 1, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.22 }}
          className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4"
        >
          <Button href="#studio-model" variant="primary" size="lg">
            How the model works
          </Button>
          <Button href="/booking" variant="dark" size="lg" showLiveDot>
            Book an MVP Strategy Call
          </Button>
        </motion.div>
      </div>
    </section>
  );
}
