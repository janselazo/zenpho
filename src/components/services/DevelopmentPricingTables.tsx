import Link from "next/link";
import type { DevelopmentPricingOffering } from "@/lib/data";
import { developmentPricingOfferings } from "@/lib/data";

/** Minimal list check — stroke only, no box (matches marketing reference). */
function FeatureCheckIcon({ className }: { className?: string }) {
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

function OfferingCard({ offering }: { offering: DevelopmentPricingOffering }) {
  const featured = Boolean(offering.featured);
  const suffix = offering.priceSuffix ?? "starting";

  return (
    <article
      id={`pricing-${offering.id}`}
      className={`relative flex h-full flex-col rounded-3xl border bg-white p-6 sm:p-7 ${
        featured
          ? "z-10 border-accent/25 shadow-[0_20px_50px_-12px_rgba(37,99,235,0.18),0_0_0_1px_rgba(37,99,235,0.08)] sm:p-8"
          : "border-border/90 shadow-soft"
      }`}
    >
      {featured ? (
        <>
          <div
            className="pointer-events-none absolute -inset-px rounded-3xl bg-gradient-to-b from-accent/[0.07] via-transparent to-transparent"
            aria-hidden
          />
          <span className="absolute -top-3 left-1/2 z-20 -translate-x-1/2 whitespace-nowrap rounded-full bg-accent px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white shadow-md">
            Most popular
          </span>
        </>
      ) : null}

      <div className="relative flex flex-1 flex-col pt-1">
        <h2 className="text-lg font-bold tracking-tight text-text-primary sm:text-xl">
          {offering.title}
        </h2>

        <div className="mt-5 flex flex-wrap items-baseline gap-x-1.5 gap-y-0">
          <span className="text-4xl font-bold tracking-tight text-text-primary sm:text-[2.5rem] sm:leading-none">
            {offering.priceAmount}
          </span>
          <span className="text-sm font-medium text-text-secondary">/ {suffix}</span>
        </div>

        <p className="mt-3 text-sm leading-relaxed text-text-secondary sm:text-[15px]">
          {offering.subtitle}
        </p>

        <div className="mt-6">
          {featured ? (
            <Link
              href="/booking"
              className="flex w-full items-center justify-center rounded-full bg-accent px-6 py-3.5 text-sm font-semibold text-white shadow-md shadow-accent/25 transition-colors hover:bg-accent-hover"
            >
              Book a call
            </Link>
          ) : (
            <Link
              href="/booking"
              className="flex w-full items-center justify-center rounded-full border border-border bg-white px-6 py-3.5 text-sm font-semibold text-text-primary transition-colors hover:border-accent/35 hover:bg-surface-light/80"
            >
              Book a call
            </Link>
          )}
        </div>

        <p className="mt-8 text-xs font-bold uppercase tracking-wider text-text-primary">
          Includes:
        </p>
        <ul className="mt-3 flex flex-1 flex-col gap-2.5">
          {offering.features.map((line) => (
            <li key={line} className="flex gap-3 text-sm leading-snug text-text-secondary">
              <FeatureCheckIcon className="mt-0.5 h-[1.125rem] w-[1.125rem] shrink-0 text-accent" />
              <span>{line}</span>
            </li>
          ))}
        </ul>
      </div>
    </article>
  );
}

export default function DevelopmentPricingTables({
  offerings = developmentPricingOfferings,
}: {
  offerings?: DevelopmentPricingOffering[];
}) {
  return (
    <div className="mx-auto grid max-w-6xl gap-5 sm:gap-6 md:grid-cols-2 xl:grid-cols-4 xl:items-start xl:gap-5">
      {offerings.map((offering) => (
        <OfferingCard key={offering.id} offering={offering} />
      ))}
    </div>
  );
}
