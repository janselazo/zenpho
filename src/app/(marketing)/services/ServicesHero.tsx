"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { SECTION_EYEBROW_CLASSNAME } from "@/components/ui/SectionHeading";

export default function ServicesHero() {
  return (
    <section className="hero-sky relative flex min-h-[65vh] items-center justify-center overflow-hidden pt-28">
      <div className="relative z-10 mx-auto max-w-4xl px-6 text-center">
        <motion.span
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className={`mb-5 ${SECTION_EYEBROW_CLASSNAME}`}
        >
          What we build
        </motion.span>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.06 }}
          className="heading-display text-4xl font-bold leading-tight text-text-primary sm:text-5xl lg:text-6xl"
        >
          AI apps, web, mobile,
          <br />
          <span className="text-accent">automation & integrations</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.14 }}
          className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-text-secondary sm:text-lg"
        >
          From copilots and workflows to full-stack web, offline-first mobile, and
          APIs — scoped for production, weekly iteration, and transparent
          pricing.
        </motion.p>

        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.22 }}
          className="mt-6 text-sm font-medium text-text-secondary"
        >
          <Link href="/pricing" className="text-accent underline-offset-4 hover:underline">
            View pricing & engagement models
          </Link>
        </motion.p>
      </div>
    </section>
  );
}
