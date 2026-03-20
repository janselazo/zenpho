"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { pricingTiers } from "@/lib/data";
import SectionHeading from "@/components/ui/SectionHeading";
import Button from "@/components/ui/Button";

const tierIcons: ReactNode[] = [
  (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.847a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.847.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456Z" />
    </svg>
  ),
  (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 0 1-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 0 1 4.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0 1 12 15a9.065 9.065 0 0 0-6.23.693L5 14.5m14.8.8 1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0 1 12 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" />
    </svg>
  ),
  (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.59 14.37a6 6 0 0 1-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 0 0 6.16-12.12A14.98 14.98 0 0 0 9.631 8.41m5.96 5.96a14.926 14.926 0 0 1-5.841 2.58m-.119-8.54a6 6 0 0 0-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 0 0-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 0 1-2.448-2.448 14.9 14.9 0 0 1 .06-.312m-2.24 2.39a4.493 4.493 0 0 0-1.757 4.306 4.493 4.493 0 0 0 4.306-1.758M16.5 9a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Z" />
    </svg>
  ),
  (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008H17.25v-.008Zm0 3h.008v.008H17.25v-.008Zm0 3h.008v.008H17.25v-.008Z" />
    </svg>
  ),
];

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
    </svg>
  );
}

export default function PricingGrid() {
  return (
    <section className="mx-auto max-w-7xl px-6 py-24 lg:px-8">
      <SectionHeading
        label="Pricing"
        title="Flexible"
        titleAccent="packages"
        description={
          <>
            <p>
              AI software development and AI solutions deployment—from strategy
              and proof of concept through production rollout and larger programs.
            </p>
            <p>
              Time-and-materials work typically runs{" "}
              <span className="font-medium text-text-primary">$100–150/h</span>.
              Fixed ranges below are starting points until scope is defined.
            </p>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-8 pt-6 sm:grid-cols-2 sm:gap-8 lg:grid-cols-4 lg:gap-6 lg:pt-8">
        {pricingTiers.map((tier, i) => {
          const showRibbon = Boolean(tier.badge ?? (tier.highlighted ? "Recommended" : null));
          const ribbonLabel = tier.badge ?? "Recommended";

          return (
            <motion.div
              key={tier.name}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.15 }}
              transition={{ duration: 0.45, delay: i * 0.06 }}
              className={`relative flex min-h-full flex-col overflow-visible rounded-[1.35rem] border shadow-soft transition-shadow duration-300 ${
                tier.highlighted
                  ? "border-accent/40 bg-gradient-to-b from-accent/[0.07] via-white to-white shadow-soft-lg ring-2 ring-accent/25 lg:scale-[1.02] lg:shadow-xl"
                  : "border-border bg-white hover:border-border hover:shadow-soft-lg"
              }`}
            >
              {showRibbon ? (
                <span className="absolute left-1/2 top-0 z-20 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-full bg-accent px-3.5 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-white shadow-md ring-[3px] ring-white">
                  {ribbonLabel}
                </span>
              ) : null}

              <div
                className={`flex min-h-full flex-col px-7 pb-8 pt-10 sm:px-8 sm:pb-9 sm:pt-11 ${
                  tier.highlighted ? "sm:pt-12" : ""
                }`}
              >
                <div className="flex items-start gap-3">
                  <span
                    className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl ${
                      tier.highlighted
                        ? "bg-accent text-white shadow-sm"
                        : "bg-surface-light text-accent ring-1 ring-border"
                    }`}
                  >
                    {tierIcons[i] ?? tierIcons[0]}
                  </span>
                  <div className="min-w-0 flex-1 pt-0.5">
                    <h3 className="heading-display text-lg font-bold leading-snug text-text-primary">
                      {tier.name}
                    </h3>
                  </div>
                </div>

                <p className="mt-4 text-sm leading-relaxed text-text-secondary">
                  {tier.description}
                </p>

                <div
                  className={`mt-8 rounded-2xl border px-5 py-5 sm:py-5 ${
                    tier.highlighted
                      ? "border-accent/20 bg-white/80 shadow-sm"
                      : "border-border/90 bg-surface-light/60"
                  }`}
                >
                  <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
                    <span className="text-[1.65rem] font-semibold leading-none tracking-tight text-accent sm:text-[1.85rem]">
                      {tier.price}
                    </span>
                    <span className="text-sm font-medium leading-snug text-text-secondary">{tier.priceNote}</span>
                  </div>
                </div>

                <p className="mb-3 mt-8 text-[11px] font-semibold uppercase tracking-wider text-text-secondary/90">
                  What&apos;s included
                </p>
                <ul className="flex flex-1 flex-col gap-3">
                  {tier.features.map((feature) => (
                    <li key={feature} className="flex gap-3 text-sm leading-snug text-text-secondary">
                      <span
                        className={`mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full ${
                          tier.highlighted ? "bg-accent/12 text-accent" : "bg-accent/8 text-accent"
                        }`}
                      >
                        <CheckIcon className="h-3 w-3" />
                      </span>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  href="/contact"
                  variant={tier.highlighted ? "primary" : "secondary"}
                  size="lg"
                  className="mt-10 w-full justify-center"
                >
                  {tier.cta}
                </Button>
              </div>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}
