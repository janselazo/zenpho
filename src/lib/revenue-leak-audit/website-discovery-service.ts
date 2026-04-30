import { normalizeUrlForFetch } from "@/lib/crm/safe-url-fetch";
import type { BusinessProfile } from "./types";

const SEARCH_TIMEOUT_MS = 8_000;
const FETCH_TIMEOUT_MS = 8_000;

const SEARCH_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
} as const;

const DIRECTORY_OR_SOCIAL_HOSTS = [
  "facebook.com",
  "instagram.com",
  "linkedin.com",
  "yelp.com",
  "google.com",
  "g.co",
  "goo.gl",
  "maps.apple.com",
  "bing.com",
  "mapquest.com",
  "yellowpages.com",
  "bbb.org",
  "opencare.com",
  "zocdoc.com",
  "healthgrades.com",
  "doximity.com",
  "sharecare.com",
  "dentistry.com",
  "birdeye.com",
  "dentalinsider.com",
  "vitals.com",
  "webmd.com",
];

function cityFromAddress(address: string | null): string {
  if (!address?.trim()) return "";
  const parts = address
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (parts.length >= 4) {
    // e.g. Street, City, ST ZIP, USA — city is usually third from end.
    return parts[parts.length - 3] ?? "";
  }
  if (parts.length === 3) {
    // Street, City, ST ZIP
    return parts[1] ?? "";
  }
  return parts[0] ?? "";
}

function cleanText(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/&amp;/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function meaningfulTokens(raw: string): string[] {
  const stop = new Set([
    "and",
    "the",
    "llc",
    "inc",
    "corp",
    "company",
    "co",
    "clinic",
    "office",
    "business",
  ]);
  return cleanText(raw)
    .split(" ")
    .filter((token) => token.length >= 4 && !stop.has(token));
}

function hostAllowed(url: string): boolean {
  try {
    const host = new URL(url).hostname.replace(/^www\./i, "").toLowerCase();
    return !DIRECTORY_OR_SOCIAL_HOSTS.some((blocked) => host === blocked || host.endsWith(`.${blocked}`));
  } catch {
    return false;
  }
}

function uniqueUrls(urls: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of urls) {
    const normalized = normalizeUrlForFetch(raw);
    if (!normalized || !hostAllowed(normalized)) continue;
    const key = normalized.replace(/\/+$/, "");
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(normalized);
  }
  return out;
}

function extractGoogleResultUrls(html: string): string[] {
  const urls: string[] = [];
  for (const match of html.matchAll(/\/url\?q=([^"&]+)/gi)) {
    try {
      urls.push(decodeURIComponent(match[1]));
    } catch {
      // Ignore malformed result URLs.
    }
  }
  for (const match of html.matchAll(/https?:\/\/[^\s"'<>]+/gi)) {
    urls.push(match[0].replace(/\\u003d/g, "=").replace(/\\u0026/g, "&"));
  }
  return uniqueUrls(urls);
}

async function searchWithSerper(query: string): Promise<string[]> {
  const key = process.env.SERPER_API_KEY?.trim();
  if (!key) return [];
  try {
    const res = await fetch("https://google.serper.dev/search", {
      method: "POST",
      signal: AbortSignal.timeout(SEARCH_TIMEOUT_MS),
      headers: {
        "Content-Type": "application/json",
        "X-API-KEY": key,
      },
      body: JSON.stringify({ q: query, num: 8 }),
    });
    if (!res.ok) return [];
    const json = (await res.json()) as {
      organic?: { link?: string }[];
      knowledgeGraph?: { website?: string };
    };
    return uniqueUrls([
      json.knowledgeGraph?.website ?? "",
      ...(json.organic ?? []).map((item) => item.link ?? ""),
    ]);
  } catch {
    return [];
  }
}

async function searchWithGoogleHtml(query: string): Promise<string[]> {
  try {
    const url = `https://www.google.com/search?q=${encodeURIComponent(query)}&num=8`;
    const res = await fetch(url, {
      signal: AbortSignal.timeout(SEARCH_TIMEOUT_MS),
      headers: SEARCH_HEADERS,
      redirect: "follow",
    });
    if (!res.ok) return [];
    return extractGoogleResultUrls(await res.text());
  } catch {
    return [];
  }
}

async function fetchCandidateHtml(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      headers: SEARCH_HEADERS,
      redirect: "follow",
    });
    if (!res.ok) return null;
    const contentType = res.headers.get("content-type") ?? "";
    const html = await res.text();
    if (!/html|xml/i.test(contentType) && !/<html[\s>]|<!doctype\s+html/i.test(html)) return null;
    return html.slice(0, 250_000);
  } catch {
    return null;
  }
}

function scoreCandidate(url: string, html: string, business: BusinessProfile): number {
  const haystack = cleanText(`${url} ${html.slice(0, 80_000)}`);
  const nameTokens = meaningfulTokens(business.name);
  const categoryTokens = meaningfulTokens(business.category ?? business.types.join(" "));
  const city = cityFromAddress(business.address);
  const cityTokens = meaningfulTokens(city);
  const phoneDigits = business.phone?.replace(/\D/g, "").slice(-10) ?? "";

  let score = 0;
  for (const token of nameTokens) {
    if (haystack.includes(token)) score += 2;
  }
  for (const token of categoryTokens.slice(0, 4)) {
    if (haystack.includes(token)) score += 1;
  }
  for (const token of cityTokens) {
    if (haystack.includes(token)) score += 1;
  }
  if (phoneDigits && haystack.replace(/\D/g, "").includes(phoneDigits)) score += 5;

  try {
    const host = new URL(url).hostname.replace(/^www\./i, "");
    const hostTokens = meaningfulTokens(host.replace(/\.[a-z.]+$/i, ""));
    for (const token of nameTokens) {
      if (hostTokens.some((hostToken) => hostToken.includes(token) || token.includes(hostToken))) {
        score += 2;
      }
    }
  } catch {
    // URL was already normalized, so this should not happen.
  }

  return score;
}

export async function discoverBusinessWebsite(
  business: BusinessProfile
): Promise<{ website: string | null; warning: string | null }> {
  if (business.website?.trim()) {
    return { website: business.website.trim(), warning: null };
  }

  const city = cityFromAddress(business.address);
  const query = [business.name, city, business.category, "official website"]
    .filter(Boolean)
    .join(" ");
  const candidates = uniqueUrls([
    ...(await searchWithSerper(query)),
    ...(await searchWithGoogleHtml(query)),
  ]).slice(0, 8);

  let best: { url: string; score: number } | null = null;
  for (const candidate of candidates) {
    const html = await fetchCandidateHtml(candidate);
    if (!html) continue;
    const score = scoreCandidate(candidate, html, business);
    if (!best || score > best.score) best = { url: candidate, score };
  }

  if (best && best.score >= 6) {
    return {
      website: best.url,
      warning: "Website was discovered from web search because Google Places did not provide websiteUri.",
    };
  }

  return { website: null, warning: null };
}
