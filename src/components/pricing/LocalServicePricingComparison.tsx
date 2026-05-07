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
  type PricingCellValue,
  type PricingComparisonPlanId,
} from "@/lib/marketing/pricing-comparison-matrix";

const COLUMN_IDS: PricingComparisonPlanId[] = ["setup", "growth-engine", "full-partner"];

const HEADING_ID = "pricing-plans-compare";

const LAUNCH_OFFER_NOTE =
  "Limited 50% launch offer available for the next 2 client spots. Larger or more complex projects may require a custom quote or additional development sprint.";

function ComparisonCell({ value }: { value: PricingCellValue }) {
  const ariaLabel =
    typeof value === "string" ? value : value ? "Included" : "Not included";

  return (
    <td
      className="border-border/60 px-2 py-3 text-center align-middle sm:px-4"
      aria-label={ariaLabel}
    >
      {typeof value === "string" ? (
        <span className="inline-block max-w-[9rem] text-[13px] font-medium leading-snug text-text-primary sm:max-w-[11rem] sm:text-sm">
          {value}
        </span>
      ) : value ? (
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

        <div className="overflow-hidden rounded-2xl border border-border/70 bg-white shadow-soft">
          <div className="overflow-x-auto pt-6 [-webkit-overflow-scrolling:touch] sm:pt-7">
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
                                  <ComparisonCell key={colId} value={row.cells[colId]} />
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
          <p className="border-t border-border/55 px-4 py-4 text-center text-xs leading-relaxed text-text-secondary sm:px-6 sm:text-sm">
            {LAUNCH_OFFER_NOTE}
          </p>
        </div>
      </div>
    </section>
  );
}
