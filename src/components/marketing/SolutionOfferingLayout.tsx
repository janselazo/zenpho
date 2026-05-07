import Link from "next/link";
import { Check } from "lucide-react";
import Button from "@/components/ui/Button";
import type { MarketingSolutionPage } from "@/lib/marketing/solution-offering-data";

type Props = { page: MarketingSolutionPage };

function SectionShell({
  children,
  className = "",
  surface = false,
}: {
  children: React.ReactNode;
  className?: string;
  surface?: boolean;
}) {
  return (
    <section
      className={`px-4 py-14 sm:px-6 sm:py-16 lg:px-8 lg:py-20 ${surface ? "bg-surface/50" : "bg-background"}`}
    >
      <div className={`mx-auto max-w-4xl ${className}`}>{children}</div>
    </section>
  );
}

export default function SolutionOfferingLayout({ page }: Props) {
  const bookingHref = "/booking";
  const pricingHref = "/pricing";

  return (
    <div className="bg-background">
      <section className="border-b border-border/50 bg-gradient-to-b from-surface/80 to-background px-4 pb-14 pt-28 sm:px-6 lg:px-8 lg:pb-16 lg:pt-32">
        <div className="mx-auto max-w-3xl text-center">
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-text-secondary">
            Zenpho
          </p>
          <h1 className="mt-4 text-balance text-3xl font-bold tracking-tight text-text-primary sm:text-4xl lg:text-[2.5rem] lg:leading-tight">
            {page.heroHeadline}
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-pretty text-lg leading-relaxed text-text-secondary sm:text-xl">
            {page.heroSubheadline}
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Button href={bookingHref} variant="primary" size="lg">
              {page.primaryCtaLabel}
            </Button>
            <Button href={pricingHref} variant="secondary" size="lg">
              {page.secondaryCtaLabel}
            </Button>
          </div>
        </div>
      </section>

      <SectionShell>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-text-secondary">What we build</p>
        <h2 className="mt-3 text-2xl font-bold tracking-tight text-text-primary sm:text-3xl">
          {page.whatWeBuild.headline}
        </h2>
        <p className="mt-4 text-base leading-relaxed text-text-secondary sm:text-lg">
          {page.whatWeBuild.copy}
        </p>
        <p className="mt-10 text-xs font-bold uppercase tracking-[0.18em] text-text-secondary">
          {page.whatWeBuild.typesHeading}
        </p>
        <ul className="mt-4 flex flex-wrap gap-2">
          {page.whatWeBuild.types.map((t) => (
            <li
              key={t}
              className="rounded-full border border-border/70 bg-white/80 px-3 py-1.5 text-sm font-medium text-text-primary shadow-sm dark:bg-zinc-900/60"
            >
              {t}
            </li>
          ))}
        </ul>
      </SectionShell>

      <SectionShell surface>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-text-secondary">What&apos;s included</p>
        <h2 className="mt-3 text-2xl font-bold tracking-tight text-text-primary sm:text-3xl">
          {page.whatsIncluded.headline}
        </h2>
        <ul className="mt-8 grid list-none gap-3 sm:grid-cols-2 sm:gap-x-8 sm:gap-y-3">
          {page.whatsIncluded.items.map((item) => (
            <li key={item} className="flex gap-3 text-sm leading-relaxed text-text-secondary sm:text-[0.9375rem]">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-400">
                <Check className="h-3 w-3" strokeWidth={2.5} aria-hidden />
              </span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </SectionShell>

      <SectionShell>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-text-secondary">Best for</p>
        <h2 className="mt-3 text-2xl font-bold tracking-tight text-text-primary sm:text-3xl">
          {page.bestFor.headline}
        </h2>
        <ul className="mt-8 grid list-none gap-3 sm:grid-cols-2">
          {page.bestFor.items.map((item) => (
            <li
              key={item}
              className="flex items-start gap-2 text-sm leading-relaxed text-text-secondary sm:text-base"
            >
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" aria-hidden />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </SectionShell>

      <SectionShell surface>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-text-secondary">Process</p>
        <h2 className="mt-3 text-2xl font-bold tracking-tight text-text-primary sm:text-3xl">
          {page.process.headline}
        </h2>
        <ol className="mt-10 space-y-8">
          {page.process.steps.map((step, i) => (
            <li key={`${page.slug}-step-${i}`} className="flex gap-4 sm:gap-6">
              <span
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-sm font-bold text-accent"
                aria-hidden
              >
                {i + 1}
              </span>
              <div>
                <h3 className="text-lg font-bold text-text-primary">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-text-secondary sm:text-base">{step.description}</p>
              </div>
            </li>
          ))}
        </ol>
      </SectionShell>

      <section className="border-t border-border/60 bg-gradient-to-b from-surface/40 to-background px-4 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-24">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-2xl font-bold tracking-tight text-text-primary sm:text-3xl">{page.finalCta.headline}</h2>
          <p className="mx-auto mt-4 max-w-xl text-pretty text-lg leading-relaxed text-text-secondary">
            {page.finalCta.subheadline}
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button href={bookingHref} variant="primary" size="lg">
              {page.finalCta.buttonLabel}
            </Button>
            <Button href={pricingHref} variant="secondary" size="lg">
              {page.secondaryCtaLabel}
            </Button>
          </div>
          <p className="mt-10 text-sm text-text-secondary">
            <Link href="/contact" className="font-semibold text-accent underline-offset-4 hover:underline">
              Contact us
            </Link>{" "}
            if you need a custom scope or timeline.
          </p>
        </div>
      </section>
    </div>
  );
}
