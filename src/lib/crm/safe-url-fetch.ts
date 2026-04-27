/**
 * Minimal SSRF guardrails for server-side URL fetch (prospect website research).
 */

const BLOCKED_HOSTNAMES = new Set([
  "localhost",
  "127.0.0.1",
  "0.0.0.0",
  "::1",
  "metadata.google.internal",
  "metadata",
]);

const PRIVATE_IPV4_RANGES: { start: number; end: number }[] = [
  { start: ipToInt("10.0.0.0"), end: ipToInt("10.255.255.255") },
  { start: ipToInt("172.16.0.0"), end: ipToInt("172.31.255.255") },
  { start: ipToInt("192.168.0.0"), end: ipToInt("192.168.255.255") },
  { start: ipToInt("169.254.0.0"), end: ipToInt("169.254.255.255") },
  { start: ipToInt("127.0.0.0"), end: ipToInt("127.255.255.255") },
];

function ipToInt(ip: string): number {
  const parts = ip.split(".").map((p) => parseInt(p, 10));
  if (parts.length !== 4 || parts.some((n) => Number.isNaN(n) || n < 0 || n > 255)) {
    return -1;
  }
  return ((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0;
}

function isPrivateOrReservedIpv4(host: string): boolean {
  const m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(host);
  if (!m) return false;
  const ip = `${m[1]}.${m[2]}.${m[3]}.${m[4]}`;
  const n = ipToInt(ip);
  if (n < 0) return true;
  return PRIVATE_IPV4_RANGES.some((r) => n >= r.start && n <= r.end);
}

export function normalizeUrlForFetch(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  let url: URL;
  try {
    url = new URL(withScheme);
  } catch {
    return null;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return null;
  const host = url.hostname.toLowerCase();
  if (BLOCKED_HOSTNAMES.has(host)) return null;
  if (host.endsWith(".local") || host.endsWith(".localhost")) return null;
  if (isPrivateOrReservedIpv4(host)) return null;
  if (host === "[::1]" || host.startsWith("fc") || host.startsWith("fd")) return null;
  return url.toString();
}

/**
 * Maximum HTML size we'll parse from a public site. Wix pages routinely ship 500–700 KB of
 * inline runtime + content; the social/email footer often lives near the bottom. Raised from
 * 500_000 → 1_500_000 so we don't truncate Wix/Squarespace/Webflow pages mid-document.
 */
export const MAX_FETCH_BYTES = 1_500_000;
export const FETCH_TIMEOUT_MS = 15_000;

export function extractPageSignals(html: string): {
  pageTitle: string | null;
  metaDescription: string | null;
} {
  const titleMatch =
    html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']*)["']/i) ||
    html.match(/<meta[^>]+content=["']([^"']*)["'][^>]+property=["']og:title["']/i) ||
    html.match(/<title[^>]*>([^<]{1,300})<\/title>/i);
  const pageTitle = titleMatch?.[1]?.trim().replace(/\s+/g, " ") ?? null;

  const descMatch =
    html.match(
      /<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i
    ) ||
    html.match(
      /<meta[^>]+content=["']([^"']*)["'][^>]+name=["']description["']/i
    ) ||
    html.match(
      /<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']*)["']/i
    );
  const metaDescription = descMatch?.[1]?.trim().replace(/\s+/g, " ") ?? null;

  return { pageTitle, metaDescription };
}
