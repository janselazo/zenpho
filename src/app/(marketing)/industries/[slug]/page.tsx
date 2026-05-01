import type { Metadata } from "next";
import { notFound } from "next/navigation";
import MarketingPillarLayout from "@/components/marketing/MarketingPillarLayout";
import {
  getMarketingIndustryPage,
  marketingIndustrySlugs,
} from "@/lib/marketing-industries-pages";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return marketingIndustrySlugs.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const page = getMarketingIndustryPage(slug);
  if (!page) return {};
  return {
    title: `${page.title} | Zenpho`,
    description: page.metaDescription,
  };
}

export default async function IndustryDetailPage({ params }: Props) {
  const { slug } = await params;
  const page = getMarketingIndustryPage(slug);
  if (!page) notFound();

  return (
    <>
      <MarketingPillarLayout
        title={page.title}
        heroLead={page.heroLead}
        body={page.body}
        bullets={page.bullets}
      />
      <section className="border-t border-border/70 bg-surface/40 px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-4 text-sm">
          <Link href="/industries" className="text-text-secondary hover:text-accent">
            All industries
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
