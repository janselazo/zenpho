"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import Button from "@/components/ui/Button";
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
          AI Product Studio
        </motion.span>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.06 }}
          className="heading-display text-4xl font-bold leading-tight text-text-primary sm:text-5xl lg:text-6xl"
        >
          <span className="block">Web apps, mobile apps,</span>
          <span className="mt-1 block text-accent">websites &amp; ecommerce</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.14 }}
          className="mx-auto mt-6 max-w-2xl text-base font-medium leading-relaxed text-text-secondary sm:text-lg"
        >
          Plus{" "}
          <span className="text-text-primary">product-led growth</span> —
          acquisition, retention, and monetization — backed by integrations, AI
          where it earns its place, and automation that survives real ops. Same
          mindset as the homepage: we build what you need to win, with a first
          working version fast and steady weekly progress after that.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.22 }}
          className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4"
        >
          <Button href="/contact#booking" variant="primary" size="lg">
            Book a call
          </Button>
          <Button href="/pricing" variant="dark" size="lg" showLiveDot>
            View Pricing
          </Button>
        </motion.div>

        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.28 }}
          className="mt-6 text-sm font-medium text-text-secondary"
        >
          <Link
            href="/case-studies"
            className="text-accent underline-offset-4 hover:underline"
          >
            See Work
          </Link>
        </motion.p>
      </div>
    </section>
  );
}
