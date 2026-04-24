/**
 * Public-page HTML scraping for social media business profiles.
 * Extracts contact info (email, phone, website) from Facebook, Instagram, and Yelp
 * without any API keys — best-effort from public HTML / meta tags / JSON-LD.
 */

import { fetchPageHtml } from "@/lib/crm/brand-color-extract";
import { isJunkEmail, decodeCfEmail } from "@/lib/crm/prospect-contact-extract";

export type SocialPageContacts = {
  source: "facebook" | "instagram" | "yelp";
  email: string | null;
  phone: string | null;
  website: string | null;
  description: string | null;
  hours: string | null;
  profileUrl: string;
};

export type DiscoveredSocialUrls = {
  facebook: string | null;
  instagram: string | null;
  yelp: string | null;
};

export type SocialEnrichmentResult =
  | {
      ok: true;
      email: string | null;
      phone: string | null;
      website: string | null;
      facebookUrl: string | null;
      instagramUrl: string | null;
      yelpUrl: string | null;
      sources: SocialPageContacts[];
    }
  | { ok: false; error: string };

// ── Helpers ──────────────────────────────────────────────────────────────────

const EMAIL_RE = /\b[A-Z0-9._%+\-]+@[A-Z0-9.\-]+\.[A-Z]{2,}\b/gi;
const PHONE_RE = /(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g;

function normalizePhoneCandidate(raw: string): string | null {
  let digits = raw.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("1")) digits = digits.slice(1);
  if (digits.length !== 10) return null;

  // NANP numbers cannot have area/exchange codes starting with 0 or 1.
  // This rejects Facebook profile ids like profile.php?id=100091937615009.
  if (!/^[2-9]\d{2}[2-9]\d{6}$/.test(digits)) return null;
  return digits;
}

function textWithoutUrls(text: string): string {
  return text
    .replace(/https?:\/\/\S+/gi, " ")
    .replace(/\b(?:profile\.php\?id|id)=\d+\b/gi, " ");
}

function firstEmail(text: string): string | null {
  const matches = text.match(EMAIL_RE) ?? [];
  for (const m of matches) {
    if (!isJunkEmail(m)) return m.toLowerCase();
  }
  for (const m of text.matchAll(/data-cfemail=["']([0-9a-fA-F]+)["']/gi)) {
    const decoded = decodeCfEmail(m[1]);
    if (decoded && !isJunkEmail(decoded)) return decoded;
  }
  return null;
}

function firstPhone(text: string): string | null {
  const matches = textWithoutUrls(text).match(PHONE_RE) ?? [];
  for (const match of matches) {
    const normalized = normalizePhoneCandidate(match);
    if (normalized) return normalized;
  }
  return null;
}

function metaContent(html: string, property: string): string | null {
  const re = new RegExp(
    `<meta\\s+[^>]*(?:property|name)=["']${property}["'][^>]*content=["']([^"']+)["']`,
    "i",
  );
  const m = html.match(re);
  if (m?.[1]) return m[1].trim();
  const rev = new RegExp(
    `<meta\\s+[^>]*content=["']([^"']+)["'][^>]*(?:property|name)=["']${property}["']`,
    "i",
  );
  const m2 = html.match(rev);
  return m2?.[1]?.trim() ?? null;
}

function extractMailtoEmails(html: string): string[] {
  const out: string[] = [];
  for (const m of html.matchAll(/mailto:([^\s'"<>?]+)/gi)) {
    const addr = decodeURIComponent(m[1]).trim().toLowerCase();
    if (addr && !isJunkEmail(addr)) out.push(addr);
  }
  return out;
}

function extractTelPhones(html: string): string[] {
  const out: string[] = [];
  for (const m of html.matchAll(/tel:([^\s'"<>?]+)/gi)) {
    const normalized = normalizePhoneCandidate(decodeURIComponent(m[1]));
    if (normalized) out.push(normalized);
  }
  return out;
}

function extractExternalWebsite(html: string, excludeDomains: string[]): string | null {
  const re = /href=["'](https?:\/\/[^"']+)["']/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const url = m[1];
    try {
      const host = new URL(url).hostname.replace(/^www\./i, "").toLowerCase();
      if (excludeDomains.some((d) => host.endsWith(d))) continue;
      if (host.endsWith("google.com") || host.endsWith("goo.gl")) continue;
      return url;
    } catch {
      continue;
    }
  }
  return null;
}

function extractJsonLd(html: string): unknown[] {
  const results: unknown[] = [];
  const re = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    try {
      results.push(JSON.parse(m[1].trim()));
    } catch {
      /* skip */
    }
  }
  return results;
}

// ── Facebook ─────────────────────────────────────────────────────────────────

export async function fetchFacebookPageContacts(
  url: string,
  timeoutMs = 6000,
): Promise<SocialPageContacts> {
  const result: SocialPageContacts = {
    source: "facebook",
    email: null,
    phone: null,
    website: null,
    description: null,
    hours: null,
    profileUrl: url,
  };

  const html = await fetchPageHtml(url, timeoutMs);
  if (!html) return result;

  const ogDesc = metaContent(html, "og:description");
  if (ogDesc) {
    result.description = ogDesc;
    result.email = result.email || firstEmail(ogDesc);
    result.phone = result.phone || firstPhone(ogDesc);
  }

  const desc = metaContent(html, "description");
  if (desc) {
    result.description = result.description || desc;
    result.email = result.email || firstEmail(desc);
    result.phone = result.phone || firstPhone(desc);
  }

  const mailtos = extractMailtoEmails(html);
  if (!result.email && mailtos[0]) result.email = mailtos[0];

  const tels = extractTelPhones(html);
  if (!result.phone && tels[0]) result.phone = tels[0];

  if (!result.email) result.email = firstEmail(html);
  if (!result.phone) result.phone = firstPhone(html);

  result.website = extractExternalWebsite(html, [
    "facebook.com",
    "fb.com",
    "instagram.com",
    "fbcdn.net",
    "fbsbx.com",
  ]);

  return result;
}

// ── Instagram ────────────────────────────────────────────────────────────────

export async function fetchInstagramProfileContacts(
  url: string,
  timeoutMs = 6000,
): Promise<SocialPageContacts> {
  const result: SocialPageContacts = {
    source: "instagram",
    email: null,
    phone: null,
    website: null,
    description: null,
    hours: null,
    profileUrl: url,
  };

  const html = await fetchPageHtml(url, timeoutMs);
  if (!html) return result;

  const ogDesc = metaContent(html, "og:description");
  if (ogDesc) {
    result.description = ogDesc;
    result.email = firstEmail(ogDesc);
    result.phone = firstPhone(ogDesc);
  }

  const desc = metaContent(html, "description");
  if (desc && !result.description) {
    result.description = desc;
    if (!result.email) result.email = firstEmail(desc);
    if (!result.phone) result.phone = firstPhone(desc);
  }

  result.website = extractExternalWebsite(html, [
    "instagram.com",
    "facebook.com",
    "fb.com",
    "cdninstagram.com",
  ]);

  return result;
}

// ── Yelp ─────────────────────────────────────────────────────────────────────

export async function fetchYelpListingContacts(
  url: string,
  timeoutMs = 6000,
): Promise<SocialPageContacts> {
  const result: SocialPageContacts = {
    source: "yelp",
    email: null,
    phone: null,
    website: null,
    description: null,
    hours: null,
    profileUrl: url,
  };

  const html = await fetchPageHtml(url, timeoutMs);
  if (!html) return result;

  for (const ld of extractJsonLd(html)) {
    if (!ld || typeof ld !== "object") continue;
    const obj = ld as Record<string, unknown>;
    if (typeof obj.telephone === "string") {
      result.phone = normalizePhoneCandidate(obj.telephone);
    }
    if (typeof obj.url === "string" && !obj.url.includes("yelp.com")) {
      result.website = result.website || obj.url;
    }
    if (typeof obj.description === "string") {
      result.description = result.description || obj.description;
    }
    const opening = obj.openingHoursSpecification;
    if (Array.isArray(opening) && opening.length > 0) {
      result.hours = opening
        .slice(0, 7)
        .map((h: Record<string, unknown>) =>
          `${h.dayOfWeek ?? ""}: ${h.opens ?? ""}-${h.closes ?? ""}`.trim(),
        )
        .join("; ");
    }
  }

  const tels = extractTelPhones(html);
  if (!result.phone && tels[0]) result.phone = tels[0];

  if (!result.website) {
    result.website = extractExternalWebsite(html, [
      "yelp.com",
      "yelp.to",
      "yelpcdn.com",
    ]);
  }

  const mailtos = extractMailtoEmails(html);
  if (!result.email && mailtos[0]) result.email = mailtos[0];
  if (!result.email) result.email = firstEmail(html);

  return result;
}

// ── Social URL discovery ─────────────────────────────────────────────────────

export async function discoverSocialProfileUrls(
  businessName: string,
  city: string,
  websiteUrl?: string | null,
): Promise<DiscoveredSocialUrls> {
  const urls: DiscoveredSocialUrls = {
    facebook: null,
    instagram: null,
    yelp: null,
  };

  if (websiteUrl) {
    const html = await fetchPageHtml(websiteUrl, 6000);
    if (html) {
      const fbRe = /href=["'](https?:\/\/(?:www\.)?(?:facebook\.com|fb\.com)\/[^"'\s]+)["']/gi;
      let m: RegExpExecArray | null;
      while (!urls.facebook && (m = fbRe.exec(html)) !== null) {
        const u = m[1];
        if (!/sharer|dialog|plugins|share\.php/i.test(u)) urls.facebook = u;
      }

      const igRe = /href=["'](https?:\/\/(?:www\.)?instagram\.com\/[^"'\s]+)["']/gi;
      while (!urls.instagram && (m = igRe.exec(html)) !== null) {
        const u = m[1];
        if (!/\/p\/|\/reel\/|\/stories\//i.test(u)) urls.instagram = u;
      }

      const yelpRe = /href=["'](https?:\/\/(?:www\.)?yelp\.com\/biz\/[^"'\s]+)["']/gi;
      if ((m = yelpRe.exec(html)) !== null) {
        urls.yelp = m[1];
      }
    }
  }

  if (!urls.facebook || !urls.instagram || !urls.yelp) {
    const q = encodeURIComponent(`"${businessName}" ${city}`);
    const searches: Promise<void>[] = [];

    if (!urls.facebook) {
      searches.push(
        searchForSocialUrl(`${q}+site:facebook.com`, /https?:\/\/(?:www\.)?facebook\.com\/[^\s"'<>]+/i)
          .then((u) => { if (u) urls.facebook = u; }),
      );
    }
    if (!urls.instagram) {
      searches.push(
        searchForSocialUrl(`${q}+site:instagram.com`, /https?:\/\/(?:www\.)?instagram\.com\/[^\s"'<>]+/i)
          .then((u) => { if (u) urls.instagram = u; }),
      );
    }
    if (!urls.yelp) {
      searches.push(
        searchForSocialUrl(`${q}+site:yelp.com`, /https?:\/\/(?:www\.)?yelp\.com\/biz\/[^\s"'<>]+/i)
          .then((u) => { if (u) urls.yelp = u; }),
      );
    }

    await Promise.allSettled(searches);
  }

  return urls;
}

async function searchForSocialUrl(
  query: string,
  pattern: RegExp,
): Promise<string | null> {
  try {
    const url = `https://www.google.com/search?q=${query}&num=3`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 6000);
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html",
      },
      redirect: "follow",
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    const html = await res.text();
    const m = html.match(pattern);
    if (!m?.[0]) return null;
    let found = m[0];
    found = found.replace(/[&"'<>].*$/, "");
    return found;
  } catch {
    return null;
  }
}
