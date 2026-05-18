/**
 * Soft fallback for the website-snapshot API: when Microlink cannot capture a page (free-tier
 * limits, anti-bot blocks, render timeouts), try to surface the site's own OpenGraph image,
 * Twitter card image, or apple-touch-icon / favicon so the prospect tile still shows something
 * useful instead of "Website preview unavailable".
 *
 * This module is server-only and intentionally tiny — no HTML parser dependency. It pulls the
 * head bytes, runs a few regexes, and returns the best image URL it can find.
 */

import { decodeFetchedHtmlBuffer, normalizeUrlForFetch } from "@/lib/crm/safe-url-fetch";

const FETCH_TIMEOUT_MS = 8_000;
const MAX_HTML_BYTES = 500_000;

const BROWSER_HEADERS: HeadersInit = {
  accept: "text/html,application/xhtml+xml",
  "accept-language": "en-US,en;q=0.9",
  "user-agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
};

function resolveImageUrl(rawHref: string, baseUrl: string): string | null {
  const trimmed = rawHref.trim();
  if (!trimmed) return null;
  try {
    return new URL(trimmed, baseUrl).toString();
  } catch {
    return null;
  }
}

function pickMetaImage(html: string, baseUrl: string): string | null {
  const candidates: { match: RegExp; group: number }[] = [
    {
      match: /<meta[^>]+property=["']og:image:secure_url["'][^>]+content=["']([^"']+)["']/i,
      group: 1,
    },
    {
      match: /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image:secure_url["']/i,
      group: 1,
    },
    {
      match: /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i,
      group: 1,
    },
    {
      match: /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i,
      group: 1,
    },
    {
      match: /<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i,
      group: 1,
    },
    {
      match: /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image["']/i,
      group: 1,
    },
    {
      match:
        /<link[^>]+rel=["'](?:apple-touch-icon|apple-touch-icon-precomposed)["'][^>]+href=["']([^"']+)["']/i,
      group: 1,
    },
    {
      match:
        /<link[^>]+href=["']([^"']+)["'][^>]+rel=["'](?:apple-touch-icon|apple-touch-icon-precomposed)["']/i,
      group: 1,
    },
    {
      match: /<link[^>]+rel=["']icon["'][^>]+href=["']([^"']+)["']/i,
      group: 1,
    },
    {
      match: /<link[^>]+href=["']([^"']+)["'][^>]+rel=["']icon["']/i,
      group: 1,
    },
  ];

  for (const c of candidates) {
    const m = html.match(c.match);
    const raw = m?.[c.group];
    if (!raw) continue;
    const resolved = resolveImageUrl(raw, baseUrl);
    if (resolved) return resolved;
  }
  return null;
}

/**
 * Fetch a page's head HTML and return its OG/Twitter/icon image URL, or `/favicon.ico` as a
 * last resort. Returns `null` when nothing reachable is found.
 */
export async function discoverFallbackImageUrl(
  pageUrl: string,
): Promise<string | null> {
  const normalized = normalizeUrlForFetch(pageUrl);
  if (!normalized) return null;

  let html = "";
  try {
    const res = await fetch(normalized, {
      headers: BROWSER_HEADERS,
      redirect: "follow",
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!res.ok) {
      // Even a 403/503 sometimes still serves head bytes; try to read anyway.
      try {
        const buf = await res.arrayBuffer();
        const slice = buf.byteLength > MAX_HTML_BYTES ? buf.slice(0, MAX_HTML_BYTES) : buf;
        html = decodeFetchedHtmlBuffer(slice);
      } catch {
        return new URL("/favicon.ico", normalized).toString();
      }
    } else {
      const buf = await res.arrayBuffer();
      const slice = buf.byteLength > MAX_HTML_BYTES ? buf.slice(0, MAX_HTML_BYTES) : buf;
      html = decodeFetchedHtmlBuffer(slice);
    }
  } catch {
    return new URL("/favicon.ico", normalized).toString();
  }

  const direct = pickMetaImage(html, normalized);
  if (direct) return direct;

  return new URL("/favicon.ico", normalized).toString();
}
