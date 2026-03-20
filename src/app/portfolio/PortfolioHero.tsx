"use client";

import { motion } from "framer-motion";
import Button from "@/components/ui/Button";

export default function PortfolioHero() {
  return (
    <section className="relative flex min-h-[80vh] items-center justify-center overflow-hidden pt-24">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/4 top-1/4 h-80 w-80 rounded-full bg-accent/10 blur-[90px]" />
        <div className="absolute bottom-1/3 right-1/4 h-72 w-72 rounded-full bg-accent-violet/10 blur-[90px]" />
      </div>

      <div className="relative z-10 mx-auto max-w-4xl px-6 text-center">
        <motion.span
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="mb-5 inline-block text-xs font-semibold uppercase tracking-widest text-accent"
        >
          Portfolio
        </motion.span>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.06 }}
          className="text-4xl font-semibold leading-tight tracking-tight text-text-primary sm:text-5xl lg:text-6xl"
        >
          Client builds &amp;
          <br />
          <span className="bg-gradient-to-r from-accent to-accent-warm bg-clip-text text-transparent">
            studio products
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.14 }}
          className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-text-secondary"
        >
          A cross-section of AI-forward work: production assistants, data
          products, and ventures I operate end to end.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.22 }}
          className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4"
        >
          <Button href="#projects" variant="primary" size="lg">
            Browse projects
          </Button>
          <Button href="/contact" variant="secondary" size="lg">
            Work together
          </Button>
        </motion.div>
      </div>
    </section>
  );
}
