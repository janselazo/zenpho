/**
 * Best-effort server fetch of public Instagram profile bio text.
 * Instagram may return a login wall or empty signals for server clients — callers should fall back to manual paste.
 */

import { parseInstagramProfileUrl } from "@/lib/crm/instagram-lead-parse";
import { MAX_FETCH_BYTES, normalizeUrlForFetch } from "@/lib/crm/safe-url-fetch";

/** Instagram is slow; allow more than generic prospect fetch. */
const INSTAGRAM_FETCH_TIMEOUT_MS = 25_000;

const GENERIC_OG =
  /^See Instagram photos and videos from @[\w.]+$/i;

/** og:description is often follower stats, not the profile bio (no links/email). */
function isFollowerStatsOg(s: string): boolean {
  return /\bFollowers\b[\s\S]{0,200}\bFollowing\b[\s\S]{0,200}\bPosts\b[\s\S]{0,120}See Instagram photos and videos/i.test(
    s
  );
}

function unescapeJsonString(s: string): string {
  return s
    .replace(/\\u([0-9a-fA-F]{4})/g, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "\r")
    .replace(/\\t/g, "\t")
    .replace(/\\\//g, "/")
    .replace(/\\\\/g, "\\")
    .replace(/\\"/g, '"');
}

function extractQuotedField(html: string, field: string): string | null {
  const re = new RegExp(`"${field}"\\s*:\\s*"((?:\\\\.|[^"\\\\])*)"`, "m");
  const m = re.exec(html);
  if (!m) return null;
  return unescapeJsonString(m[1]);
}

function extractOgDescription(html: string): string | null {
  const m =
    html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']*)["']/i) ||
    html.match(/<meta[^>]+content=["']([^"']*)["'][^>]+property=["']og:description["']/i);
  if (!m?.[1]) return null;
  return decodeBasicEntities(m[1].trim());
}

function decodeBasicEntities(s: string): string {
  return s
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n, 10)))
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

export type InstagramFetchBioResult =
  | {
      ok: true;
      handle: string;
      profileUrl: string;
      bioText: string;
      source: "embedded_json" | "og_description";
    }
  | { ok: false; error: string };

/**
 * Fetches https://www.instagram.com/{handle}/ and tries to read biography + full_name from embedded JSON or og:description.
 */
export async function fetchInstagramPublicProfileBio(
  rawUrlOrHandle: string
): Promise<InstagramFetchBioResult> {
  const parsed = parseInstagramProfileUrl(rawUrlOrHandle);
  if (!parsed.ok) {
    return { ok: false, error: parsed.error };
  }

  const normalized = normalizeUrlForFetch(parsed.profileUrl);
  if (!normalized) {
    return { ok: false, error: "Invalid profile URL." };
  }

  let res: Response;
  try {
    res = await fetch(normalized, {
      redirect: "follow",
      signal: AbortSignal.timeout(INSTAGRAM_FETCH_TIMEOUT_MS),
      headers: {
        "User-Agent":
          "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
        Accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      },
    });
  } catch {
    return { ok: false, error: "Could not reach Instagram (network or timeout)." };
  }

  if (!res.ok) {
    return { ok: false, error: `Instagram returned HTTP ${res.status}.` };
  }

  const buf = await res.arrayBuffer();
  const slice = buf.byteLength > MAX_FETCH_BYTES ? buf.slice(0, MAX_FETCH_BYTES) : buf;
  const html = new TextDecoder("utf-8", { fatal: false }).decode(slice);

  const biography =
    extractQuotedField(html, "biography") ?? extractQuotedField(html, "Biography");
  const fullName = extractQuotedField(html, "full_name") ?? extractQuotedField(html, "fullName");

  let og = extractOgDescription(html);
  const ogTrim = og?.trim() ?? "";
  if (og && (GENERIC_OG.test(ogTrim) || isFollowerStatsOg(ogTrim))) {
    og = null;
  }

  const jsonLines: string[] = [];
  if (fullName?.trim()) jsonLines.push(fullName.trim());
  if (biography != null && biography.trim()) jsonLines.push(biography.trim());

  if (jsonLines.length > 0) {
    return {
      ok: true,
      handle: parsed.handle,
      profileUrl: parsed.profileUrl,
      bioText: jsonLines.join("\n"),
      source: "embedded_json",
    };
  }

  if (og?.trim()) {
    return {
      ok: true,
      handle: parsed.handle,
      profileUrl: parsed.profileUrl,
      bioText: og.trim(),
      source: "og_description",
    };
  }

  if (/log in to instagram|login_required/i.test(html)) {
    return {
      ok: false,
      error:
        "Instagram did not expose a public bio to this request (often a login wall). Paste the bio manually, or try again later.",
    };
  }

  return {
    ok: false,
    error:
      "Instagram’s public HTML usually does not include the real bio (only follower counts in meta tags); the rest loads in the app after login. Paste the bio from the app or use an official Meta API integration—automated scraping is unreliable.",
  };
}
