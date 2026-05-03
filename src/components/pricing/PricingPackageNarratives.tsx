import Button from "@/components/ui/Button";
import SectionHeading from "@/components/ui/SectionHeading";
import {
  crossTierDevelopmentAddOns,
  localServicePackageNarratives,
} from "@/lib/marketing/local-service-package-narratives";
import { localServicePricingPlans } from "@/lib/marketing/local-service-pricing-plans";

function planCardClass(featured?: boolean) {
  return featured
    ? "rounded-2xl border-2 border-accent/35 bg-accent/[0.03] p-6 shadow-soft sm:p-7"
    : "rounded-2xl border border-border/70 bg-white p-6 shadow-sm sm:p-7";
}

export default function PricingPackageNarratives() {
  return (
    <section
      className="border-t border-border/50 bg-background py-16 lg:py-24"
      aria-label="Launch, Grow, and Scale plans and details"
    >
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <SectionHeading
          label="Plans"
          title="What each"
          titleAccent="tier includes"
          titleAccentInline
          description="Launch establishes your foundation; Grow adds paid acquisition and funnel rigor; Scale layers advanced acquisition, SEO, CRO, and sales orchestration—all in Zenpho."
        />

        <div className="mt-12 grid gap-6 lg:grid-cols-3">
          {localServicePackageNarratives.map((n) => {
            const plan = localServicePricingPlans.find((p) => p.id === n.id);
            const featured = plan?.featured;

            return (
              <article key={n.id} className={planCardClass(featured)}>
                <header className="border-b border-border/50 pb-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-accent">{n.tagline}</p>
                  <h3 className="mt-2 text-xl font-bold tracking-tight text-text-primary sm:text-2xl">
                    {plan?.title ?? n.id}
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-text-secondary">
                    <span className="font-medium text-text-primary">Best for: </span>
                    {n.bestFor}
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-text-secondary">
                    <span className="font-medium text-text-primary">Goal: </span>
                    {n.mainGoal}
                  </p>
                </header>

                <div className="mt-4 space-y-1">
                  <p className="text-lg font-black tabular-nums text-text-primary sm:text-xl">{n.priceSummary}</p>
                  {n.priceFootnote ? (
                    <p className="text-xs text-text-secondary">{n.priceFootnote}</p>
                  ) : null}
                  {n.priceAlternative ? (
                    <p className="text-xs leading-snug text-text-secondary">{n.priceAlternative}</p>
                  ) : null}
                  {n.adSpendNote ? (
                    <p className="text-xs leading-relaxed text-text-secondary">{n.adSpendNote}</p>
                  ) : null}
                </div>

                <div className="mt-6 space-y-6">
                  {n.includeGroups.map((g) => (
                    <div key={g.heading}>
                      <h4 className="text-xs font-bold uppercase tracking-[0.14em] text-text-secondary">
                        {g.heading}
                      </h4>
                      <ul className="mt-2 list-disc space-y-1.5 pl-4 text-sm leading-relaxed text-text-secondary marker:text-accent/80">
                        {g.items.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>

                {n.platformAndMonthly?.length ? (
                  <div className="mt-6 rounded-xl border border-border/60 bg-surface/40 p-4">
                    <h4 className="text-xs font-bold uppercase tracking-[0.14em] text-text-secondary">
                      Platform & monthly rhythm
                    </h4>
                    <ul className="mt-2 list-disc space-y-2 pl-4 text-xs leading-relaxed text-text-secondary marker:text-text-secondary/50">
                      {n.platformAndMonthly.map((line) => (
                        <li key={line}>{line}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                <p className="mt-6 border-t border-border/50 pt-4 text-sm italic leading-relaxed text-text-primary/90">
                  {n.positioning}
                </p>

                <div className="mt-6">
                  <Button
                    href={plan?.ctaHref ?? "/booking"}
                    variant={featured ? "primary" : "dark"}
                    size="lg"
                    className="w-full justify-center"
                  >
                    {plan?.ctaLabel ?? "Book a call"}
                  </Button>
                </div>
              </article>
            );
          })}
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
