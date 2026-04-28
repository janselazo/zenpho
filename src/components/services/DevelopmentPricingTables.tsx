"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import type { DevelopmentPricingOffering } from "@/lib/data";
import { developmentPricingOfferings } from "@/lib/data";

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="m4.5 12.75 6 6 9-13.5" />
    </svg>
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
  const suffix = offering.priceSuffix ?? "starting";
  const cta = offering.ctaLabel ?? "Book an MVP Strategy Call";

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

      <div className="mt-6 space-y-1 border-t border-border/70 pt-6 text-sm">
        <div className="flex flex-wrap items-baseline gap-2">
          <span className="font-medium text-text-secondary">Starting price:</span>
          <span className="text-2xl font-bold tabular-nums text-text-primary sm:text-[1.65rem]">
            {offering.priceAmount}
          </span>
          <span className="text-text-secondary">/ {suffix}</span>
        </div>
        {offering.typicalRange ? (
          <p className="text-sm text-text-secondary">
            <span className="font-medium text-text-primary/90">Typical range:</span>{" "}
            {offering.typicalRange}
          </p>
        ) : null}
      </div>

      {offering.bestFor && offering.bestFor.length > 0 ? (
        <div className="mt-8">
          <p className="text-xs font-bold uppercase tracking-wider text-text-primary">
            Best for
          </p>
          <ul className="mt-3 space-y-2">
            {offering.bestFor.map((line) => (
              <li
                key={line}
                className="flex gap-2.5 text-sm leading-snug text-text-secondary"
              >
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-accent-violet" />
                {line}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="mt-8">
        <p className="text-xs font-bold uppercase tracking-wider text-text-primary">
          What&apos;s included
        </p>
        <ul className="mt-3 space-y-2">
          {offering.features.map((line) => (
            <li key={line} className="flex gap-2.5 text-sm leading-snug text-text-secondary">
              <CheckIcon className="mt-0.5 h-[1.125rem] w-[1.125rem] shrink-0 text-accent" />
              {line}
            </li>
          ))}
        </ul>
      </div>

      {offering.idealIf && offering.idealIf.length > 0 ? (
        <div className="mt-8">
          <p className="text-xs font-bold uppercase tracking-wider text-text-primary">
            Ideal if you need to
          </p>
          <ul className="mt-3 space-y-2">
            {offering.idealIf.map((line) => (
              <li
                key={line}
                className="flex gap-2.5 text-sm leading-snug text-text-secondary"
              >
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-accent-warm" />
                {line}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="mt-10">
        <Link
          href="/booking"
          className={`flex w-full items-center justify-center rounded-full px-6 py-3.5 text-sm font-semibold transition-colors ${
            featured
              ? "bg-accent text-white shadow-md shadow-accent/25 hover:bg-accent-hover"
              : "border border-border bg-white text-text-primary hover:border-accent/35 hover:bg-surface-light/80"
          }`}
        >
          {cta}
        </Link>
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
