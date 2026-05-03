import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import MarketingPillarLayout from "@/components/marketing/MarketingPillarLayout";
import {
  PricingNarrativeCollapsibleGroups,
  PricingNarrativeCollapsiblePlatform,
} from "@/components/pricing/PricingNarrativeCollapsibleGroups";
import { localServicePackageNarratives } from "@/lib/marketing/local-service-package-narratives";
import {
  getMarketingSolutionPage,
  marketingSolutionSlugs,
  marketingSolutionToPlanId,
} from "@/lib/marketing-solutions-pages";

type Props = { params: Promise<{ slug: string }> };

const INCLUDES_HEADING_ID = "solution-whats-included-heading";

export function generateStaticParams() {
  return marketingSolutionSlugs.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const page = getMarketingSolutionPage(slug);
  if (!page) return {};
  return {
    title: `${page.title} | Zenpho`,
    description: page.metaDescription,
  };
}

export default async function SolutionDetailPage({ params }: Props) {
  const { slug } = await params;
  const page = getMarketingSolutionPage(slug);
  if (!page) notFound();

  const planId = marketingSolutionToPlanId[page.slug];
  const narrative = localServicePackageNarratives.find((n) => n.id === planId);

  return (
    <>
      <MarketingPillarLayout
        title={page.title}
        heroLead={page.heroLead}
        body={page.body}
        bullets={page.bullets}
      />

      {narrative ? (
        <section
          className="border-t border-border/70 bg-background px-4 py-14 sm:px-6 lg:px-8 lg:py-16"
          aria-labelledby={INCLUDES_HEADING_ID}
        >
          <div className="mx-auto max-w-4xl">
            <h2
              id={INCLUDES_HEADING_ID}
              className="text-xl font-bold tracking-tight text-text-primary sm:text-2xl"
            >
              What&apos;s included
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-text-secondary sm:text-base">
              Deliverables mirror the{" "}
              <Link href="/pricing" className="font-semibold text-accent underline-offset-4 hover:underline">
                {page.title} tier on pricing
              </Link>
              —expand each section for the full checklist.
            </p>
            <PricingNarrativeCollapsibleGroups
              groups={narrative.includeGroups}
              className="mt-8"
            />
            {narrative.platformAndMonthly?.length ? (
              <PricingNarrativeCollapsiblePlatform
                title="Platform & monthly rhythm"
                lines={narrative.platformAndMonthly}
                className="mt-4"
              />
            ) : null}
            <p className="mx-auto mt-10 max-w-3xl border-t border-border/60 pt-8 text-center text-base italic leading-relaxed text-text-primary sm:text-lg">
              {narrative.positioning}
            </p>
          </div>
        </section>
      ) : null}

      <section className="border-t border-border/70 bg-surface/40 px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-4 text-sm">
          <Link
            href="/solutions/lead-to-revenue-setup"
            className="text-text-secondary hover:text-accent"
          >
            All solutions
          </Link>
          <Link
            href="/booking"
            className="inline-flex items-center gap-1 font-semibold text-accent hover:underline"
          >
            Book a call
            <ChevronRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>
      </section>
    </>
  );
}
