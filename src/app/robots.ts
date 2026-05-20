import type { MetadataRoute } from "next";
import { headers } from "next/headers";
import { APP_ORIGIN, SITE_ORIGIN, normalizeHost, siteUrl } from "@/lib/marketing/seo";

export default async function robots(): Promise<MetadataRoute.Robots> {
  const requestHost = normalizeHost((await headers()).get("host") ?? undefined);
  const appHost = normalizeHost(APP_ORIGIN);

  if (requestHost === appHost) {
    return {
      rules: {
        userAgent: "*",
        disallow: "/",
      },
      host: new URL(APP_ORIGIN).host,
    };
  }

  return {
    rules: {
      userAgent: "*",
      allow: "/",
    },
    sitemap: siteUrl("/sitemap.xml"),
    host: new URL(SITE_ORIGIN).host,
  };
}
