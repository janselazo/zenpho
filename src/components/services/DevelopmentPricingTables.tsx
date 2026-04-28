"use client";

import { motion } from "framer-motion";
import type { DevelopmentPricingOffering, PricingIncludedGroup } from "@/lib/data";
import { developmentPricingOfferings } from "@/lib/data";
import Button from "@/components/ui/Button";

function resolvedIncludedGroups(
  offering: DevelopmentPricingOffering,
): PricingIncludedGroup[] {
  if (offering.includedGroups && offering.includedGroups.length > 0) {
    return offering.includedGroups;
  }
  if (offering.features && offering.features.length > 0) {
    return [{ title: "What’s included", items: offering.features }];
  }
  return [];
}

function IncludedGrid({ groups }: { groups: PricingIncludedGroup[] }) {
  return (
    <div className="mt-4 grid grid-cols-1 gap-3">
      {groups.map((group) => (
        <div
          key={group.title}
          className="rounded-2xl border border-border/80 bg-surface/70 p-4 shadow-sm"
        >
          <h4 className="text-[11px] font-bold uppercase tracking-wider text-text-secondary">
            {group.title}
          </h4>
          <ul className="mt-3 space-y-2">
            {group.items.map((line) => (
              <li
                key={line}
                className="flex gap-2.5 text-sm leading-snug text-text-secondary"
              >
                <span
                  aria-hidden
                  className="mt-2 inline-block size-1.5 shrink-0 rounded-full bg-accent/90"
                />
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

function RichOfferingCard({
  offering,
  index,
}: {
  offering: DevelopmentPricingOffering;
  index: number;
}) {
  const featured = Boolean(offering.featured);
  const cta = offering.ctaLabel ?? "Book a Call";
  const includedGroups = resolvedIncludedGroups(offering);

  return (
    <motion.article
      id={`pricing-${offering.id}`}
      initial={{ opacity: 1, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.08 }}
      transition={{ duration: 0.45, delay: index * 0.06 }}
      className={`relative flex flex-col rounded-3xl border bg-white p-6 sm:p-8 lg:p-9 ${
        featured
          ? "z-10 border-accent/25 shadow-[0_20px_50px_-12px_rgba(37,99,235,0.14),0_0_0_1px_rgba(37,99,235,0.08)]"
          : "border-border/90 shadow-soft"
      }`}
    >
      {featured ? (
        <>
          <div
            className="pointer-events-none absolute -inset-px rounded-3xl bg-gradient-to-b from-accent/[0.06] via-transparent to-transparent"
            aria-hidden
          />
          <span className="absolute -top-3 left-1/2 z-20 -translate-x-1/2 whitespace-nowrap rounded-full bg-accent px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white shadow-md">
            Most popular
          </span>
        </>
      ) : null}

      <p className="text-[10px] font-bold uppercase tracking-widest text-text-secondary">
        Service
      </p>
      <h2 className="mt-1 text-xl font-bold tracking-tight text-text-primary sm:text-2xl">
        {offering.title}
      </h2>
      {offering.cardHeadline ? (
        <p className="mt-3 text-base font-semibold leading-snug text-accent">
          {offering.cardHeadline}
        </p>
      ) : null}
      <p className="mt-3 text-sm leading-relaxed text-text-secondary sm:text-[15px]">
        {offering.subtitle}
      </p>

      <div className="mt-6 border-t border-border/70 pt-6">
        <p className="text-sm leading-relaxed">
          <span className="font-medium text-text-secondary">From </span>
          <span className="text-2xl font-bold tabular-nums text-text-primary sm:text-[1.65rem]">
            {offering.priceAmount}
          </span>
        </p>
        {offering.typicalRange ? (
          <p className="mt-2 text-sm text-text-secondary">
            <span className="font-medium text-text-primary/90">
              Typical range:
            </span>{" "}
            {offering.typicalRange}
          </p>
        ) : null}
      </div>

      {includedGroups.length > 0 ? (
        <div className="mt-8">
          <p className="text-xs font-bold uppercase tracking-wider text-text-primary">
            What&apos;s included
          </p>
          <IncludedGrid groups={includedGroups} />
        </div>
      ) : null}

      <div className="mt-10">
        <Button href="/booking" variant={featured ? "primary" : "dark"} size="lg" className="w-full">
          {cta}
        </Button>
      </div>
    </motion.article>
  );
}

export default function DevelopmentPricingTables({
  offerings = developmentPricingOfferings,
}: {
  offerings?: DevelopmentPricingOffering[];
}) {
  return (
    <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-2 lg:gap-10">
      {offerings.map((offering, i) => (
        <RichOfferingCard key={offering.id} offering={offering} index={i} />
      ))}
    </div>
  );
}
