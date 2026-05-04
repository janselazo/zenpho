"use client";

import { Fragment, useCallback, useMemo, useState } from "react";
import PricingComparisonFeatureLabel from "@/components/pricing/PricingComparisonFeatureLabel";
import {
  PricingPlanTierHeaderBlock,
  pricingPlanColumnSurfaceClass,
} from "@/components/pricing/PricingPlanTierHeader";
import { Check, ChevronDown, X } from "lucide-react";
import { localServicePricingPlans } from "@/lib/marketing/local-service-pricing-plans";
import {
  pricingComparisonSections,
  type PricingComparisonPlanId,
} from "@/lib/marketing/pricing-comparison-matrix";
import { pricingDevelopmentAddOns } from "@/lib/marketing/pricing-development-add-ons";

const COLUMN_IDS: PricingComparisonPlanId[] = ["setup", "growth-engine", "full-partner"];

const HEADING_ID = "pricing-plans-compare";
const ADD_ONS_HEADING_ID = "pricing-development-add-ons";

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
  const initialSectionOpen = useMemo(() => {
    const o: Record<string, boolean> = {};
    for (const s of pricingComparisonSections) {
      o[s.id] = true;
    }
    return o;
  }, []);

  const [sectionOpen, setSectionOpen] = useState<Record<string, boolean>>(initialSectionOpen);

  const toggleSection = useCallback((id: string) => {
    setSectionOpen((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

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
                    className={`h-full w-[min(22vw,220px)] min-h-0 min-w-[160px] border-border/60 px-3 py-5 align-top sm:px-4 ${pricingPlanColumnSurfaceClass(plan.featured)}`}
                  >
                    <div className="flex h-full min-h-[1px] flex-col">
                      <PricingPlanTierHeaderBlock plan={plan} />
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pricingComparisonSections.map((section) => {
                const open = sectionOpen[section.id] ?? true;
                return (
                  <Fragment key={section.id}>
                    <tr className="bg-surface/65">
                      <td colSpan={4} className="border-y border-border/60 p-0">
                        <button
                          type="button"
                          onClick={() => toggleSection(section.id)}
                          aria-expanded={open}
                          className="flex w-full items-center justify-between gap-2 px-4 py-2.5 text-left text-xs font-bold uppercase tracking-[0.18em] text-text-secondary transition-colors hover:bg-surface/80 sm:px-5 dark:hover:bg-zinc-800/40"
                        >
                          <span className="leading-snug">{section.heading}</span>
                          <ChevronDown
                            className={`h-4 w-4 shrink-0 text-text-secondary transition-transform duration-200 ${open ? "rotate-180" : ""}`}
                            aria-hidden
                          />
                        </button>
                      </td>
                    </tr>
                    {open
                      ? section.rows.map((row, ri) => {
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
                        })
                      : null}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="mt-12 lg:mt-14" aria-labelledby={ADD_ONS_HEADING_ID}>
          <h2
            id={ADD_ONS_HEADING_ID}
            className="text-lg font-bold tracking-tight text-text-primary sm:text-xl"
          >
            Add-ons
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-text-secondary sm:text-base">
            Optional builds alongside your plan.
          </p>
          <ul className="mt-6 grid list-none gap-4 p-0 sm:grid-cols-2 lg:grid-cols-3">
            {pricingDevelopmentAddOns.map((addOn) => (
              <li
                key={addOn.id}
                className="rounded-2xl border border-border/70 bg-white p-5 shadow-soft sm:p-6"
              >
                <h3 className="text-base font-semibold leading-snug text-text-primary">
                  {addOn.title}
                </h3>
                <p className="mt-3 text-sm font-semibold tabular-nums text-text-primary">
                  Starting at {addOn.startingPrice}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
