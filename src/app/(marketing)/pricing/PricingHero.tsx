"use client";

import { motion } from "framer-motion";

function HexMark({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 3.5 19.5 8v8L12 20.5 4.5 16V8L12 3.5Z"
      />
    </svg>
  );
}

export default function PricingHero() {
  return (
    <section className="relative overflow-hidden bg-[#f4f5f7] pb-12 pt-28 sm:pb-16 sm:pt-32">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(37,99,235,0.08),transparent)]" />

      <div className="relative z-10 mx-auto max-w-3xl px-6 text-center">
        <motion.div
          initial={{ opacity: 1, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-6 flex items-center justify-center gap-2 text-sm font-medium text-text-secondary"
        >
          <HexMark className="h-4 w-4 text-accent" />
          <span className="tracking-wide">Pricing</span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 1, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.05 }}
          className="text-balance text-3xl font-bold leading-[1.15] tracking-tight text-text-primary sm:text-4xl sm:leading-[1.12] lg:text-[2.65rem] lg:leading-[1.1]"
        >
          Growth plans for local service businesses
        </motion.h1>

        <motion.p
          initial={{ opacity: 1, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="mx-auto mt-5 max-w-2xl text-pretty text-base leading-relaxed text-text-secondary sm:text-lg"
        >
          Choose the level of support you need to generate more leads, book more appointments, close more clients,
          collect more reviews, increase referrals, and track real ROI.
        </motion.p>
      </div>
    </section>
  );
}
