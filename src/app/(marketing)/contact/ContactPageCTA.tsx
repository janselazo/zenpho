"use client";

import { motion } from "framer-motion";
import Button from "@/components/ui/Button";
import { SECTION_EYEBROW_CLASSNAME } from "@/components/ui/SectionHeading";

export default function ContactPageCTA() {
  return (
    <section className="mx-auto max-w-7xl px-4 pb-24 sm:px-6 lg:px-8">
      <motion.div
        initial={{ opacity: 1, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.08 }}
        transition={{ duration: 0.5 }}
        className="relative overflow-hidden rounded-2xl border border-border bg-white p-8 text-center shadow-soft-lg sm:rounded-3xl sm:p-12 lg:p-16"
      >
        <div className="pointer-events-none absolute inset-0 opacity-40">
          <div className="absolute inset-0 scifi-grid" />
          <div className="absolute -left-16 bottom-0 h-48 w-48 rounded-full bg-accent/14 blur-3xl" />
        </div>
        <div className="relative z-10">
          <div className="mb-4 flex justify-center">
            <span className={SECTION_EYEBROW_CLASSNAME}>Next step</span>
          </div>
          <h2 className="heading-display text-balance text-3xl font-bold tracking-tight text-text-primary sm:text-4xl lg:text-5xl">
            Ready to move from idea to MVP?
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-sm leading-relaxed text-text-secondary sm:text-base">
            Let&apos;s build the first version, launch it, and learn from real users.
          </p>
          <div className="mx-auto mt-8 flex justify-center">
            <Button href="/booking" variant="primary" size="lg">
              Book an MVP Strategy Call
            </Button>
          </div>
        </div>
      </motion.div>
    </section>
  );
}
