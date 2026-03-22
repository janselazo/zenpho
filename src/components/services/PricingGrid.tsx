"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";
import {
  developmentPricingTiers,
  growthPricingTiers,
  type PricingTier,
} from "@/lib/data";
import SectionHeading from "@/components/ui/SectionHeading";
import Button from "@/components/ui/Button";

const tierIcons: ReactNode[] = [
  (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
  ),
  (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.59 14.37a6 6 0 0 1-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 0 0 6.16-12.12A14.98 14.98 0 0 0 9.631 8.41m5.96 5.96a14.926 14.926 0 0 1-5.841 2.58m-.119-8.54a6 6 0 0 0-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 0 0-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 0 1-2.448-2.448 14.9 14.9 0 0 1 .06-.312m-2.24 2.39a4.493 4.493 0 0 0-1.757 4.306 4.493 4.493 0 0 0 4.306-1.758M16.5 9a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Z" />
    </svg>
  ),
  (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
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

function PricingTierCards({
  tiers,
  variant = "development",
}: {
  tiers: PricingTier[];
  variant?: "development" | "growth";
}) {
  const g = variant === "growth";

  return (
    <div className="grid grid-cols-1 gap-8 pt-2 sm:grid-cols-2 sm:gap-8 lg:grid-cols-3 lg:gap-6 lg:pt-4">
      {tiers.map((tier, i) => {
        const showRibbon = Boolean(tier.badge ?? (tier.highlighted ? "Recommended" : null));
        const ribbonLabel = tier.badge ?? "Recommended";

        const hiShell = g
          ? "border-accent-green/35 bg-white shadow-soft-lg ring-2 ring-accent-green/25 lg:scale-[1.02] lg:shadow-xl"
          : "border-accent/40 bg-gradient-to-b from-accent/[0.07] via-white to-white shadow-soft-lg ring-2 ring-accent/25 lg:scale-[1.02] lg:shadow-xl";
        const loShell =
          "border-border bg-white hover:border-border hover:shadow-soft-lg";

        return (
          <motion.div
            key={tier.name}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.15 }}
            transition={{ duration: 0.45, delay: i * 0.06 }}
            className={`relative flex min-h-full flex-col overflow-visible rounded-[1.35rem] border shadow-soft transition-shadow duration-300 ${
              tier.highlighted ? hiShell : loShell
            }`}
          >
            {showRibbon ? (
              <span
                className={`absolute left-1/2 top-0 z-20 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-full px-3.5 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-white shadow-md ring-[3px] ring-white ${
                  g ? "bg-accent-green" : "bg-accent"
                }`}
              >
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
                      ? g
                        ? "bg-accent-green text-white shadow-sm"
                        : "bg-accent text-white shadow-sm"
                      : g
                        ? "bg-accent-green-soft text-accent-green ring-1 ring-accent-green/25"
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
                    ? g
                      ? "border-accent-green/20 bg-surface-light/50 shadow-sm"
                      : "border-accent/20 bg-white/80 shadow-sm"
                    : "border-border/90 bg-surface-light/60"
                }`}
              >
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
                    {tier.priceNote}
                  </span>
                  <span
                    className={`text-[1.65rem] font-semibold leading-none tracking-tight sm:text-[1.85rem] ${
                      g ? "text-accent-green" : "text-accent"
                    }`}
                  >
                    {tier.price}
                  </span>
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
                        g
                          ? tier.highlighted
                            ? "bg-accent-green/15 text-accent-green"
                            : "bg-accent-green/10 text-accent-green"
                          : tier.highlighted
                            ? "bg-accent/12 text-accent"
                            : "bg-accent/8 text-accent"
                      }`}
                    >
                      <CheckIcon className="h-3 w-3" />
                    </span>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <Button
                href="/contact#booking"
                variant={tier.highlighted ? "primary" : "secondary"}
                size="lg"
                className={
                  g
                    ? tier.highlighted
                      ? "mt-10 w-full justify-center !border-0 !bg-accent-green !text-white shadow-sm hover:!bg-emerald-700 hover:!shadow-md"
                      : "mt-10 w-full justify-center border-accent-green/35 text-accent-green hover:border-accent-green/50 hover:bg-accent-green-soft"
                    : "mt-10 w-full justify-center"
                }
              >
                {tier.cta}
              </Button>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

export default function PricingGrid() {
  return (
    <section className="mx-auto max-w-7xl px-6 py-24 lg:px-8">
      <SectionHeading
        label="Pricing"
        title="Development &"
        titleAccent="Growth"
        titleAccentInline
        description={
          <>
            <p>
              <span className="font-medium text-text-primary">Development</span>{" "}
              is for building and shipping product;{" "}
              <span className="font-medium text-text-primary">Growth</span> is for
              acquisition, retention, monetization, and experiments.
            </p>
            <p>
              Outside these packages, hourly work typically runs{" "}
              <span className="font-medium text-text-primary">$100–150/h</span>.
            </p>
          </>
        }
      />

      <div className="space-y-20 lg:space-y-24">
        <div>
          <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
            <div className="flex flex-wrap items-center gap-3">
              <span className="inline-flex rounded-full bg-accent px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-white">
                Development
              </span>
              <p className="max-w-xl text-sm text-text-secondary">
                Web apps, mobile apps, websites, and ecommerce — scope, build,
                deploy, and handoff.
              </p>
            </div>
          </div>
          <PricingTierCards tiers={developmentPricingTiers} />
        </div>

        <div>
          <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
            <div className="flex flex-wrap items-center gap-3">
              <span className="inline-flex rounded-full border-2 border-accent-green bg-white px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-accent-green">
                Growth
              </span>
              <p className="max-w-xl text-sm text-text-secondary">
                Product-led growth: funnels, retention, monetization, and
                data-backed experiments — not vanity dashboards.
              </p>
            </div>
          </div>
          <PricingTierCards tiers={growthPricingTiers} variant="growth" />
        </div>
      </div>
    </section>
  );
}
