import { Fragment } from "react";
import Button from "@/components/ui/Button";
import PricingComparisonFeatureLabel from "@/components/pricing/PricingComparisonFeatureLabel";
import { Check, X } from "lucide-react";
import { localServicePricingPlans } from "@/lib/marketing/local-service-pricing-plans";
import {
  pricingComparisonSections,
  type PricingComparisonPlanId,
} from "@/lib/marketing/pricing-comparison-matrix";

const COLUMN_IDS: PricingComparisonPlanId[] = ["setup", "growth-engine", "full-partner"];

const HEADING_ID = "pricing-plans-compare";

function InclusionCell({ included }: { included: boolean }) {
  return (
    <td
      className="border-border/60 px-3 py-3 text-center align-middle sm:px-4"
      aria-label={included ? "Included" : "Not included"}
    >
      {included ? (
        <Check className="mx-auto h-5 w-5 text-accent" strokeWidth={2.5} aria-hidden />
      ) : (
        <X className="mx-auto h-5 w-5 text-text-secondary/30" strokeWidth={2} aria-hidden />
      )}
    </td>
  );
}

export default function LocalServicePricingComparison() {
  return (
    <section
      className="border-t border-border/50 bg-[#f4f5f7] py-16 lg:py-24"
      aria-labelledby={HEADING_ID}
    >
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <h2 id={HEADING_ID} className="sr-only">
          Compare Zenpho pricing plans
        </h2>

        <div className="overflow-x-auto rounded-2xl border border-border/70 bg-white pt-6 shadow-soft [-webkit-overflow-scrolling:touch] sm:pt-7">
          <p className="sr-only">Scroll horizontally to compare plans on small screens.</p>
          <table className="w-full min-w-[760px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-border/70 bg-white">
                <th
                  scope="col"
                  aria-label="Feature"
                  className="sticky left-0 z-20 w-[min(36vw,280px)] min-w-[180px] bg-white px-4 py-5 align-top sm:px-5"
                >
                  <div className="flex min-h-[30px] items-end pb-2 sm:min-h-[32px]" aria-hidden />
                </th>
                {localServicePricingPlans.map((plan) => (
                  <th
                    key={plan.id}
                    scope="col"
                    className={`w-[min(22vw,220px)] min-w-[160px] border-border/60 px-3 py-5 align-top sm:px-4 ${
                      plan.featured
                        ? "border-x border-accent/25 bg-accent/[0.04] shadow-[inset_0_1px_0_0_rgba(37,99,235,0.12)]"
                        : "border-l border-border/40 bg-white"
                    }`}
                  >
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
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pricingComparisonSections.map((section) => (
                <Fragment key={section.id}>
                  <tr className="bg-surface/65">
                    <td
                      colSpan={4}
                      className="border-y border-border/60 px-4 py-2.5 text-xs font-bold uppercase tracking-[0.18em] text-text-secondary sm:px-5"
                    >
                      {section.heading}
                    </td>
                  </tr>
                  {section.rows.map((row, ri) => {
                    const stripe = ri % 2 === 1;
                    const stickyBg = stripe ? "bg-surface/25" : "bg-white";
                    return (
                      <tr
                        key={row.id}
                        className={`border-b border-border/50 ${stripe ? "bg-surface/25" : "bg-white"}`}
                      >
                        <th
                          scope="row"
                          className={`sticky left-0 z-10 ${stickyBg} border-r border-border/50 px-4 py-3 pr-3 font-normal leading-snug text-text-primary sm:px-5 sm:py-3.5`}
                        >
                          <PricingComparisonFeatureLabel
                            rowId={row.id}
                            label={row.label}
                            tooltip={row.tooltip}
                          />
                        </th>
                        {COLUMN_IDS.map((colId) => (
                          <InclusionCell key={colId} included={row.cells[colId]} />
                        ))}
                      </tr>
                    );
                  })}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
