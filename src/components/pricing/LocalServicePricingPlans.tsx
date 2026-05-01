import { Check } from "lucide-react";
import Button from "@/components/ui/Button";
import {
  localServicePricingIntro,
  localServicePricingPlans,
} from "@/lib/marketing/local-service-pricing-plans";

const HEADING_ID = "pricing-growth-plans";

export default function LocalServicePricingPlans() {
  return (
    <section
      className="border-t border-border/50 bg-[#f4f5f7] py-16 lg:py-24"
      aria-labelledby={HEADING_ID}
    >
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-accent">{localServicePricingIntro.eyebrow}</p>
          <h2
            id={HEADING_ID}
            className="mt-3 text-balance text-3xl font-bold tracking-tight text-text-primary sm:text-4xl lg:text-[2.35rem] lg:leading-[1.1]"
          >
            {localServicePricingIntro.headline}
          </h2>
        </div>

        <div className="mt-14 grid gap-8 lg:grid-cols-3 lg:gap-6 xl:gap-8">
          {localServicePricingPlans.map((plan) => (
            <article
              key={plan.id}
              className={`relative flex flex-col overflow-hidden rounded-3xl border bg-white p-8 shadow-soft sm:p-9 lg:p-8 xl:p-9 ${
                plan.featured
                  ? "border-accent/40 shadow-soft-lg ring-2 ring-accent/20 lg:-mt-2 lg:mb-2"
                  : "border-border/80"
              }`}
            >
              {plan.featured ? (
                <span className="absolute right-6 top-6 rounded-full bg-accent/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-accent">
                  Popular
                </span>
              ) : null}
              <h3 className="pr-24 text-xl font-bold leading-snug text-text-primary sm:text-2xl lg:pr-20">
                {plan.title}
              </h3>
              <p className="mt-3 text-2xl font-black text-text-primary sm:text-[1.65rem]">{plan.price}</p>
              <p className="mt-4 text-sm leading-relaxed text-text-secondary sm:text-base">{plan.summary}</p>

              <div className="mt-8 border-t border-border/60 pt-8">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-accent">What&apos;s included</p>
                <ul className="mt-4 space-y-2.5">
                  {plan.included.map((line) => (
                    <li key={line} className="flex gap-2.5 text-sm leading-snug text-text-secondary sm:text-[15px]">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-accent" strokeWidth={2.5} aria-hidden />
                      <span>{line}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-8">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-text-primary">Best for</p>
                <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-relaxed text-text-secondary sm:text-[15px]">
                  {plan.bestFor.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              </div>

              <div className="mt-8 rounded-2xl border border-border/70 bg-surface/50 p-5">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-text-primary">Outcome</p>
                <p className="mt-2 text-sm leading-relaxed text-text-secondary sm:text-[15px]">{plan.outcome}</p>
              </div>

              <div className="mt-auto flex flex-col pt-8">
                <Button href={plan.ctaHref} variant={plan.featured ? "primary" : "dark"} size="lg" className="w-full">
                  {plan.ctaLabel}
                </Button>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
