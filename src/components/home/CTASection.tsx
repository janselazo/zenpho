"use client";

import { motion } from "framer-motion";
import Button from "@/components/ui/Button";
import { SECTION_EYEBROW_CLASSNAME } from "@/components/ui/SectionHeading";

export default function CTASection() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
      <motion.div
        initial={{ opacity: 1, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.05, margin: "0px 0px 160px 0px" }}
        transition={{ duration: 0.5 }}
        className="relative overflow-hidden rounded-2xl border border-border bg-white p-8 text-center shadow-soft-lg sm:rounded-3xl sm:p-12 lg:p-16"
      >
        <div className="pointer-events-none absolute inset-0 opacity-50">
          <div className="absolute inset-0 scifi-grid" />
        </div>
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -right-24 -top-24 h-64 w-64 rounded-full bg-accent/12 blur-3xl" />
          <div className="absolute -bottom-20 -left-16 h-56 w-56 rounded-full bg-accent-violet/10 blur-3xl" />
        </div>

        <div className="relative z-10">
          <div className="mb-4 flex justify-center sm:mb-5">
            <span className={SECTION_EYEBROW_CLASSNAME}>Next step</span>
          </div>
          <h2 className="heading-display text-3xl font-bold tracking-tight text-text-primary sm:text-4xl lg:text-5xl lg:leading-tight">
            <span className="block">Tell Us what you&apos;re</span>
            <span className="mt-1 block text-accent">building</span>
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-text-secondary sm:mt-4 sm:text-base">
            Share a short brief — what the product does, who uses it, and
            your timeline. We&apos;ll respond with how we would approach it and
            what a good first milestone looks like.
          </p>
          <div className="mx-auto mt-6 flex w-full max-w-md flex-row items-stretch justify-center gap-2 sm:mt-8 sm:max-w-none sm:gap-4 md:items-center">
            <Button
              href="/booking"
              variant="primary"
              size="lg"
              className="min-h-9 flex-1 text-center !gap-1.5 !px-2.5 !py-2 !text-[11px] leading-tight sm:min-h-11 sm:flex-initial sm:!gap-2.5 sm:!px-8 sm:!py-3.5 sm:!text-sm sm:leading-normal"
            >
              Book a call
            </Button>
            <Button
              href="/pricing"
              variant="dark"
              size="lg"
              showLiveDot
              className="min-h-9 flex-1 text-center !gap-1.5 !px-2.5 !py-2 !text-[11px] leading-tight sm:min-h-11 sm:flex-initial sm:!gap-2.5 sm:!px-8 sm:!py-3.5 sm:!text-sm sm:leading-normal"
            >
              View Pricing
            </Button>
          </div>
        </div>
      </motion.div>
    </section>
  );
}
