import { Fragment } from "react";
import Button from "@/components/ui/Button";
import { Check, X } from "lucide-react";
import {
  localServicePricingIntro,
  localServicePricingPlans,
} from "@/lib/marketing/local-service-pricing-plans";
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
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-accent">
            {localServicePricingIntro.eyebrow}
          </p>
          <h2
            id={HEADING_ID}
            className="mt-3 text-balance text-3xl font-bold tracking-tight text-text-primary sm:text-4xl lg:text-[2.35rem] lg:leading-[1.1]"
          >
            {localServicePricingIntro.headline}
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-pretty text-base leading-relaxed text-text-secondary sm:text-lg">
            {localServicePricingIntro.subtitle}
          </p>
        </div>

        <p className="mx-auto mt-3 max-w-2xl text-center text-sm text-text-secondary/90">
          Growth includes all Development services. Scale includes all Growth services (and Development).
        </p>

        <div className="mt-10 overflow-x-auto rounded-2xl border border-border/70 bg-white shadow-soft [-webkit-overflow-scrolling:touch]">
          <p className="sr-only">Scroll horizontally to compare plans on small screens.</p>
          <table className="w-full min-w-[760px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-border/70 bg-white">
                <th
                  scope="col"
                  className="sticky left-0 z-20 w-[min(36vw,280px)] min-w-[180px] bg-white px-4 py-5 align-bottom text-xs font-bold uppercase tracking-[0.14em] text-text-secondary sm:px-5"
                >
                  Compare
                </th>
                {localServicePricingPlans.map((plan) => (
                  <th
                    key={plan.id}
                    scope="col"
                    className={`relative w-[min(22vw,220px)] min-w-[160px] border-border/60 px-3 py-5 align-bottom sm:px-4 ${
                      plan.featured
                        ? "border-x border-accent/25 bg-accent/[0.04] shadow-[inset_0_1px_0_0_rgba(37,99,235,0.12)]"
                        : "border-l border-border/40 bg-white"
                    }`}
                  >
                    {plan.featured ? (
                      <span className="absolute left-1/2 top-0 z-10 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-white shadow-sm">
                        Best value
                      </span>
                    ) : null}
                    <div className={`flex flex-col gap-2 pt-1 ${plan.featured ? "mt-2" : ""}`}>
                      <span className="text-lg font-bold leading-snug text-text-primary sm:text-xl">{plan.title}</span>
                      {plan.headerNote ? (
                        <span className="text-xs font-medium leading-snug text-accent">{plan.headerNote}</span>
                      ) : null}
                      <p className="text-xs leading-relaxed text-text-secondary sm:text-[13px]">{plan.summary}</p>
                      <p className="text-xl font-black tracking-tight text-text-primary sm:text-2xl">{plan.price}</p>
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
                          title={row.tooltip}
                          className={`sticky left-0 z-10 ${stickyBg} border-r border-border/50 px-4 py-3 pr-3 font-normal leading-snug text-text-primary sm:px-5 sm:py-3.5`}
                        >
                          <span className={row.tooltip ? "border-b border-dotted border-text-secondary/40" : undefined}>
                            {row.label}
                          </span>
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

        <div className="mx-auto mt-12 grid max-w-5xl gap-8 lg:grid-cols-3 lg:gap-6">
          {localServicePricingPlans.map((plan) => (
            <div
              key={`footer-${plan.id}`}
              className={`rounded-2xl border bg-white p-6 shadow-sm sm:p-7 ${
                plan.featured ? "border-accent/30 ring-2 ring-accent/15" : "border-border/70"
              }`}
            >
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-text-secondary">Best for</p>
              <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-text-secondary">
                {plan.bestFor.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
              <p className="mt-6 border-t border-border/60 pt-5 text-xs font-bold uppercase tracking-[0.18em] text-text-secondary">
                Outcome
              </p>
              <p className="mt-2 text-sm leading-relaxed text-text-secondary">{plan.outcome}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
