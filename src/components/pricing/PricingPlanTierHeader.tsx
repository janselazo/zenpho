import Button from "@/components/ui/Button";
import type { LocalServicePricingPlan } from "@/lib/marketing/local-service-pricing-plans";

/** Matches comparison table column chrome (Launch / Grow / Scale). */
export function pricingPlanColumnSurfaceClass(featured?: boolean) {
  return featured
    ? "border-x border-accent/25 bg-accent/[0.04] shadow-[inset_0_1px_0_0_rgba(37,99,235,0.12)]"
    : "border-l border-border/40 bg-white";
}

/**
 * Plan title, tagline, notes, price, alternate line, and CTA — shared by the
 * narratives table header and the feature comparison table header.
 */
export function PricingPlanTierHeaderBlock({ plan }: { plan: LocalServicePricingPlan }) {
  return (
    <>
      <div className="flex min-h-[30px] items-end justify-center pb-2 sm:min-h-[32px]">
        {plan.featured ? (
          <span className="rounded-full bg-accent px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-white shadow-sm">
            Most booked
          </span>
        ) : null}
      </div>
      <div className="flex flex-col gap-2">
        <span className="text-lg font-bold leading-snug text-text-primary sm:text-xl">{plan.title}</span>
        {plan.planTagline ? (
          <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-accent sm:text-xs">
            {plan.planTagline}
          </span>
        ) : null}
        {plan.headerNote ? (
          <span className="text-[13px] font-medium leading-snug text-text-secondary sm:text-sm">
            {plan.headerNote}
          </span>
        ) : null}
        {plan.summary.trim() ? (
          <p className="text-xs leading-relaxed text-text-secondary sm:text-[13px]">{plan.summary}</p>
        ) : null}
        <div className="mt-3 flex flex-col gap-0.5">
          <p className="text-xl font-black tabular-nums tracking-tight text-text-primary sm:text-2xl">
            {plan.priceLead}
          </p>
          <p className="text-xs leading-snug text-text-secondary sm:text-sm">
            {plan.priceNote ? (
              plan.priceNote
            ) : (
              <span className="invisible select-none" aria-hidden>
                Plus ad spend
              </span>
            )}
          </p>
          {plan.priceAlt ? (
            <p className="text-[11px] leading-snug text-text-secondary/90 sm:text-xs">{plan.priceAlt}</p>
          ) : null}
        </div>
        <Button
          href={plan.ctaHref}
          variant={plan.featured ? "primary" : "dark"}
          size="lg"
          className="mt-1 w-full justify-center"
        >
          {plan.ctaLabel}
        </Button>
      </div>
    </>
  );
}
