"use client";

import { motion } from "framer-motion";
import { pricingTiers } from "@/lib/data";
import SectionHeading from "@/components/ui/SectionHeading";
import Button from "@/components/ui/Button";

export default function PricingGrid() {
  return (
    <section className="mx-auto max-w-7xl px-6 py-24 lg:px-8">
      <SectionHeading
        label="Pricing"
        title="Engagement models"
        description="From a single deep-dive call to ongoing partnership—structured so you can scale involvement up or down."
      />

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {pricingTiers.map((tier, i) => (
          <motion.div
            key={tier.name}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.45, delay: i * 0.08 }}
            className={`relative flex flex-col rounded-3xl border p-8 shadow-soft ${
              tier.highlighted
                ? "border-accent/35 bg-gradient-to-b from-accent/5 to-white shadow-soft-lg ring-2 ring-accent/20"
                : "border-border bg-white"
            }`}
          >
            {tier.highlighted && (
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-accent px-4 py-1 text-[10px] font-semibold uppercase tracking-wider text-white">
                Recommended
              </span>
            )}

            <div className="mb-6">
              <h3 className="heading-display text-lg font-bold text-text-primary">
                {tier.name}
              </h3>
              <p className="mt-2 text-sm text-text-secondary">{tier.description}</p>
            </div>

            <div className="mb-8">
              <span className="text-4xl font-semibold text-accent">{tier.price}</span>
              <span className="ml-2 text-sm text-text-secondary">{tier.priceNote}</span>
            </div>

            <ul className="mb-8 flex-1 space-y-3">
              {tier.features.map((feature) => (
                <li
                  key={feature}
                  className="flex items-start gap-3 text-sm text-text-secondary"
                >
                  <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-accent-violet" />
                  {feature}
                </li>
              ))}
            </ul>

            <Button
              href="/contact"
              variant={tier.highlighted ? "primary" : "secondary"}
              size="lg"
              className="w-full justify-center"
            >
              {tier.cta}
            </Button>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
