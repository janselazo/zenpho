"use client";

import { motion } from "framer-motion";

export default function AboutIntro() {
  return (
    <section className="relative mx-auto max-w-4xl px-6 py-20 lg:px-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.3 }}
        transition={{ duration: 0.6 }}
        className="text-center"
      >
        <p className="text-lg leading-relaxed text-text-secondary sm:text-xl">
          I&apos;ve spent 8+ years building and scaling startups. Now I help B2B
          and B2C SaaS founders do the same — advising clients through my agency
          and building my own ventures through my studio. My focus: AI Software
          Development and AI Software Growth.
        </p>
      </motion.div>
    </section>
  );
}
