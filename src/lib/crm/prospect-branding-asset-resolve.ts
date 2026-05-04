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
 *   3. If a `logoUrl` was discovered, fetch it with a bounded reader and SSRF
 *      guard. PNG/JPEG return as bytes. SVG returns as text so `pdf-lib` can
 *      draw the vector paths directly.
 *
 * Failure isolation: every step is best-effort. A missing palette or logo
 * never throws; callers fall back to the LLM-driven defaults.
 */
import {
  fetchBrandAssetsFromUrl,
  isDecorativeContactIconUrl,
  isLanguageSwitcherOrFlagAssetUrl,
  isLikelyOpenGraphOrSocialBannerImageUrl,
  isLikelyThirdPartyTrustOrReviewMarketingBadgeUrl,
  isPartnerFinancingLogoBlob,
  isProfessionalAssociationOrCertificationLogoBlob,
  type BrandColorResult,
} from "@/lib/crm/brand-color-extract";
import { normalizeUrlForFetch } from "@/lib/crm/safe-url-fetch";
import { inflateSync } from "node:zlib";

export type ResolvedBrandAssets = {
  /** Up to 5 chromatic hexes (#RRGGBB) deduped from the homepage + CSS. */
  palette: string[];
  /** Most prominent chromatic hex (or `null` if extraction failed). */
  primary: string | null;
  /** Second hex when extraction surfaced more than one chromatic color. */
  accent: string | null;
  /** PNG/JPEG bytes of the prospect's logo, or `null` if none were usable. */
  logoPng: Buffer | null;
  /** SVG text of the prospect's logo, or `null` if none was usable. */
  logoSvg: string | null;
  /** The URL the logo was fetched from, for debugging / logs. */
  logoSourceUrl: string | null;
  /** Homepage HTML plus linked CSS (bounded) for font-family extraction. */
  markupForTypography: string | null;
};

const EMPTY: ResolvedBrandAssets = {
  palette: [],
  primary: null,
  accent: null,
  logoPng: null,
  logoSvg: null,
  logoSourceUrl: null,
  markupForTypography: null,
};

const PNG_SIGNATURE = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
]);
const JPEG_SIGNATURE = Buffer.from([0xff, 0xd8, 0xff]);

function sniffRasterFormat(buf: Buffer): "png" | "jpeg" | "webp" | "avif" | null {
  if (buf.length >= 8 && buf.subarray(0, 8).equals(PNG_SIGNATURE)) return "png";
  if (buf.length >= 3 && buf.subarray(0, 3).equals(JPEG_SIGNATURE)) return "jpeg";
  if (
    buf.length >= 12 &&
    buf.subarray(0, 4).toString("ascii") === "RIFF" &&
    buf.subarray(8, 12).toString("ascii") === "WEBP"
  ) {
    return "webp";
  }
  if (buf.length >= 12 && buf.subarray(4, 8).toString("ascii") === "ftyp") {
    const brand = buf.subarray(8, 12).toString("ascii");
    if (brand === "avif" || brand === "avis" || brand === "mif1") return "avif";
  }
  return null;
}

function unwrapLeadConnectorImageUrl(url: string): string {
  try {
    const parsed = new URL(url);
    const match = parsed.pathname.match(/\/u_(https?:\/\/.+)$/);
    return match ? decodeURIComponent(match[1]) : url;
  } catch {
    return url;
  }
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
 * response, oversized payloads, blocked hosts, or unsupported content.
 *
 * LeadConnector / HighLevel image CDNs use paths like
 * `/image/.../u_https://assets.cdn.filesafe.space/...`. We must try the
 * **proxy URL first**: direct storage URLs often 403 or fail from server
 * runtimes even when `images.leadconnectorhq.com` serves the same bytes.
 */
async function safeFetchLogoAsset(rawUrl: string): Promise<{
  buffer: Buffer | null;
  svg: string | null;
  sourceUrl: string;
} | null> {
  const trimmed = rawUrl.trim();
  const unwrapped = unwrapLeadConnectorImageUrl(trimmed);
  const candidateRaw: string[] =
    unwrapped !== trimmed ? [trimmed, unwrapped] : [trimmed];

  const max = logoFetchMaxBytes();

  for (const candidate of candidateRaw) {
    const normalized = normalizeUrlForFetch(candidate);
    if (!normalized) continue;

    let res: Response;
    try {
      res = await fetch(normalized, {
        redirect: "follow",
        signal: AbortSignal.timeout(LOGO_FETCH_TIMEOUT_MS),
        headers: {
          "User-Agent":
            "Mozilla/5.0 (compatible; ZenphoBot/1.0; +https://zenpho.com)",
          Accept: "image/png,image/jpeg,image/webp,image/avif,image/*",
        },
      });
    } catch {
      continue;
    }
    if (!res.ok) continue;

    const contentLength = Number.parseInt(
      res.headers.get("content-length") ?? "",
      10,
    );
    if (Number.isFinite(contentLength) && contentLength > max) {
      continue;
    }

    let buf: Buffer;
    try {
      const ab = await res.arrayBuffer();
      if (ab.byteLength > max) continue;
      buf = Buffer.from(ab);
    } catch {
      continue;
    }

    const fmt = sniffRasterFormat(buf);
    if (fmt) return { buffer: buf, svg: null, sourceUrl: normalized };

    const contentType = res.headers.get("content-type")?.toLowerCase() ?? "";
    if (
      buf.length >= 80 &&
      (contentType.includes("image/webp") ||
        contentType.includes("image/avif") ||
        contentType.includes("image/heif"))
    ) {
      return { buffer: buf, svg: null, sourceUrl: normalized };
    }

    const looksSvg =
      contentType.includes("svg") ||
      /\.svg(?:[?#].*)?$/i.test(normalized) ||
      buf.subarray(0, 256).toString("utf8").includes("<svg");
    if (!looksSvg) continue;

    const svg = buf.toString("utf8");
    if (!/<svg[\s>]/i.test(svg)) continue;

    return { buffer: null, svg, sourceUrl: normalized };
  }

  return null;
}

function rgbFromHex(hex: string): [number, number, number] | null {
  const m = hex.trim().match(/^#?([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/);
  if (!m) return null;
  let h = m[1];
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const n = Number.parseInt(h, 16);
  if (!Number.isFinite(n)) return null;
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function isUsableLogoHex(hex: string): boolean {
  const rgb = rgbFromHex(hex);
  if (!rgb) return false;
  const [r, g, b] = rgb;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const avg = (r + g + b) / 3;
  if (avg > 242 || avg < 18) return false;
  return max - min >= 18;
}

function normalizeHex(hex: string): string | null {
  const rgb = rgbFromHex(hex);
  if (!rgb) return null;
  const [r, g, b] = rgb;
  return `#${((1 << 24) | (r << 16) | (g << 8) | b)
    .toString(16)
    .slice(1)
    .toUpperCase()}`;
}

function normalizeRgbHex(r: number, g: number, b: number): string {
  const rr = Math.max(0, Math.min(255, r));
  const gg = Math.max(0, Math.min(255, g));
  const bb = Math.max(0, Math.min(255, b));
  return `#${((1 << 24) | (rr << 16) | (gg << 8) | bb)
    .toString(16)
    .slice(1)
    .toUpperCase()}`;
}

function svgPalette(svg: string | null): string[] {
  if (!svg) return [];
  const counts = new Map<string, number>();
  const re = /#[0-9a-fA-F]{3,6}\b/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(svg)) !== null) {
    const hex = normalizeHex(m[0]);
    if (!hex || !isUsableLogoHex(hex)) continue;
    counts.set(hex, (counts.get(hex) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([hex]) => hex)
    .slice(0, 5);
}

function logoColorWeight(r: number, g: number, b: number, count: number): number {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const avg = (r + g + b) / 3;
  const chroma = max - min;
  if (avg > 242) return -1;
  if (avg < 14) return count * 2.2;
  if (chroma < 18 && avg > 56) return -1;
  const redBoost = r > 130 && r > g * 1.35 && r > b * 1.35 ? 3.2 : 1;
  const darkBoost = avg < 55 ? 1.8 : 1;
  return count * redBoost * darkBoost;
}

function unfilterPngScanlines(raw: Buffer, width: number, height: number, channels: number): Buffer[] | null {
  const stride = width * channels;
  const rows: Buffer[] = [];
  let offset = 0;
  let prev = Buffer.alloc(stride);
  const paeth = (a: number, b: number, c: number) => {
    const p = a + b - c;
    const pa = Math.abs(p - a);
    const pb = Math.abs(p - b);
    const pc = Math.abs(p - c);
    return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
  };
  for (let y = 0; y < height; y++) {
    if (offset >= raw.length) return null;
    const filter = raw[offset++];
    const row = Buffer.from(raw.subarray(offset, offset + stride));
    offset += stride;
    if (row.length !== stride) return null;
    for (let i = 0; i < stride; i++) {
      const left = i >= channels ? row[i - channels] : 0;
      const up = prev[i] ?? 0;
      const upLeft = i >= channels ? prev[i - channels] ?? 0 : 0;
      if (filter === 1) row[i] = (row[i] + left) & 255;
      else if (filter === 2) row[i] = (row[i] + up) & 255;
      else if (filter === 3) row[i] = (row[i] + Math.floor((left + up) / 2)) & 255;
      else if (filter === 4) row[i] = (row[i] + paeth(left, up, upLeft)) & 255;
      else if (filter !== 0) return null;
    }
    rows.push(row);
    prev = row;
  }
  return rows;
}

function pngPalette(buffer: Buffer | null): string[] {
  if (!buffer || !buffer.subarray(0, 8).equals(PNG_SIGNATURE)) return [];
  let offset = 8;
  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = 0;
  const idats: Buffer[] = [];
  while (offset + 12 <= buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.toString("ascii", offset + 4, offset + 8);
    const data = buffer.subarray(offset + 8, offset + 8 + length);
    offset += 12 + length;
    if (type === "IHDR") {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
    } else if (type === "IDAT") {
      idats.push(data);
    } else if (type === "IEND") {
      break;
    }
  }
  const channels = colorType === 6 ? 4 : colorType === 2 ? 3 : 0;
  if (bitDepth !== 8 || !channels || width <= 0 || height <= 0 || idats.length === 0) return [];

  let raw: Buffer;
  try {
    raw = inflateSync(Buffer.concat(idats));
  } catch {
    return [];
  }
  const rows = unfilterPngScanlines(raw, width, height, channels);
  if (!rows) return [];

  const counts = new Map<string, { count: number; r: number; g: number; b: number }>();
  const step = Math.max(1, Math.floor((width * height) / 80_000));
  let seen = 0;
  let whiteCount = 0;
  for (const row of rows) {
    for (let x = 0; x < width; x += step) {
      const i = x * channels;
      const a = channels === 4 ? row[i + 3] : 255;
      if (a < 128) continue;
      const r = row[i];
      const g = row[i + 1];
      const b = row[i + 2];
      const avg = (r + g + b) / 3;
      if (avg > 248) {
        whiteCount++;
        continue;
      }
      const bucket = normalizeRgbHex(Math.round(r / 16) * 16, Math.round(g / 16) * 16, Math.round(b / 16) * 16);
      const existing = counts.get(bucket);
      if (existing) existing.count++;
      else counts.set(bucket, { count: 1, r, g, b });
      seen++;
    }
  }
  if (seen < 20) return [];
  const palette = [...counts.entries()]
    .map(([hex, item]) => ({
      hex,
      score: logoColorWeight(item.r, item.g, item.b, item.count),
    }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((item) => item.hex)
    .slice(0, 5);
  if (whiteCount > Math.max(120, seen * 0.08) && !palette.includes("#FFFFFF")) {
    palette.splice(Math.min(2, palette.length), 0, "#FFFFFF");
  }
  return palette.slice(0, 5);
}

function logoPaletteFromFetch(fetched: { buffer: Buffer | null; svg: string | null } | null): string[] {
  if (!fetched) return [];
  const fromSvg = svgPalette(fetched.svg);
  if (fromSvg.length > 0) return fromSvg;
  return pngPalette(fetched.buffer);
}

function isUsefulLogoPalette(palette: string[]): boolean {
  return palette.length > 0 && palette.some((hex) => {
    const rgb = rgbFromHex(hex);
    if (!rgb) return false;
    const [r, g, b] = rgb;
    const avg = (r + g + b) / 3;
    const chroma = Math.max(r, g, b) - Math.min(r, g, b);
    return avg < 58 || (chroma >= 45 && avg > 40 && avg < 230);
  });
}

/** Hero shots / stock photos often appear as JPEG; do not treat as wordmark. */
function isLikelyHeroOrStockPhotoUrl(resolvedUrl: string): boolean {
  let path = resolvedUrl.toLowerCase();
  try {
    path = new URL(resolvedUrl).pathname.toLowerCase();
  } catch {
    /* use full string */
  }
  return /-pic\.|_pic\.|\/pic-|hero|banner|slider|gallery|background|headshot|team-|\/team\/|staff|photo-|\/photos?\/|stock|essential-pic|why-impact|untitled-design|slider-|blog-|news-|project-/i.test(
    path,
  );
}

/** Never use palette heuristics to prefer these over a ranked header / JSON-LD logo. */
function isExcludedFromPaletteBestLogoUrl(resolvedUrl: string, rawCandidateUrl: string): boolean {
  return (
    isLikelyHeroOrStockPhotoUrl(resolvedUrl) ||
    isLikelyOpenGraphOrSocialBannerImageUrl(resolvedUrl, rawCandidateUrl) ||
    isLikelyThirdPartyTrustOrReviewMarketingBadgeUrl(resolvedUrl, rawCandidateUrl) ||
    isProfessionalAssociationOrCertificationLogoBlob(resolvedUrl, rawCandidateUrl)
  );
}

/**
 * JPEG logos exist, but generic JPEGs are usually hero/section photos. Only promote JPEG
 * when the path hints at a brand mark (or @2x / division assets from builders).
 */
function looksLikeRasterLogoFilename(resolvedUrl: string): boolean {
  if (isLikelyHeroOrStockPhotoUrl(resolvedUrl)) return false;
  let path = resolvedUrl.toLowerCase();
  try {
    path = new URL(resolvedUrl).pathname.toLowerCase();
  } catch {
    return false;
  }
  if (/\/icon[_-]|feature[_-]icon|sprite/i.test(path)) return false;
  return /logo|wordmark|brand|division|mark\.|@2x|scaled\.png|site-logo|ehe-|elite-impact|glass-website|organization|favicon|apple-touch/i.test(
    path,
  );
}

function logoPaletteQuality(palette: string[]): number {
  let score = 0;
  palette.slice(0, 5).forEach((hex, index) => {
    const rgb = rgbFromHex(hex);
    if (!rgb) return;
    const [r, g, b] = rgb;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const avg = (r + g + b) / 3;
    const chroma = max - min;
    const rankWeight = Math.max(1, 5 - index);
    if (avg < 58) score += 16 * rankWeight;
    if (chroma >= 120 && avg > 30 && avg < 220) score += 18 * rankWeight;
    else if (chroma >= 70 && avg > 35 && avg < 230) score += 10 * rankWeight;
    else if (chroma >= 40 && avg > 45 && avg < 225) score += 4 * rankWeight;
    if (avg > 190 && chroma < 75) score -= 6 * rankWeight;
  });
  return score;
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
  businessName?: string | null | undefined;
}): Promise<ResolvedBrandAssets> {
  const url = input.websiteUrl?.trim();
  if (!url) return { ...EMPTY };

  const normalized = normalizeUrlForFetch(url);
  if (!normalized) return { ...EMPTY };

  let assets: Awaited<ReturnType<typeof fetchBrandAssetsFromUrl>>;
  try {
    assets = await fetchBrandAssetsFromUrl(normalized, 12_000, {
      businessName: input.businessName,
    });
  } catch {
    return { ...EMPTY };
  }

  const { palette, primary, accent } = pickPrimaryAndAccent(assets.colors);

  let logoPng: Buffer | null = null;
  let logoSvg: string | null = null;
  let logoSourceUrl: string | null = null;
  const candidateLogoUrls = assets.logoUrls.length > 0 ? assets.logoUrls : assets.logoUrl ? [assets.logoUrl] : [];
  let logoPalette: string[] = [];
  let bestLogo:
    | {
        buffer: Buffer | null;
        svg: string | null;
        sourceUrl: string;
        palette: string[];
        quality: number;
      }
    | null = null;
  let firstRankedRaster:
    | {
        buffer: Buffer | null;
        svg: string | null;
        sourceUrl: string;
        palette: string[];
      }
    | null = null;

  for (const logoUrl of candidateLogoUrls.slice(0, 8)) {
    const resolvedCand = normalizeUrlForFetch(unwrapLeadConnectorImageUrl(logoUrl));
    if (resolvedCand && isPartnerFinancingLogoBlob(resolvedCand, logoUrl)) continue;
    const fetched = await safeFetchLogoAsset(logoUrl);
    if (!fetched) continue;
    if (isDecorativeContactIconUrl(fetched.sourceUrl)) continue;
    if (isLanguageSwitcherOrFlagAssetUrl(fetched.sourceUrl)) continue;
    const candidatePalette = logoPaletteFromFetch(fetched);
    const rasterFmt = fetched.buffer ? sniffRasterFormat(fetched.buffer) : null;

    if (
      !firstRankedRaster &&
      (fetched.buffer || fetched.svg) &&
      !isExcludedFromPaletteBestLogoUrl(fetched.sourceUrl, logoUrl)
    ) {
      firstRankedRaster = {
        buffer: fetched.buffer,
        svg: fetched.svg,
        sourceUrl: fetched.sourceUrl,
        palette: candidatePalette,
      };
    }

    const excludeFromBest = isExcludedFromPaletteBestLogoUrl(fetched.sourceUrl, logoUrl);

    if (isUsefulLogoPalette(candidatePalette) && !excludeFromBest) {
      const quality = logoPaletteQuality(candidatePalette);
      if (!bestLogo || quality > bestLogo.quality) {
        bestLogo = {
          buffer: fetched.buffer,
          svg: fetched.svg,
          sourceUrl: fetched.sourceUrl,
          palette: candidatePalette,
          quality,
        };
      }
    } else if (
      !excludeFromBest &&
      fetched.buffer &&
      looksLikeRasterLogoFilename(fetched.sourceUrl) &&
      (rasterFmt === "jpeg" || rasterFmt === "webp" || rasterFmt === "avif")
    ) {
      /** Real wordmarks are sometimes JPEG/WebP/AVIF (e.g. Wix); ignore hero photography. */
      const quality = 34;
      if (!bestLogo || quality > bestLogo.quality) {
        bestLogo = {
          buffer: fetched.buffer,
          svg: null,
          sourceUrl: fetched.sourceUrl,
          palette: [],
          quality,
        };
      }
    }
    if (!logoSourceUrl) {
      logoPng = fetched.buffer;
      logoSvg = fetched.svg;
      logoSourceUrl = fetched.sourceUrl;
    }
  }

  if (bestLogo) {
    logoPng = bestLogo.buffer;
    logoSvg = bestLogo.svg;
    logoSourceUrl = bestLogo.sourceUrl;
    logoPalette = bestLogo.palette;
  } else if (firstRankedRaster) {
    logoPng = firstRankedRaster.buffer;
    logoSvg = firstRankedRaster.svg;
    logoSourceUrl = firstRankedRaster.sourceUrl;
    logoPalette = firstRankedRaster.palette;
  }

  const finalPalette = logoPalette.length ? logoPalette : palette;
  const finalPrimary = logoPalette[0] ?? primary;
  const finalAccent = logoPalette.find((h) => h !== finalPrimary) ?? accent;

  return {
    palette: finalPalette,
    primary: finalPrimary,
    accent: finalAccent,
    logoPng,
    logoSvg,
    logoSourceUrl,
    markupForTypography: assets.markupForTypography,
  };
}
