import Button from "@/components/ui/Button";
import {
  PricingNarrativeCollapsibleGroups,
  PricingNarrativeCollapsiblePlatform,
} from "@/components/pricing/PricingNarrativeCollapsibleGroups";
import { PricingPlanTierHeaderBlock, pricingPlanColumnSurfaceClass } from "@/components/pricing/PricingPlanTierHeader";
import {
  crossTierDevelopmentAddOns,
  localServicePackageNarratives,
} from "@/lib/marketing/local-service-package-narratives";
import { localServicePricingPlans } from "@/lib/marketing/local-service-pricing-plans";

export default function PricingPackageNarratives() {
  return (
    <section
      className="border-t border-border/50 bg-background py-16 lg:py-24"
      aria-label="Launch, Grow, and Scale plans and details"
    >
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="overflow-x-auto rounded-2xl border border-border/70 bg-white pt-6 shadow-soft [-webkit-overflow-scrolling:touch] sm:pt-7">
          <p className="sr-only">Scroll horizontally to compare plan details on small screens.</p>
          <table className="w-full min-w-[760px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-border/70 bg-white">
                <th
                  scope="col"
                  aria-label="Context for each tier"
                  className="sticky left-0 z-20 w-[min(36vw,280px)] min-w-[180px] bg-white px-4 py-5 align-top sm:px-5"
                >
                  <div className="flex min-h-[30px] items-end pb-2 sm:min-h-[32px]" aria-hidden />
                </th>
                {localServicePricingPlans.map((plan) => (
                  <th
                    key={plan.id}
                    scope="col"
                    className={`w-[min(22vw,220px)] min-w-[160px] border-border/60 px-3 py-5 align-top sm:px-4 ${pricingPlanColumnSurfaceClass(plan.featured)}`}
                  >
                    <PricingPlanTierHeaderBlock plan={plan} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr className="align-top">
                <th
                  scope="row"
                  className="sticky left-0 z-10 max-w-[280px] min-w-[180px] border-r border-border/70 bg-white px-4 py-6 align-top text-left font-normal sm:px-5"
                >
                  <span className="text-xs font-bold uppercase tracking-[0.18em] text-text-secondary">Details</span>
                  <p className="mt-2 text-[13px] leading-relaxed text-text-secondary">
                    Narratives, best-fit context, and what&apos;s bundled into each tier.
                  </p>
                </th>
                {localServicePricingPlans.map((plan) => {
                  const narrative = localServicePackageNarratives.find((n) => n.id === plan.id);
                  if (!narrative) return null;

                  return (
                    <td
                      key={plan.id}
                      className={`border-border/60 px-3 py-6 align-top sm:px-4 ${pricingPlanColumnSurfaceClass(plan.featured)}`}
                    >
                      <div className="space-y-3 border-b border-border/50 pb-4 text-sm leading-relaxed text-text-secondary dark:border-zinc-700/60">
                        <p>
                          <span className="font-medium text-text-primary">Best for: </span>
                          {narrative.bestFor}
                        </p>
                        <p>
                          <span className="font-medium text-text-primary">Goal: </span>
                          {narrative.mainGoal}
                        </p>
                      </div>
                      <PricingNarrativeCollapsibleGroups groups={narrative.includeGroups} className="mt-4" />
                      {narrative.platformAndMonthly?.length ? (
                        <PricingNarrativeCollapsiblePlatform
                          title="Platform & monthly rhythm"
                          lines={narrative.platformAndMonthly}
                          className="mt-4"
                        />
                      ) : null}
                      <p className="mt-6 border-t border-border/50 pt-4 text-sm italic leading-relaxed text-text-primary dark:border-zinc-700/60">
                        {narrative.positioning}
                      </p>
                    </td>
                  );
                })}
              </tr>
            </tbody>
          </table>
        </div>

        <div className="mt-14 rounded-2xl border border-border/70 bg-white p-6 shadow-sm sm:p-8">
          <h3 className="text-lg font-bold text-text-primary sm:text-xl">Cross-tier development (quoted separately)</h3>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-text-secondary">
            Ecommerce, web apps, and mobile apps are not bundled into Launch–Scale retainers. We scope them as separate
            projects with their own milestones and fees—whether you are on Launch, Grow, or Scale.
          </p>
          <ul className="mt-6 grid gap-4 sm:grid-cols-3">
            {crossTierDevelopmentAddOns.map((a) => (
              <li key={a.title} className="rounded-xl border border-border/60 bg-surface/35 p-4">
                <p className="text-sm font-semibold text-text-primary">{a.title}</p>
                <p className="mt-2 text-xs leading-relaxed text-text-secondary">{a.description}</p>
              </li>
            ))}
          </ul>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button href="/booking" variant="primary" size="lg">
              Book a discovery call
            </Button>
            <Button href="/contact" variant="secondary" size="lg">
              Contact sales
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
