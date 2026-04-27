/**
 * Resolves the prospect's REAL brand assets — palette + logo bitmap — from
 * their public website. Used by the brand-book PDF action so the generated
 * book renders with the actual brand identity instead of LLM-invented colors
 * and AI wordmarks.
 *
 * Strategy:
 *   1. Fetch homepage + up to 5 linked stylesheets via
 *      `fetchBrandAssetsFromUrl` (existing helper).
 *   2. Take its `colors.palette` (already de-duped, chromatic-only) as the
 *      extracted palette.
 *   3. If a `logoUrl` was discovered, fetch its bytes with a bounded reader
 *      and SSRF guard. Only return PNG / JPEG since `pdf-lib` embeds those
 *      natively — SVG / WebP / ICO fall back to `null` so the PDF uses the
 *      AI wordmark instead.
 *
 * Failure isolation: every step is best-effort. A missing palette or logo
 * never throws; callers fall back to the LLM-driven defaults.
 */
import {
  fetchBrandAssetsFromUrl,
  type BrandColorResult,
} from "@/lib/crm/brand-color-extract";
import { normalizeUrlForFetch } from "@/lib/crm/safe-url-fetch";

export type ResolvedBrandAssets = {
  /** Up to 5 chromatic hexes (#RRGGBB) deduped from the homepage + CSS. */
  palette: string[];
  /** Most prominent chromatic hex (or `null` if extraction failed). */
  primary: string | null;
  /** Second hex when extraction surfaced more than one chromatic color. */
  accent: string | null;
  /** PNG/JPEG bytes of the prospect's logo, or `null` if none were usable. */
  logoPng: Buffer | null;
  /** The URL the logo was fetched from, for debugging / logs. */
  logoSourceUrl: string | null;
};

const EMPTY: ResolvedBrandAssets = {
  palette: [],
  primary: null,
  accent: null,
  logoPng: null,
  logoSourceUrl: null,
};

const PNG_SIGNATURE = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
]);
const JPEG_SIGNATURE = Buffer.from([0xff, 0xd8, 0xff]);

function sniffRasterFormat(buf: Buffer): "png" | "jpeg" | null {
  if (buf.length >= 8 && buf.subarray(0, 8).equals(PNG_SIGNATURE)) return "png";
  if (buf.length >= 3 && buf.subarray(0, 3).equals(JPEG_SIGNATURE)) return "jpeg";
  return null;
}

function logoFetchMaxBytes(): number {
  const raw = process.env.BRANDING_LOGO_FETCH_MAX_BYTES?.trim();
  if (raw) {
    const n = Number.parseInt(raw, 10);
    if (Number.isFinite(n) && n >= 50_000) return n;
  }
  return 1_500_000;
}

const LOGO_FETCH_TIMEOUT_MS = 8_000;

/**
 * Bounded image fetch with SSRF guard. Returns `null` for any non-2xx
 * response, oversized payloads, blocked hosts, or non-PNG/JPEG content.
 */
async function safeFetchLogoBuffer(rawUrl: string): Promise<{
  buffer: Buffer;
  sourceUrl: string;
} | null> {
  const normalized = normalizeUrlForFetch(rawUrl);
  if (!normalized) return null;

  let res: Response;
  try {
    res = await fetch(normalized, {
      redirect: "follow",
      signal: AbortSignal.timeout(LOGO_FETCH_TIMEOUT_MS),
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; ZenphoBot/1.0; +https://zenpho.com)",
        Accept: "image/png,image/jpeg,image/*",
      },
    });
  } catch {
    return null;
  }
  if (!res.ok) return null;

  const max = logoFetchMaxBytes();
  const contentLength = Number.parseInt(
    res.headers.get("content-length") ?? "",
    10,
  );
  if (Number.isFinite(contentLength) && contentLength > max) {
    return null;
  }

  let buf: Buffer;
  try {
    const ab = await res.arrayBuffer();
    if (ab.byteLength > max) return null;
    buf = Buffer.from(ab);
  } catch {
    return null;
  }

  const fmt = sniffRasterFormat(buf);
  if (!fmt) return null;

  return { buffer: buf, sourceUrl: normalized };
}

function pickPrimaryAndAccent(colors: BrandColorResult | null): {
  palette: string[];
  primary: string | null;
  accent: string | null;
} {
  if (!colors) return { palette: [], primary: null, accent: null };
  return {
    palette: colors.palette,
    primary: colors.primary,
    accent: colors.accent,
  };
}

/**
 * Resolve real brand assets for a prospect website. Always succeeds (returns
 * an `EMPTY` result on any failure path) — never throws.
 */
export async function resolveProspectBrandAssets(input: {
  websiteUrl: string | null | undefined;
}): Promise<ResolvedBrandAssets> {
  const url = input.websiteUrl?.trim();
  if (!url) return { ...EMPTY };

  const normalized = normalizeUrlForFetch(url);
  if (!normalized) return { ...EMPTY };

  let assets: Awaited<ReturnType<typeof fetchBrandAssetsFromUrl>>;
  try {
    assets = await fetchBrandAssetsFromUrl(normalized);
  } catch {
    return { ...EMPTY };
  }

  const { palette, primary, accent } = pickPrimaryAndAccent(assets.colors);

  let logoPng: Buffer | null = null;
  let logoSourceUrl: string | null = null;
  if (assets.logoUrl) {
    const fetched = await safeFetchLogoBuffer(assets.logoUrl);
    if (fetched) {
      logoPng = fetched.buffer;
      logoSourceUrl = fetched.sourceUrl;
    }
  }

  return {
    palette,
    primary,
    accent,
    logoPng,
    logoSourceUrl,
  };
}
