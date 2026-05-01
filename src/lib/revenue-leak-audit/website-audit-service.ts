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
  detectHomepageReviewShowcase,
  detectTextEnabledPhone,
  detectWebChat,
  detectWebsiteCms,
  extractFirstTagText,
  extractMeta,
  extractWebsiteSocialLinks,
  hasAny,
  TRUST_TERMS,
} from "./website-conversion-heuristics";
import type { ServiceResult, WebsiteAudit } from "./types";

/** Lab Lighthouse via PageSpeed Insights; keep tight so the full `/analyze` request fits ~60s with Places + fetches. */
const PAGESPEED_LAB_TIMEOUT_MS = 34_000;

/** Chrome UX Report API (field / real-user metrics); fast fallback when lab run times out. */
const CRUX_QUERY_TIMEOUT_MS = 8_000;

const AUDIT_FETCH_HEADERS = {
  "User-Agent": "Mozilla/5.0 (compatible; ZenphoRevenueLeakAudit/1.0; +https://zenpho.com)",
  Accept: "text/html,application/xhtml+xml",
} as const;

/** Richer headers for sites/CDNs that challenge non-browser clients (false “unavailable” in production). */
const BROWSERLIKE_FETCH_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
} as const;

function contentTypeSuggestsHtml(contentType: string): boolean {
  return /html|xml/i.test(contentType);
}

/** When `Content-Type` is missing or wrong, still accept obvious HTML after download. */
function bodyLooksLikeHtml(text: string): boolean {
  const head = text.slice(0, 12_000).trimStart();
  return (
    /<!doctype\s+html\b/i.test(head) ||
    /<html[\s>]/i.test(head) ||
    (/<head[\s>]/i.test(head) && /<body[\s>]/i.test(head))
  );
}

function shouldRetryStatus(status: number): boolean {
  return (
    status === 403 ||
    status === 429 ||
    status === 503 ||
    (status >= 520 && status <= 523)
  );
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
  const headerSets = [AUDIT_FETCH_HEADERS, BROWSERLIKE_FETCH_HEADERS];
  let lastError: { status: string; warnings: string[] } | null = null;

  for (let attempt = 0; attempt < headerSets.length; attempt++) {
    try {
      const res = await fetch(url, {
        redirect: "follow",
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
        headers: headerSets[attempt],
      });
      if (!res.ok) {
        lastError = {
          status: `Website returned ${res.status}.`,
          warnings: [`Website unavailable or blocked (${res.status}).`],
        };
        if (attempt < headerSets.length - 1 && shouldRetryStatus(res.status)) {
          continue;
        }
        return { html: null, ...lastError };
      }

      const contentLength = Number(res.headers.get("content-length") ?? NaN);
      if (Number.isFinite(contentLength) && contentLength > MAX_FETCH_BYTES * 2) {
        lastError = {
          status: "Website HTML was too large to safely analyze.",
          warnings: ["Website HTML exceeded the safe size limit for this audit."],
        };
        break;
      }

      const contentType = res.headers.get("content-type") ?? "";
      const html = decodeFetchedHtmlBuffer(await res.arrayBuffer());
      if (!contentTypeSuggestsHtml(contentType) && !bodyLooksLikeHtml(html)) {
        lastError = {
          status: "Website did not return HTML.",
          warnings: ["Website did not return recognizable HTML (unexpected content type)."],
        };
        if (attempt < headerSets.length - 1) {
          continue;
        }
        return { html: null, ...lastError };
      }

      return { html, status: "Website analyzed.", warnings: [] };
    } catch {
      lastError = {
        status: "Website unreachable from the audit server (timeout, TLS, or network).",
        warnings: ["Website unavailable or blocked."],
      };
      if (attempt < headerSets.length - 1) {
        continue;
      }
    }
  }

  return {
    html: null,
    ...(lastError ?? {
      status: "Website unavailable or blocked.",
      warnings: ["Website unavailable or blocked."],
    }),
  };
}

const LIGHTHOUSE_IMAGE_AUDIT_IDS = [
  "uses-optimized-images",
  "modern-image-formats",
  "uses-responsive-images",
] as const;

function sumLighthouseAuditWastedBytes(audit: unknown): number {
  if (!audit || typeof audit !== "object") return 0;
  const details = (audit as { details?: { items?: unknown[] } }).details;
  const items = details?.items;
  if (!Array.isArray(items)) return 0;
  let sum = 0;
  for (const item of items) {
    if (!item || typeof item !== "object") continue;
    const w = (item as { wastedBytes?: unknown }).wastedBytes;
    if (typeof w === "number" && Number.isFinite(w) && w > 0) sum += w;
  }
  return sum;
}

function extractImageWasteBytesFromLighthouseJson(json: unknown): number | null {
  if (!json || typeof json !== "object") return null;
  const lr = (json as { lighthouseResult?: { audits?: Record<string, unknown> } })
    .lighthouseResult;
  const audits = lr?.audits;
  if (!audits || typeof audits !== "object") return null;
  let total = 0;
  for (const id of LIGHTHOUSE_IMAGE_AUDIT_IDS) {
    total += sumLighthouseAuditWastedBytes(audits[id]);
  }
  return total > 0 ? Math.round(total) : null;
}

function originForCrux(pageUrl: string): string | null {
  try {
    return new URL(pageUrl).origin;
  } catch {
    return null;
  }
}

function readMetricP75Number(metric: unknown): number | null {
  if (!metric || typeof metric !== "object") return null;
  const p75 = (metric as { percentiles?: { p75?: unknown } }).percentiles?.p75;
  if (typeof p75 === "number" && Number.isFinite(p75)) return p75;
  if (typeof p75 === "string" && /^-?\d+(\.\d+)?$/.test(p75.trim())) return Number(p75);
  return null;
}

function readMetricP75Cls(metric: unknown): number | null {
  if (!metric || typeof metric !== "object") return null;
  const p75 = (metric as { percentiles?: { p75?: unknown } }).percentiles?.p75;
  if (typeof p75 === "number" && Number.isFinite(p75)) return p75;
  if (typeof p75 === "string") {
    const v = Number.parseFloat(p75);
    return Number.isFinite(v) ? v : null;
  }
  return null;
}

/** Rough 0–100 “performance-like” score from CrUX phone metrics (not identical to Lighthouse). */
function approximateLabLikeScoreFromCrux(
  lcpMs: number | null,
  inpMs: number | null,
  cls: number | null
): number | null {
  if (lcpMs == null || !Number.isFinite(lcpMs)) return null;
  let score = 100;
  if (lcpMs <= 2000) score = 94;
  else if (lcpMs <= 2500) score = 86;
  else if (lcpMs <= 3000) score = 77;
  else if (lcpMs <= 3500) score = 68;
  else if (lcpMs <= 4000) score = 59;
  else if (lcpMs <= 5000) score = 50;
  else if (lcpMs <= 6500) score = 40;
  else score = 30;

  if (inpMs != null && Number.isFinite(inpMs)) {
    if (inpMs > 500) score -= 16;
    else if (inpMs > 300) score -= 11;
    else if (inpMs > 200) score -= 6;
  }
  if (cls != null && Number.isFinite(cls)) {
    if (cls > 0.25) score -= 14;
    else if (cls > 0.1) score -= 8;
  }
  return Math.max(22, Math.min(97, Math.round(score)));
}

async function cruxApproximateMobileScore(
  pageUrl: string,
  apiKey: string
): Promise<{ score: number | null }> {
  const origin = originForCrux(pageUrl);
  if (!origin) return { score: null };
  try {
    const res = await fetch(
      `https://chromeuxreport.googleapis.com/v1/records:queryRecord?key=${encodeURIComponent(apiKey)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ origin, formFactor: "PHONE" }),
        signal: AbortSignal.timeout(CRUX_QUERY_TIMEOUT_MS),
      }
    );
    if (!res.ok) return { score: null };
    const json = (await res.json()) as {
      record?: { metrics?: Record<string, unknown> };
    };
    const metrics = json.record?.metrics;
    if (!metrics || typeof metrics !== "object") return { score: null };
    const lcp = readMetricP75Number(metrics.largest_contentful_paint);
    const inp = readMetricP75Number(
      metrics.interaction_to_next_paint ?? metrics.first_input_delay
    );
    const cls = readMetricP75Cls(metrics.cumulative_layout_shift);
    const score = approximateLabLikeScoreFromCrux(lcp, inp, cls);
    return { score };
  } catch {
    return { score: null };
  }
}

type PageSpeedAttempt = {
  score: number | null;
  warning: string | null;
  imageWasteBytes: number | null;
};

async function pageSpeedAttempt(url: string, key: string, timeoutMs = PAGESPEED_LAB_TIMEOUT_MS): Promise<PageSpeedAttempt> {
  try {
    const qs = new URLSearchParams({
      url,
      strategy: "mobile",
      category: "performance",
      key,
    });
    const res = await fetch(
      `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?${qs.toString()}`,
      { signal: AbortSignal.timeout(timeoutMs) }
    );
    if (!res.ok) {
      const lighthouseTransient =
        res.status === 500 || res.status === 502 || res.status === 503 || res.status === 504;
      return {
        score: null,
        imageWasteBytes: null,
        warning: lighthouseTransient
          ? "PageSpeed could not analyze the website right now."
          : `PageSpeed failed (${res.status}).`,
      };
    }
    const json: unknown = await res.json();
    const raw = (
      json as {
        lighthouseResult?: { categories?: { performance?: { score?: number } } };
      }
    ).lighthouseResult?.categories?.performance?.score;
    const imageWasteBytes = extractImageWasteBytesFromLighthouseJson(json);
    return {
      score: typeof raw === "number" ? Math.round(raw * 100) : null,
      imageWasteBytes,
      warning: null,
    };
  } catch (error) {
    const isTimeout =
      error instanceof Error &&
      (error.name === "TimeoutError" || /timeout|aborted/i.test(error.message));
    return {
      score: null,
      imageWasteBytes: null,
      warning: isTimeout
        ? `Lighthouse lab run aborted after ${Math.round(timeoutMs / 1000)}s (time budget).`
        : "PageSpeed unavailable.",
    };
  }
}

async function fetchPageSpeedScore(url: string): Promise<{
  score: number | null;
  warning: string | null;
  imageWasteBytes: number | null;
}> {
  const key = process.env.GOOGLE_PAGESPEED_API_KEY?.trim();
  if (!key) {
    return { score: null, warning: "PageSpeed API key is missing.", imageWasteBytes: null };
  }
  const lab = await pageSpeedAttempt(url, key, PAGESPEED_LAB_TIMEOUT_MS);
  if (lab.score != null) {
    return {
      score: lab.score,
      warning: lab.warning,
      imageWasteBytes: lab.imageWasteBytes,
    };
  }

  const crux = await cruxApproximateMobileScore(url, key);
  if (crux.score != null) {
    const fallback =
      "Using Chrome UX Report field data (real users on phones) as a stand-in for the mobile score—the Lighthouse lab run did not finish within the time budget.";
    const labNote = lab.warning?.trim();
    return {
      score: crux.score,
      warning: labNote ? `${labNote} ${fallback}` : fallback,
      imageWasteBytes: lab.imageWasteBytes,
    };
  }

  return {
    score: null,
    imageWasteBytes: lab.imageWasteBytes,
    warning:
      lab.warning?.trim() ||
      "No mobile performance score (lab run incomplete and no CrUX phone data for this origin—try again later or confirm the Chrome UX Report API is enabled for this key).",
  };
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
        cmsPlatformId: null,
        cmsPlatformLabel: null,
        status: "Website missing or blocked.",
        warnings: ["Website unavailable or blocked."],
      },
      warnings: ["Website unavailable or blocked."],
    };
  }

  const [{ html, status, warnings }, pageSpeed, screenshotUrl] = await Promise.all([
    fetchHtml(normalized),
    fetchPageSpeedScore(normalized),
    fetchMicrolinkScreenshotUrl(normalized, 14_000),
  ]);

  if (!html) {
    return {
      data: {
        ...MOCK_WEBSITE_AUDIT,
        url: websiteUrl,
        normalizedUrl: normalized,
        available: false,
        cmsPlatformId: null,
        cmsPlatformLabel: null,
        status,
        screenshotUrl,
        pageSpeedImageWasteBytes: pageSpeed.imageWasteBytes,
        imageSeo: null,
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
  const hasTextEnabledPhone = detectTextEnabledPhone(html);
  const hasPrimaryCta = hasAny(html, CTA_TERMS);
  const hasContactForm = /<form[\s>]/i.test(html);
  const hasQuoteCta = /quote|estimate|pricing|consultation/i.test(lower);
  const hasTestimonials = hasAny(html, TRUST_TERMS);
  const homepageFeaturesReviews = detectHomepageReviewShowcase(html);
  const hasServicePages = /services?|solutions?|what\s+we\s+do/i.test(lower);
  const hasLocationPages = /areas?\s+served|locations?|near\s+me|city|county/i.test(lower);
  const hasLocalBusinessSchema =
    /application\/ld\+json/i.test(html) && /LocalBusiness|Organization|Service/i.test(html);
  const hasGoogleTagManager = /googletagmanager\.com\/gtm\.js|GTM-[A-Z0-9]+/i.test(html);
  const hasGoogleAnalytics =
    /gtag\s*\(\s*["']config["']\s*,\s*["']G-[A-Z0-9]+/i.test(html) ||
    /googletagmanager\.com\/gtag\/js/i.test(html) ||
    /google-analytics\.com\/g\/collect/i.test(html) ||
    /google-analytics\.com\/analytics\.js/i.test(html) ||
    /UA-\d{4,10}-\d{1,4}\b/i.test(html) ||
    /\bG-[A-Z0-9]{6,12}\b/i.test(html);
  const hasGoogleAdsTag = /AW-\d+|googleadservices\.com|conversion_async/i.test(html);
  const hasMetaPixel =
    /fbq\s*\(|connect\.facebook\.net\/[^"']*fbevents/i.test(html) ||
    /facebook\.net\/tr\?/i.test(html);
  const hasTikTokPixel =
    /analytics\.tiktok\.com/i.test(html) ||
    /ttq\.(?:load|page|track|identify)/i.test(html) ||
    /TiktokAnalyticsObject/i.test(html);
  const hasBingUet =
    /bat\.bing\.com/i.test(html) ||
    /\buetq\b/i.test(html) ||
    /bing\.com\/bat\.js/i.test(html);
  const hasLinkedInInsight =
    /snap\.licdn\.com\/li\.lms-analytics/i.test(html) ||
    /linkedin\.com\/px/i.test(html) ||
    /_linkedin_partner_id/i.test(html);
  const hasPinterestPixel = /pintrk\s*\(|ct\.pinterest\.com/i.test(html);
  const hasTwitterPixel =
    /static\.ads-twitter\.com\/uwt\.js/i.test(html) ||
    /\btwq\s*\(/i.test(html) ||
    /ads-twitter\.com/i.test(html);
  const hasSnapchatPixel = /sc-static\.net\/scevent/i.test(html) || /\bsnaptr\s*\(/i.test(html);
  const webChat = detectWebChat(html);
  const cms = detectWebsiteCms(html);
  const socialLinks = extractWebsiteSocialLinks(html);
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
      hasTextEnabledPhone,
      hasPrimaryCta,
      hasContactForm,
      hasQuoteCta,
      hasTestimonials,
      homepageFeaturesReviews,
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
      hasTikTokPixel,
      hasBingUet,
      hasLinkedInInsight,
      hasPinterestPixel,
      hasTwitterPixel,
      hasSnapchatPixel,
      hasWebChat: webChat.detected,
      webChatProvider: webChat.provider,
      cmsPlatformId: cms?.id ?? null,
      cmsPlatformLabel: cms?.label ?? null,
      socialLinks,
      contactLinks: {
        phone: contactHints.phones[0] ?? null,
        email: contactHints.emails[0] ?? null,
      },
      identityAttributes,
      imageCount: imageSignals.imageCount,
      blurryImageSignals: imageSignals.blurryImageSignals,
      imageSeo: imageSignals.imageSeo,
      pageSpeedImageWasteBytes: pageSpeed.imageWasteBytes,
      warnings: auditWarnings,
    },
    warnings: auditWarnings,
  };
}
