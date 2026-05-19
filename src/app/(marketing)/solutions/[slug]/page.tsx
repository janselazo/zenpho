import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  getMarketingSolutionPage,
  marketingSolutionSlugs,
  type MarketingSolutionSlug,
} from "@/lib/marketing/solution-offering-data";
import CustomWebsitesPageContent from "@/components/marketing/solutions/CustomWebsitesPageContent";
import WebAppsPageContent from "@/components/marketing/solutions/WebAppsPageContent";
import MobileAppsPageContent from "@/components/marketing/solutions/MobileAppsPageContent";
import CreativesGenerationPageContent from "@/components/marketing/solutions/CreativesGenerationPageContent";

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

const SLUG_TO_COMPONENT: Record<MarketingSolutionSlug, () => React.ReactElement> = {
  "custom-websites": CustomWebsitesPageContent,
  "web-apps": WebAppsPageContent,
  "mobile-apps": MobileAppsPageContent,
  "creatives-generation": CreativesGenerationPageContent,
};

export default async function SolutionDetailPage({ params }: Props) {
  const { slug } = await params;
  const page = getMarketingSolutionPage(slug);
  if (!page) notFound();

  const Component = SLUG_TO_COMPONENT[page.slug];
  return <Component />;
}
