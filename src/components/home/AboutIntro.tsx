"use client";

import { motion } from "framer-motion";

export default function AboutIntro() {
  return (
    <section className="relative mx-auto max-w-3xl px-6 pb-16 pt-8 lg:px-8">
      <motion.div
        initial={{ opacity: 1, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.05, margin: "0px 0px 120px 0px" }}
        transition={{ duration: 0.5 }}
        className="text-center"
      >
        <h2 className="heading-display text-2xl font-bold tracking-tight text-text-primary sm:text-3xl">
          Who Is This For?
        </h2>
        <p className="mt-5 text-lg leading-relaxed text-text-secondary sm:text-xl">
          For tech and non-tech founders in the U.S., Latin America, and Europe
          who have an idea and want it built fast, affordable, and ready to
          launch.
        </p>
      </motion.div>
    </section>
  );
}
