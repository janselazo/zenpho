import type { Metadata } from "next";

export const DEFAULT_SITE_ORIGIN = "https://zenpho.com";
export const DEFAULT_APP_ORIGIN = "https://app.zenpho.com";
export const SITE_NAME = "Zenpho";
export const DEFAULT_OG_IMAGE_PATH = "/opengraph-image";

export function normalizeOrigin(value: string | undefined, fallback: string) {
  const trimmed = value?.trim().replace(/\/+$/, "");
  if (!trimmed) return fallback;
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

export function normalizeHost(value: string | undefined, fallback = "") {
  return (
    normalizeOrigin(value, fallback ? `https://${fallback}` : "")
      .replace(/^https?:\/\//, "")
      .replace(/\/.*$/, "")
      .split(":")[0]
      ?.toLowerCase()
      .trim() || fallback
  );
}

export const SITE_ORIGIN = normalizeOrigin(
  process.env.NEXT_PUBLIC_SITE_URL,
  DEFAULT_SITE_ORIGIN,
);

export const APP_ORIGIN = normalizeOrigin(
  process.env.PUBLIC_APP_URL || process.env.NEXT_PUBLIC_APP_URL,
  DEFAULT_APP_ORIGIN,
);

export const ORGANIZATION_ID = `${SITE_ORIGIN}/#organization`;
export const WEBSITE_ID = `${SITE_ORIGIN}/#website`;
export const LOCAL_BUSINESS_ID = `${SITE_ORIGIN}/#local-business`;

export function siteUrl(path = "/") {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${SITE_ORIGIN}${normalizedPath === "/" ? "" : normalizedPath}`;
}

export function buildMarketingMetadata({
  title,
  description,
  path,
  type = "website",
  image = DEFAULT_OG_IMAGE_PATH,
  publishedTime,
  authors,
}: {
  title: string;
  description: string;
  path: string;
  type?: "website" | "article";
  image?: string;
  publishedTime?: string;
  authors?: string[];
}): Metadata {
  const url = siteUrl(path);
  const imageUrl = image.startsWith("http") ? image : siteUrl(image);
  const openGraph =
    type === "article"
      ? ({
          title,
          description,
          url,
          siteName: SITE_NAME,
          locale: "en_US",
          type: "article",
          publishedTime,
          authors,
          images: [{ url: imageUrl, width: 1200, height: 630, alt: title }],
        } satisfies Metadata["openGraph"])
      : ({
          title,
          description,
          url,
          siteName: SITE_NAME,
          locale: "en_US",
          type: "website",
          images: [{ url: imageUrl, width: 1200, height: 630, alt: title }],
        } satisfies Metadata["openGraph"]);

  return {
    title: { absolute: title },
    description,
    alternates: { canonical: url },
    openGraph,
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [imageUrl],
    },
  };
}

export function breadcrumbJsonLd(
  items: { name: string; path: string }[],
) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: siteUrl(item.path),
    })),
  };
}

export function faqPageJsonLd(items: { q: string; a: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.a,
      },
    })),
  };
}
