import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import SolutionOfferingLayout from "@/components/marketing/SolutionOfferingLayout";
import {
  getMarketingSolutionPage,
  marketingSolutionSlugs,
} from "@/lib/marketing/solution-offering-data";
import { BOOKING_NAV_COMPACT_BUTTON_LABEL } from "@/lib/marketing/booking-cta";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return marketingSolutionSlugs.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const page = getMarketingSolutionPage(slug);
  if (!page) return {};
  return {
    title: page.metaTitle,
    description: page.metaDescription,
    openGraph: {
      title: page.metaTitle,
      description: page.metaDescription,
    },
  };
}

export default async function SolutionDetailPage({ params }: Props) {
  const { slug } = await params;
  const page = getMarketingSolutionPage(slug);
  if (!page) notFound();

  return (
    <>
      <SolutionOfferingLayout page={page} />

      <section className="border-t border-border/70 bg-surface/40 px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-4 text-sm">
          <Link href="/pricing" className="text-text-secondary hover:text-accent">
            Compare launch packages
          </Link>
          <Link
            href="/booking"
            className="inline-flex items-center gap-1 font-semibold text-accent hover:underline"
          >
            {BOOKING_NAV_COMPACT_BUTTON_LABEL}
            <ChevronRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>
      </section>
    </>
  );
}
