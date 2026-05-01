import type { Metadata } from "next";
import { notFound } from "next/navigation";
import MarketingPillarLayout from "@/components/marketing/MarketingPillarLayout";
import {
  getMarketingProductPage,
  marketingProductSlugs,
} from "@/lib/marketing-product-pages";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return marketingProductSlugs.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const page = getMarketingProductPage(slug);
  if (!page) return {};
  return {
    title: `${page.title} | Zenpho`,
    description: page.metaDescription,
  };
}

export default async function ProductDetailPage({ params }: Props) {
  const { slug } = await params;
  const page = getMarketingProductPage(slug);
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
          <Link
            href="/product/lead-generation"
            className="text-text-secondary hover:text-accent"
          >
            Browse all product areas
          </Link>
          <Link
            href="/pricing"
            className="inline-flex items-center gap-1 font-semibold text-accent hover:underline"
          >
            See pricing
            <ChevronRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>
      </section>
    </>
  );
}
