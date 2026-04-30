import { fetchMicrolinkScreenshotUrl } from "@/lib/crm/microlink-screenshot";
import { extractPublicContactHints } from "@/lib/crm/prospect-contact-extract";
import {
  decodeFetchedHtmlBuffer,
  FETCH_TIMEOUT_MS,
  MAX_FETCH_BYTES,
  normalizeUrlForFetch,
} from "@/lib/crm/safe-url-fetch";
import { MOCK_WEBSITE_AUDIT } from "./mock-data";
import {
  countImageTags,
  CTA_TERMS,
  extractFirstTagText,
  extractMeta,
  hasAny,
  TRUST_TERMS,
} from "./website-conversion-heuristics";
import type { ServiceResult, WebsiteAudit } from "./types";

function firstSocialLink(html: string, hostPattern: RegExp): string | null {
  const hrefRe = /href=["']([^"']+)["']/gi;
  let match: RegExpExecArray | null;
  while ((match = hrefRe.exec(html)) !== null) {
    const raw = match[1].trim();
    if (!hostPattern.test(raw)) continue;
    try {
      return new URL(raw).toString();
    } catch {
      continue;
    }
  }
  return null;
}

function extractSocialLinks(html: string): WebsiteAudit["socialLinks"] {
  return {
    facebook: firstSocialLink(html, /(?:^|\/\/)(?:www\.)?facebook\.com/i),
    instagram: firstSocialLink(html, /(?:^|\/\/)(?:www\.)?instagram\.com/i),
    tiktok: firstSocialLink(html, /(?:^|\/\/)(?:www\.)?tiktok\.com/i),
    youtube: firstSocialLink(html, /(?:^|\/\/)(?:www\.)?(?:youtube\.com|youtu\.be)/i),
  };
}

function extractIdentityAttributes(html: string): WebsiteAudit["identityAttributes"] {
  if (/\blatino[-\s]?owned\b|\blatina[-\s]?owned\b|\blatinx[-\s]?owned\b|\bhispanic[-\s]?owned\b/i.test(html)) {
    return [
      {
        id: "latino_owned",
        label: "Identifies as Latino-owned",
        detected: true,
        source: "website",
      },
    ];
  }
  return [];
}

async function fetchHtml(url: string): Promise<{
  html: string | null;
  status: string;
  warnings: string[];
}> {
  try {
    const res = await fetch(url, {
      redirect: "follow",
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; ZenphoRevenueLeakAudit/1.0; +https://zenpho.com)",
        Accept: "text/html,application/xhtml+xml",
      },
    });
    if (!res.ok) {
      return {
        html: null,
        status: `Website returned ${res.status}.`,
        warnings: [`Website unavailable or blocked (${res.status}).`],
      };
    }
    const contentType = res.headers.get("content-type") ?? "";
    if (!/html|xml/i.test(contentType)) {
      return {
        html: null,
        status: "Website did not return HTML.",
        warnings: ["Website unavailable or blocked."],
      };
    }
    const contentLength = Number(res.headers.get("content-length") ?? NaN);
    if (Number.isFinite(contentLength) && contentLength > MAX_FETCH_BYTES * 2) {
      return {
        html: null,
        status: "Website HTML was too large to safely analyze.",
        warnings: ["Website unavailable or blocked."],
      };
    }
    const html = decodeFetchedHtmlBuffer(await res.arrayBuffer());
    return { html, status: "Website analyzed.", warnings: [] };
  } catch {
    return {
      html: null,
      status: "Website unavailable or blocked.",
      warnings: ["Website unavailable or blocked."],
    };
  }
}

async function fetchPageSpeedScore(url: string): Promise<{
  score: number | null;
  warning: string | null;
}> {
  const key = process.env.GOOGLE_PAGESPEED_API_KEY?.trim();
  if (!key) return { score: null, warning: "PageSpeed API key is missing." };
  try {
    const qs = new URLSearchParams({
      url,
      strategy: "mobile",
      key,
    });
    const res = await fetch(
      `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?${qs.toString()}`,
      { signal: AbortSignal.timeout(25_000) }
    );
    if (!res.ok) return { score: null, warning: `PageSpeed failed (${res.status}).` };
    const json = (await res.json()) as {
      lighthouseResult?: { categories?: { performance?: { score?: number } } };
    };
    const raw = json.lighthouseResult?.categories?.performance?.score;
    return {
      score: typeof raw === "number" ? Math.round(raw * 100) : null,
      warning: null,
    };
  } catch {
    return { score: null, warning: "PageSpeed unavailable." };
  }
}

export async function auditWebsite(
  websiteUrl: string | null
): Promise<ServiceResult<WebsiteAudit>> {
  const normalized = websiteUrl ? normalizeUrlForFetch(websiteUrl) : null;
  if (!normalized) {
    return {
      data: {
        ...MOCK_WEBSITE_AUDIT,
        url: websiteUrl,
        normalizedUrl: null,
        available: false,
        status: "Website missing or blocked.",
        warnings: ["Website unavailable or blocked."],
      },
      warnings: ["Website unavailable or blocked."],
    };
  }

  const [{ html, status, warnings }, pageSpeed, screenshotUrl] = await Promise.all([
    fetchHtml(normalized),
    fetchPageSpeedScore(normalized),
    fetchMicrolinkScreenshotUrl(normalized, 25_000),
  ]);

  if (!html) {
    return {
      data: {
        ...MOCK_WEBSITE_AUDIT,
        url: websiteUrl,
        normalizedUrl: normalized,
        available: false,
        status,
        screenshotUrl,
        warnings: [...warnings, pageSpeed.warning].filter((x): x is string => Boolean(x)),
      },
      warnings: [...warnings, pageSpeed.warning].filter((x): x is string => Boolean(x)),
    };
  }

  const lower = html.toLowerCase();
  const imageSignals = countImageTags(html);
  const title = extractMeta(html, "og:title") || extractFirstTagText(html, "title");
  const metaDescription =
    extractMeta(html, "description") || extractMeta(html, "og:description");
  const h1 = extractFirstTagText(html, "h1");
  const hasViewport = /<meta[^>]+name=["']viewport["']/i.test(html);
  const hasPhoneLink = /href=["']tel:/i.test(html);
  const hasPhoneText = /\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/.test(html);
  const hasPrimaryCta = hasAny(html, CTA_TERMS);
  const hasContactForm = /<form[\s>]/i.test(html);
  const hasQuoteCta = /quote|estimate|pricing|consultation/i.test(lower);
  const hasTestimonials = hasAny(html, TRUST_TERMS);
  const hasServicePages = /services?|solutions?|what\s+we\s+do/i.test(lower);
  const hasLocationPages = /areas?\s+served|locations?|near\s+me|city|county/i.test(lower);
  const hasLocalBusinessSchema =
    /application\/ld\+json/i.test(html) && /LocalBusiness|Organization|Service/i.test(html);
  const hasGoogleTagManager = /googletagmanager\.com\/gtm\.js|GTM-[A-Z0-9]+/i.test(html);
  const hasGoogleAnalytics = /gtag\(|google-analytics\.com|G-[A-Z0-9]+/i.test(html);
  const hasGoogleAdsTag = /AW-\d+|googleadservices\.com|conversion_async/i.test(html);
  const hasMetaPixel = /fbq\(|connect\.facebook\.net\/.*fbevents/i.test(html);
  const socialLinks = extractSocialLinks(html);
  const contactHints = extractPublicContactHints(html);
  const identityAttributes = extractIdentityAttributes(html);
  const mobileFriendly =
    hasViewport && (pageSpeed.score === null || pageSpeed.score >= 50) ? true : false;

  const auditWarnings = [
    ...warnings,
    pageSpeed.warning,
    screenshotUrl ? null : "Screenshot unavailable.",
  ].filter((x): x is string => Boolean(x));

  return {
    data: {
      url: websiteUrl,
      normalizedUrl: normalized,
      available: true,
      status,
      screenshotUrl,
      https: normalized.startsWith("https://"),
      mobileFriendly,
      pageSpeedMobileScore: pageSpeed.score,
      title,
      metaDescription,
      h1,
      hasViewport,
      hasPhoneLink,
      hasPhoneText,
      hasPrimaryCta,
      hasContactForm,
      hasQuoteCta,
      hasTestimonials,
      hasClientPhotos: imageSignals.clientPhotoSignals,
      hasProjectPhotos: imageSignals.projectPhotoSignals,
      hasBeforeAfter: imageSignals.beforeAfterSignals,
      hasServicePages,
      hasLocationPages,
      hasLocalBusinessSchema,
      hasGoogleAnalytics,
      hasGoogleTagManager,
      hasGoogleAdsTag,
      hasMetaPixel,
      socialLinks,
      contactLinks: {
        phone: contactHints.phones[0] ?? null,
        email: contactHints.emails[0] ?? null,
      },
      identityAttributes,
      imageCount: imageSignals.imageCount,
      blurryImageSignals: imageSignals.blurryImageSignals,
      warnings: auditWarnings,
    },
    warnings: auditWarnings,
  };
}
