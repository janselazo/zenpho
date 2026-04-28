"use client";

import { motion } from "framer-motion";
import Button from "@/components/ui/Button";
import { SECTION_EYEBROW_CLASSNAME } from "@/components/ui/SectionHeading";

export default function FoundingClientSection() {
  return (
    <section className="mx-auto max-w-7xl px-6 py-16 lg:px-8 lg:pb-8">
      <motion.div
        initial={{ opacity: 1, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.15 }}
        transition={{ duration: 0.45 }}
        className="relative overflow-hidden rounded-2xl border border-border bg-white p-8 shadow-soft-lg sm:rounded-3xl sm:p-10 lg:p-12"
      >
        <div className="pointer-events-none absolute inset-0 opacity-40">
          <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-accent/15 blur-3xl" />
          <div className="absolute bottom-0 left-1/4 h-40 w-40 rounded-full bg-accent-warm/10 blur-3xl" />
        </div>
        <div className="relative z-10 mx-auto max-w-2xl text-center">
          <span className={`mb-4 inline-block ${SECTION_EYEBROW_CLASSNAME}`}>
            Founding clients
          </span>
          <h2 className="heading-display text-balance text-2xl font-bold tracking-tight text-text-primary sm:text-3xl lg:text-4xl">
            Founding client opportunities
          </h2>
          <p className="mt-5 text-sm leading-relaxed text-text-secondary sm:text-base">
            We are currently selecting a limited number of early founder projects
            for portfolio case studies. If your project is a strong fit, you may
            qualify for a reduced founding client rate in exchange for detailed
            feedback, a testimonial, and permission to share the project as a
            case study.
          </p>
          <div className="mt-8 flex justify-center">
            <Button href="/booking" variant="primary" size="lg">
              Apply for a Strategy Call
            </Button>
          </div>
        </div>
      </motion.div>
    </section>
  );
}
