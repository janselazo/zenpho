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
import JsonLd from "@/components/marketing/seo/JsonLd";
import {
  LOCAL_BUSINESS_ID,
  breadcrumbJsonLd,
  buildMarketingMetadata,
  siteUrl,
} from "@/lib/marketing/seo";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return marketingSolutionSlugs.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const page = getMarketingSolutionPage(slug);
  if (!page) return {};
  return buildMarketingMetadata({
    title: page.metaTitle,
    description: page.metaDescription,
    path: `/solutions/${page.slug}`,
  });
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
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", path: "/" },
    { name: "Solutions", path: "/services" },
    { name: page.title, path: `/solutions/${page.slug}` },
  ]);
  const serviceSchema = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: page.title,
    description: page.metaDescription,
    url: siteUrl(`/solutions/${page.slug}`),
    serviceType: page.title,
    areaServed: ["United States", { "@type": "Place", name: "Worldwide" }],
    provider: { "@id": LOCAL_BUSINESS_ID },
  };

  return (
    <>
      <JsonLd data={[breadcrumb, serviceSchema]} />
      <Component />
    </>
  );
}
