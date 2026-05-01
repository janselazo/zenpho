"use client";

import { motion } from "framer-motion";
import Button from "@/components/ui/Button";
import { SECTION_EYEBROW_CLASSNAME } from "@/components/ui/SectionHeading";

export default function PricingPageClosingCta() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
      <motion.div
        initial={{ opacity: 1, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.05, margin: "0px 0px 160px 0px" }}
        transition={{ duration: 0.5 }}
        className="relative overflow-hidden rounded-2xl border border-border bg-white p-8 text-center shadow-soft-lg ring-1 ring-black/[0.035] sm:rounded-3xl sm:p-12"
      >
        <div className="pointer-events-none absolute inset-0 opacity-40">
          <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-accent/12 blur-3xl" />
          <div className="absolute bottom-0 left-1/4 h-40 w-40 rounded-full bg-emerald-400/10 blur-3xl" />
        </div>
        <div className="relative z-10">
          <div className="mb-4 flex justify-center">
            <span className={SECTION_EYEBROW_CLASSNAME}>Next step</span>
          </div>
          <h2 className="heading-display text-balance text-3xl font-bold tracking-tight text-text-primary sm:text-4xl">
            Ready to <span className="text-accent">grow</span>?
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-text-secondary sm:mt-4 sm:text-base">
            Book a quick call. We&apos;ll align on your market, what you&apos;re tracking today, and which plan matches
            where you are.
          </p>
          <div className="mx-auto mt-8 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:gap-4">
            <Button href="/booking" variant="primary" size="lg" className="sm:min-w-[200px]">
              Book a growth call
            </Button>
            <Button href="/contact" variant="dark" size="lg" showLiveDot className="sm:min-w-[200px]">
              Contact
            </Button>
          </div>
        </div>
      </motion.div>
    </section>
  );
}
