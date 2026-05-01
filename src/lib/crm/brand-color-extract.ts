/**
 * Extracts dominant brand colors from a website's HTML by parsing CSS custom properties,
 * meta theme-color, inline styles, and weighted header/logo-area CSS backgrounds, then
 * ranking chromatic colors (max zone weight × frequency, with a small hue tie-break for
 * green/teal vs magenta/orange theme variants).
 * Runs server-side — no DOM required.
 */

const HEX_RE = /#(?:[0-9a-fA-F]{3,4}){1,2}\b/g;
const RGB_RE = /rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})(?:\s*,\s*[\d.]+)?\s*\)/g;
const HSL_RE = /hsla?\(\s*(\d{1,3})\s*,\s*(\d{1,3})%\s*,\s*(\d{1,3})%(?:\s*,\s*[\d.]+)?\s*\)/g;

type RGBTuple = [number, number, number];

function hexToRgb(hex: string): RGBTuple | null {
  let h = hex.replace(/^#/, "");
  if (h.length === 3 || h.length === 4) h = h.slice(0, 3).split("").map((c) => c + c).join("");
  else if (h.length === 8) h = h.slice(0, 6);
  if (h.length !== 6) return null;
  const n = parseInt(h, 16);
  if (isNaN(n)) return null;
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function hslToRgb(h: number, s: number, l: number): RGBTuple {
  const sn = s / 100;
  const ln = l / 100;
  const c = (1 - Math.abs(2 * ln - 1)) * sn;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = ln - c / 2;
  let r = 0, g = 0, b = 0;
  if (h < 60) { r = c; g = x; }
  else if (h < 120) { r = x; g = c; }
  else if (h < 180) { g = c; b = x; }
  else if (h < 240) { g = x; b = c; }
  else if (h < 300) { r = x; b = c; }
  else { r = c; b = x; }
  return [Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255)];
}

function rgbToHex([r, g, b]: RGBTuple): string {
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}

function isNeutral([r, g, b]: RGBTuple): boolean {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const chroma = max - min;
  const lightness = (max + min) / 2;
  if (lightness < 15 || lightness > 240) return true;
  return chroma < 25;
}

function isNearWhiteOrBlack([r, g, b]: RGBTuple): boolean {
  const avg = (r + g + b) / 3;
  return avg < 20 || avg > 235;
}

function colorDistance(a: RGBTuple, b: RGBTuple): number {
  return Math.sqrt((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2);
}

/** Higher weight = stronger signal for “primary” brand color (logo strip beats generic top bar). */
function headerSelectorWeight(selectorRaw: string): number {
  const s = selectorRaw.toLowerCase().replace(/\\/g, "");
  if (/mainheader|btlogoarea|logo-area|brand-logo|site-title|custom-logo|navbar-brand/.test(s)) {
    return 26;
  }
  if (/topbar|belowlogo|preheader|announcement-bar|utilitybar/.test(s)) {
    return 7;
  }
  if (/\bheader\b|masthead|site-header|\.header|navbar|navigation|nav\s|main-nav/.test(s)) {
    return 12;
  }
  if (/\bnav\b|menuport|primary-menu|main-menu/.test(s)) {
    return 9;
  }
  return 0;
}

type WeightedColor = { rgb: RGBTuple; weight: number };

/**
 * Pull solid header/nav/logo background colors. Uses selector-aware weights so the main
 * logo strip (e.g. Bold Themes `.mainHeader .btLogoArea`) beats accent top bars and beats
 * counting orange CTA variables that appear first in the document.
 */
function extractHeaderZoneBackgrounds(html: string): WeightedColor[] {
  const out: WeightedColor[] = [];
  const blockRe = /([^{]{1,520})\{([^}]{1,1400})\}/gi;
  let m: RegExpExecArray | null;
  while ((m = blockRe.exec(html)) !== null) {
    const selector = m[1];
    if (!/header|nav|logo|topbar|masthead|belowlogo|mainheader|menuport|navbar/i.test(selector)) {
      continue;
    }
    const zoneW = headerSelectorWeight(selector);
    if (zoneW === 0) continue;
    const block = m[2];
    const bgRe = /background(?:-color)?\s*:\s*([^;]+)/gi;
    let bm: RegExpExecArray | null;
    while ((bm = bgRe.exec(block)) !== null) {
      const raw = bm[1].trim();
      if (/gradient|url\(|image\/|var\(/i.test(raw)) continue;
      const c = parseColorValue(raw.split(/\s+/)[0] ?? raw);
      if (c && !isNeutral(c) && !isNearWhiteOrBlack(c)) {
        out.push({ rgb: c, weight: zoneW });
      }
    }
  }
  return out;
}

function extractMetaThemeWeighted(html: string): WeightedColor[] {
  const out: WeightedColor[] = [];
  const themeColorRe = /<meta\s+name=["']theme-color["']\s+content=["']([^"']+)["']/gi;
  let m: RegExpExecArray | null;
  while ((m = themeColorRe.exec(html)) !== null) {
    const rgb = parseColorValue(m[1].trim());
    if (rgb && !isNeutral(rgb) && !isNearWhiteOrBlack(rgb)) out.push({ rgb, weight: 15 });
  }
  const msColorRe = /<meta\s+name=["']msapplication-TileColor["']\s+content=["']([^"']+)["']/gi;
  while ((m = msColorRe.exec(html)) !== null) {
    const rgb = parseColorValue(m[1].trim());
    if (rgb && !isNeutral(rgb) && !isNearWhiteOrBlack(rgb)) out.push({ rgb, weight: 12 });
  }
  return out;
}

function cssVarNameWeight(varName: string): number {
  const n = varName.toLowerCase();
  if (WP_DEFAULT_VAR_RE.test(varName)) return 0;
  if (/(?:^|-)primary\b|brand|theme-color-1|global-color-1|color_1\b/.test(n)) return 10;
  if (/header|masthead|toolbar|navbar/.test(n) && /color/.test(n)) return 8;
  if (/accent|secondary|cta|button|highlight|link|call-to-action/.test(n)) return 3;
  return 4;
}

function extractCssVarsWeighted(html: string): WeightedColor[] {
  const out: WeightedColor[] = [];
  const cssVarRe = /(--(?:[a-z0-9_-]*(?:color|primary|brand|accent)[a-z0-9_-]*)):\s*([^;}{]+)/gi;
  let m: RegExpExecArray | null;
  while ((m = cssVarRe.exec(html)) !== null) {
    const w = cssVarNameWeight(m[1]);
    if (w === 0) continue;
    const rgb = parseColorValue(m[2].trim().split(/\s+/)[0] ?? m[2].trim());
    if (rgb && !isNeutral(rgb) && !isNearWhiteOrBlack(rgb)) {
      out.push({ rgb, weight: w });
    }
  }
  return out;
}

function dedupeColors(colors: RGBTuple[], minDist = 40): RGBTuple[] {
  const out: RGBTuple[] = [];
  for (const c of colors) {
    if (out.every((existing) => colorDistance(existing, c) >= minDist)) {
      out.push(c);
    }
  }
  return out;
}

function extractAllColors(html: string): RGBTuple[] {
  const raw: RGBTuple[] = [];

  let match: RegExpExecArray | null;

  const hexRe = new RegExp(HEX_RE.source, "g");
  while ((match = hexRe.exec(html)) !== null) {
    const rgb = hexToRgb(match[0]);
    if (rgb) raw.push(rgb);
  }

  const rgbRe = new RegExp(RGB_RE.source, "g");
  while ((match = rgbRe.exec(html)) !== null) {
    raw.push([parseInt(match[1]), parseInt(match[2]), parseInt(match[3])]);
  }

  const hslRe = new RegExp(HSL_RE.source, "g");
  while ((match = hslRe.exec(html)) !== null) {
    raw.push(hslToRgb(parseInt(match[1]), parseInt(match[2]), parseInt(match[3])));
  }

  return raw;
}

/** Parse a color value (hex, rgb, hsl) into an RGBTuple. Returns null if unrecognised. */
function parseColorValue(val: string): RGBTuple | null {
  const hex = hexToRgb(val);
  if (hex) return hex;
  const rgbMatch = val.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
  if (rgbMatch) return [parseInt(rgbMatch[1]), parseInt(rgbMatch[2]), parseInt(rgbMatch[3])];
  const hslMatch = val.match(/hsla?\(\s*(\d+)\s*,\s*(\d+)%\s*,\s*(\d+)%/);
  if (hslMatch) return hslToRgb(parseInt(hslMatch[1]), parseInt(hslMatch[2]), parseInt(hslMatch[3]));
  return null;
}

/**
 * CSS variable names that are WordPress/platform defaults — NOT actual brand colors.
 * These bloat priority extraction with generic palette values on every WP site.
 */
const WP_DEFAULT_VAR_RE = /^--wp-(?:admin-theme|block-synced|bound-block)|^--wp--preset--color--(?:black|white|cyan-bluish-gray|pale-pink|vivid-red|luminous-vivid-orange|luminous-vivid-amber|light-green-cyan|vivid-green-cyan|pale-cyan-blue|vivid-cyan-blue|vivid-purple)/i;

function mergeMaxWeight(byHex: Map<string, number>, list: WeightedColor[]): void {
  for (const { rgb, weight } of list) {
    if (isNeutral(rgb) || isNearWhiteOrBlack(rgb)) continue;
    const k = rgbToHex(rgb);
    byHex.set(k, Math.max(byHex.get(k) ?? 0, weight));
  }
}

/** Slight nudge so logo-strip greens/blues beat equally-weighted magenta/orange theme variants (common on WP/Bold). */
function primaryHueNudge(rgb: RGBTuple): number {
  const [r, g, b] = rgb.map((x) => x / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  if (d < 0.04) return 0;
  let h: number;
  if (max === r) h = ((((g - b) / d) % 6) * 60 + 360) % 360;
  else if (max === g) h = ((b - r) / d + 2) * 60;
  else h = ((r - g) / d + 4) * 60;
  if (h >= 80 && h <= 168) return 22;
  if (h >= 175 && h <= 255) return 12;
  if (h >= 285 && h <= 345) return -14;
  if (h >= 10 && h <= 48) return -6;
  return 0;
}

function scoreColorKey(
  hexKey: string,
  maxWeightByHex: Map<string, number>,
  countMap: Map<string, { count: number; rgb: RGBTuple }>
): number {
  const rgb = hexToRgb(hexKey);
  if (!rgb || isNeutral(rgb) || isNearWhiteOrBlack(rgb)) return -1;
  const w = maxWeightByHex.get(hexKey) ?? 0;
  const cnt = countMap.get(hexKey)?.count ?? 0;
  return w * 100 + Math.sqrt(cnt + 1) * 4 + primaryHueNudge(rgb);
}

function rankColorKeys(
  maxWeightByHex: Map<string, number>,
  countMap: Map<string, { count: number; rgb: RGBTuple }>
): string[] {
  const keys = new Set<string>([...maxWeightByHex.keys(), ...countMap.keys()]);
  return [...keys].filter((k) => scoreColorKey(k, maxWeightByHex, countMap) >= 0).sort(
    (a, b) => scoreColorKey(b, maxWeightByHex, countMap) - scoreColorKey(a, maxWeightByHex, countMap)
  );
}

export type BrandColorResult = {
  primary: string;
  accent: string | null;
  palette: string[];
};

/**
 * Best-effort brand color extraction from raw HTML. Returns hex strings.
 * Priority: meta theme-color → CSS custom properties (--primary, --brand, etc.) →
 * nav/header background → frequency analysis of all non-neutral colors.
 */
export function extractBrandColors(html: string): BrandColorResult | null {
  if (!html || typeof html !== "string") return null;

  const allRaw = extractAllColors(html);
  const allChromatic = allRaw.filter((c) => !isNeutral(c) && !isNearWhiteOrBlack(c));
  if (allChromatic.length === 0) return null;

  const countMap = new Map<string, { count: number; rgb: RGBTuple }>();
  for (const c of allChromatic) {
    const key = rgbToHex(c);
    const entry = countMap.get(key);
    if (entry) entry.count++;
    else countMap.set(key, { count: 1, rgb: c });
  }

  const maxWeightByHex = new Map<string, number>();
  mergeMaxWeight(maxWeightByHex, extractMetaThemeWeighted(html));
  mergeMaxWeight(maxWeightByHex, extractCssVarsWeighted(html));
  mergeMaxWeight(maxWeightByHex, extractHeaderZoneBackgrounds(html));

  const rankedKeys = rankColorKeys(maxWeightByHex, countMap);
  if (rankedKeys.length === 0) return null;

  const orderedRgb: RGBTuple[] = [];
  for (const k of rankedKeys) {
    const c = hexToRgb(k);
    if (!c) continue;
    if (orderedRgb.every((o) => colorDistance(o, c) >= 28)) {
      orderedRgb.push(c);
      if (orderedRgb.length >= 8) break;
    }
  }
  if (orderedRgb.length === 0) return null;

  const primary = orderedRgb[0];
  let accent: RGBTuple | null = orderedRgb[1] ?? null;
  if (accent && colorDistance(primary, accent) < 35) {
    accent = orderedRgb.find((c) => colorDistance(primary, c) >= 35) ?? null;
  }
  const palette = dedupeColors(orderedRgb, 32)
    .slice(0, 5)
    .map(rgbToHex);

  return {
    primary: rgbToHex(primary),
    accent: accent ? rgbToHex(accent) : null,
    palette: palette.length > 0 ? palette : [rgbToHex(primary)],
  };
}

// ── Shared helpers ──────────────────────────────────────────────────────────

function resolveUrl(raw: string, baseUrl: string): string | null {
  try {
    return new URL(raw, baseUrl).href;
  } catch {
    return null;
  }
}

// ── HTML / CSS fetch helpers ─────────────────────────────────────────────────

const FETCH_HEADERS = {
  "User-Agent": "Mozilla/5.0 (compatible; ZenphoBot/1.0; +https://zenpho.com)",
  Accept: "text/html,application/xhtml+xml,text/css",
};

function normalizeUrl(url: string): string {
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

/**
 * Use the site root for brand HTML/CSS so deep links (e.g. /contact/...) still load the same
 * header, JSON-LD, and logo as the homepage.
 */
export function brandHomepageForFetch(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return trimmed;
  const withProto = normalizeUrl(trimmed);
  try {
    const u = new URL(withProto);
    return `${u.origin}/`;
  } catch {
    return withProto;
  }
}

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#039;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#(\d+);/g, (_, n: string) => {
      const code = Number(n);
      return Number.isFinite(code) ? String.fromCharCode(code) : "";
    })
    .replace(/&#x([0-9a-f]+);/gi, (_, n: string) => {
      const code = parseInt(n, 16);
      return Number.isFinite(code) ? String.fromCharCode(code) : "";
    });
}

function cleanText(value: string, max = 240): string {
  const text = decodeHtmlEntities(value)
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

function uniquePush(out: string[], value: string, maxItems: number): void {
  const cleaned = cleanText(value);
  if (!cleaned || cleaned.length < 2) return;
  if (out.some((existing) => existing.toLowerCase() === cleaned.toLowerCase())) return;
  if (out.length < maxItems) out.push(cleaned);
}

function extractTitle(html: string): string | null {
  const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1];
  return title ? cleanText(title, 160) || null : null;
}

function extractHeadingTexts(html: string): string[] {
  const out: string[] = [];
  const re = /<h[1-4][^>]*>([\s\S]*?)<\/h[1-4]>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) uniquePush(out, m[1], 12);
  return out;
}

function extractAnchorTexts(html: string): string[] {
  const out: string[] = [];
  const re = /<a\s+[^>]*>([\s\S]*?)<\/a>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const text = cleanText(m[1], 80);
    if (!text || text.length > 48) continue;
    if (/^(x|menu|leer más|read more)$/i.test(text)) continue;
    uniquePush(out, text, 12);
  }
  return out;
}

function extractKeyPhrases(html: string): string[] {
  const out: string[] = [];
  const text = cleanText(html, 5000);
  const sentenceRe = /([^.!?。！？\n]{45,220}[.!?。！？])/g;
  let m: RegExpExecArray | null;
  while ((m = sentenceRe.exec(text)) !== null) {
    const phrase = m[1].trim();
    if (/cookie|privacy|derechos de autor|all rights reserved/i.test(phrase)) continue;
    uniquePush(out, phrase, 8);
  }
  return out;
}

function extractBrandImageUrls(html: string, baseUrl: string): string[] {
  const out: string[] = [];
  const re = /<img\s+[^>]*>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const tag = m[0];
    if (!/(logo|brand|hero|groom|pet|dog|cat|canin|mascot|mascota)/i.test(tag)) continue;
    const src =
      tag.match(/data-(?:lazy-)?src=["']([^"']+)["']/i)?.[1] ??
      tag.match(/data-srcset=["']([^"'\s,]+)/i)?.[1] ??
      tag.match(/\bsrc=["']([^"']+)["']/i)?.[1] ??
      "";
    if (!src || /^data:/i.test(src)) continue;
    const u = resolveUrl(src, baseUrl);
    if (u && !out.includes(u) && out.length < 8) out.push(u);
  }
  return out;
}

export type WebsiteBrandFacts = {
  title: string | null;
  headings: string[];
  navLabels: string[];
  keyPhrases: string[];
  imageUrls: string[];
};

export function extractWebsiteBrandFacts(html: string, baseUrl: string): WebsiteBrandFacts | null {
  if (!html || typeof html !== "string") return null;
  const facts: WebsiteBrandFacts = {
    title: extractTitle(html),
    headings: extractHeadingTexts(html),
    navLabels: extractAnchorTexts(html),
    keyPhrases: extractKeyPhrases(html),
    imageUrls: extractBrandImageUrls(html, baseUrl),
  };
  if (
    !facts.title &&
    facts.headings.length === 0 &&
    facts.navLabels.length === 0 &&
    facts.keyPhrases.length === 0 &&
    facts.imageUrls.length === 0
  ) {
    return null;
  }
  return facts;
}

export async function fetchPageHtml(
  url: string,
  timeoutMs = 8000,
): Promise<string | null> {
  if (!url?.trim()) return null;
  const normalized = normalizeUrl(url);
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(normalized, {
      signal: controller.signal,
      headers: { ...FETCH_HEADERS, Accept: "text/html,application/xhtml+xml" },
      redirect: "follow",
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    const ct = res.headers.get("content-type") ?? "";
    if (!ct.includes("html") && !ct.includes("xml")) return null;
    return await res.text();
  } catch {
    return null;
  }
}

/** Extract stylesheet URLs from <link rel="stylesheet"> tags in raw HTML. */
function extractLinkedStylesheetUrls(html: string, baseUrl: string): string[] {
  const urls: string[] = [];
  const re = /<link\s+[^>]*rel=["']stylesheet["'][^>]*href=["']([^"']+)["']/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const u = resolveUrl(m[1].trim(), baseUrl);
    if (u) urls.push(u);
  }
  const revRe = /<link\s+[^>]*href=["']([^"']+)["'][^>]*rel=["']stylesheet["']/gi;
  while ((m = revRe.exec(html)) !== null) {
    const u = resolveUrl(m[1].trim(), baseUrl);
    if (u && !urls.includes(u)) urls.push(u);
  }
  return urls;
}

/**
 * Fetch up to `limit` external CSS files in parallel (best-effort, short timeout).
 * Returns concatenated CSS text for color scanning.
 */
async function fetchExternalCss(
  stylesheetUrls: string[],
  timeoutMs: number,
  limit = 3,
): Promise<string> {
  const subset = stylesheetUrls.slice(0, limit);
  if (subset.length === 0) return "";
  const results = await Promise.allSettled(
    subset.map(async (u) => {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const res = await fetch(u, {
          signal: controller.signal,
          headers: FETCH_HEADERS,
          redirect: "follow",
        });
        clearTimeout(timer);
        if (!res.ok) return "";
        const text = await res.text();
        return text.length > 500_000 ? text.slice(0, 500_000) : text;
      } catch {
        clearTimeout(timer);
        return "";
      }
    }),
  );
  return results
    .map((r) => (r.status === "fulfilled" ? r.value : ""))
    .join("\n");
}

/**
 * Fetches a URL and extracts brand colors from its HTML.
 * Returns null if fetch fails or no colors are found.
 */
export async function fetchAndExtractBrandColors(
  url: string,
  timeoutMs = 8000,
): Promise<BrandColorResult | null> {
  const html = await fetchPageHtml(url, timeoutMs);
  if (!html) return null;
  return extractBrandColors(html);
}

// ── Logo extraction ──────────────────────────────────────────────────────────

type LogoCandidate = { url: string; score: number; index: number };

type LogoExtractionOptions = {
  businessName?: string | null;
};

function brandTokens(value: string | null | undefined): string[] {
  if (!value) return [];
  const stop = new Set([
    "the",
    "and",
    "company",
    "co",
    "llc",
    "inc",
    "corp",
    "corporation",
    "service",
    "services",
  ]);
  return value
    .toLowerCase()
    .replace(/&amp;/g, " and ")
    .split(/[^a-z0-9]+/g)
    .filter((token) => token.length >= 3 && !stop.has(token))
    .slice(0, 8);
}

function businessMatchScore(context: string, tokens: readonly string[]): number {
  if (tokens.length === 0) return 0;
  const text = context.toLowerCase();
  const matches = tokens.filter((token) => text.includes(token)).length;
  return matches === 0 ? 0 : 18 + matches * 10;
}

/**
 * Map pin, phone, email, and similar row icons — not the business wordmark.
 * Matches Weebly-style `/icon-map_3.png`, contact sprites, etc.
 */
/**
 * Language switchers (WPML, flags, locale icons) often sit in the header/nav and were
 * mis-classified as the brand logo (e.g. Spanish flag on bilingual dental sites).
 */
export function isLanguageSwitcherOrFlagAssetUrl(resolvedUrl: string): boolean {
  if (!resolvedUrl.trim()) return false;
  let full = resolvedUrl.toLowerCase();
  let path = full;
  try {
    const u = new URL(resolvedUrl);
    path = u.pathname.toLowerCase();
    const qsL = u.search.toLowerCase();
    full = `${path}${qsL}`.replace(/\/+$/, "");
  } catch {
    /* compare full string */
  }

  if (
    /\/flags?\/|country[-_]?flags?|famfamfam|countryflags\.|flag-sprite|locale[-_]?flag|lang[-_]?flag|lang[-_]?switch|language[-_]?switch|wpml|sitepress|weglot|gtranslate|translatepress|polylang|i18n[-_]flags?/i.test(
      full,
    )
  ) {
    return true;
  }

  const file = path.split("/").pop() ?? "";
  const base = file.replace(/\.(png|jpe?g|gif|webp|svg|avif)$/i, "");

  if (
    /flag[-_]?(es|en|fr|de|pt|us|uk|gb|spa|esp)|^(es|en|fr|de|pt)[-_]flag|^flag[-_]spain|^spain[-_]?flag|^spanish$|^spain$|^espana$|^english[-_]?flag|^usa[-_]?flag|^uk[-_]?flag/i.test(
      base,
    )
  ) {
    return true;
  }

  const shortLocaleFile = /^[a-z]{2}(-[a-z]{2})?$/i.test(base);
  if (
    shortLocaleFile &&
    /lang|language|translate|wpml|locale|i18n|switcher|ls-|-ls-|menu-item-object-wpml|multilingual/i.test(full)
  ) {
    return true;
  }

  return false;
}

export function isDecorativeContactIconUrl(resolvedUrl: string): boolean {
  if (!resolvedUrl.trim()) return false;
  let path = resolvedUrl.toLowerCase();
  try {
    path = new URL(resolvedUrl).pathname.toLowerCase();
  } catch {
    /* compare full string */
  }
  return /\/icon-map|\/icon-phone|\/icon-email|\/icon-fax|map-marker|map_pin|\/pin-icon|location-pin|location_pin|marker-icon|marker_pin|\/map[_-]?icon|\/marker[_-]?(small|tiny)/i.test(
    path,
  );
}

function pushLogoCandidate(
  candidates: LogoCandidate[],
  seen: Set<string>,
  rawUrl: string,
  baseUrl: string,
  score: number,
  index: number,
): void {
  if (!rawUrl || /^data:/i.test(rawUrl)) return;
  if (/\/funnel\/icons\/|social-media-icon|facebook|instagram|youtube|tiktok/i.test(rawUrl)) return;
  const url = resolveUrl(rawUrl, baseUrl);
  if (!url || seen.has(url)) return;
  if (isDecorativeContactIconUrl(url)) return;
  if (isLanguageSwitcherOrFlagAssetUrl(url)) return;
  seen.add(url);
  candidates.push({ url, score, index });
}

const LD_ORG_TYPE_RE =
  /Organization|LocalBusiness|Brand|Corporation|HomeAndConstructionBusiness|ProfessionalService|RoofingContractor|WebSite/i;

function pushLdVisualUrls(
  field: unknown,
  acc: string[],
): void {
  if (field == null) return;
  if (typeof field === "string" && field.trim()) {
    acc.push(field.trim());
    return;
  }
  if (Array.isArray(field)) {
    for (const item of field) pushLdVisualUrls(item, acc);
    return;
  }
  if (typeof field === "object") {
    const im = field as { url?: unknown; contentUrl?: unknown };
    const u =
      typeof im.url === "string" && im.url.trim()
        ? im.url.trim()
        : typeof im.contentUrl === "string" && im.contentUrl.trim()
          ? im.contentUrl.trim()
          : null;
    if (u) acc.push(u);
  }
}

function collectLogoUrlsFromLdObject(node: unknown, acc: string[], visited: Set<unknown>): void {
  if (node == null || typeof node !== "object") return;
  if (visited.has(node)) return;
  visited.add(node);
  const o = node as Record<string, unknown>;
  const logo = o.logo;
  if (typeof logo === "string" && logo.trim()) {
    acc.push(logo.trim());
  } else if (logo && typeof logo === "object") {
    const lo = logo as { url?: unknown; contentUrl?: unknown };
    const url =
      typeof lo.url === "string" && lo.url.trim()
        ? lo.url.trim()
        : typeof lo.contentUrl === "string" && lo.contentUrl.trim()
          ? lo.contentUrl.trim()
          : null;
    if (url) acc.push(url);
  }
  for (const key of ["publisher", "brand", "parentOrganization", "subOrganization", "mainEntity"]) {
    const child = o[key];
    if (Array.isArray(child)) {
      for (const c of child) collectLogoUrlsFromLdObject(c, acc, visited);
    } else {
      collectLogoUrlsFromLdObject(child, acc, visited);
    }
  }
}

function shouldScanLdNode(node: unknown): boolean {
  if (!node || typeof node !== "object") return false;
  const o = node as Record<string, unknown>;
  const t = o["@type"];
  const types = Array.isArray(t) ? t.map((x) => String(x)) : t != null ? [String(t)] : [];
  return types.some((x) => LD_ORG_TYPE_RE.test(x));
}

function flattenLdJsonNodes(raw: unknown): unknown[] {
  if (raw == null) return [];
  if (Array.isArray(raw)) return raw.flatMap(flattenLdJsonNodes);
  if (typeof raw === "object" && raw !== null && "@graph" in raw) {
    return flattenLdJsonNodes((raw as { "@graph": unknown })["@graph"]);
  }
  return [raw];
}

/** High-priority logo URLs from JSON-LD (Organization / LocalBusiness / WebSite publisher, etc.). */
function extractJsonLdLogoRefs(html: string): { url: string; index: number }[] {
  const out: { url: string; index: number }[] = [];
  const scriptRe = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m: RegExpExecArray | null;
  while ((m = scriptRe.exec(html)) !== null) {
    let data: unknown;
    try {
      data = JSON.parse(m[1].trim());
    } catch {
      continue;
    }
    const index = m.index;
    const nodes = flattenLdJsonNodes(data);
    const visited = new Set<unknown>();
    for (const node of nodes) {
      if (!shouldScanLdNode(node)) continue;
      const urls: string[] = [];
      collectLogoUrlsFromLdObject(node, urls, visited);
      const primary = node as Record<string, unknown>;
      pushLdVisualUrls(primary.image, urls);
      for (const u of urls) {
        out.push({ url: u, index });
      }
    }
  }
  return out;
}

/** Images that look like trust seals / badges, not the business wordmark. */
function isLikelyTrustBadgeOrSeal(tag: string, context: string): boolean {
  const blob = `${tag} ${context}`.toLowerCase();
  if (
    /\b(badge|shield|seal|truste|trusted|verify|verif|award|accredit|ssl[-_]?secure|mcafee|norton|equifax|bbb\.org\/|licensed\s*(?:&|and)\s*insured)\b/i.test(
      blob,
    )
  ) {
    return true;
  }
  if (/alt=["'][^"']*(shield|badge|seal|trust badge|verified|accredit)[^"']*["']/i.test(tag)) {
    return true;
  }
  if (/class=["'][^"']*(trust-seal|trust-badge|shield-icon|badge-icon|verified-badge)[^"']*["']/i.test(tag)) {
    return true;
  }
  return false;
}

function imageSrcFromTag(tag: string): string {
  return (
    tag.match(/data-(?:lazy-)?src=["']([^"']+)["']/i)?.[1] ??
    tag.match(/data-srcset=["']([^"'\s,]+)/i)?.[1] ??
    tag.match(/\bsrc=["']([^"']+)["']/i)?.[1] ??
    ""
  ).trim();
}

function imageDimensionScore(tag: string): number {
  const style = tag.match(/\bstyle=["']([^"']+)["']/i)?.[1] ?? "";
  const width =
    Number.parseInt(style.match(/\bwidth\s*:\s*(\d+)px/i)?.[1] ?? "", 10) ||
    Number.parseInt(tag.match(/\bwidth=["']?(\d+)/i)?.[1] ?? "", 10);
  const height =
    Number.parseInt(style.match(/\bheight\s*:\s*(\d+)px/i)?.[1] ?? "", 10) ||
    Number.parseInt(tag.match(/\bheight=["']?(\d+)/i)?.[1] ?? "", 10);
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return 0;
  }
  const ratio = width / height;
  let score = 0;
  if (width >= 80 && height >= 30 && width <= 900 && height <= 320) score += 12;
  if (ratio >= 1.1 && ratio <= 6) score += 8;
  return score;
}

/**
 * Best-effort logo URL extraction from raw HTML.
 * Returns ranked candidates because builders such as LeadConnector often render
 * multiple header/logo images, and the one literally labelled "Brand Logo" is
 * not always the visible business logo.
 */
export function extractLogoUrls(
  html: string,
  baseUrl: string,
  options: LogoExtractionOptions = {},
): string[] {
  if (!html || typeof html !== "string") return [];

  const candidates: LogoCandidate[] = [];
  const seen = new Set<string>();
  const tokens = brandTokens(options.businessName ?? extractTitle(html));

  for (const { url: logoRef, index } of extractJsonLdLogoRefs(html)) {
    pushLogoCandidate(candidates, seen, logoRef, baseUrl, 94, index);
  }

  let m: RegExpExecArray | null;

  // ── 1. Ranked <img> candidates near logo/header/nav contexts ───────────
  const imgRe = /<img\s+[^>]*(?:src|alt|class|id|style)=[^>]*>/gi;
  while ((m = imgRe.exec(html)) !== null) {
    const tag = m[0];
    if (/social media icon|avatar|testimonial|review/i.test(tag)) continue;
    if (/\bclass=["'][^"']*wpml-ls-flag[^"']*["']/i.test(tag)) continue;
    if (
      /\bclass=["'][^"']*\bflag\b[^"']*["']/i.test(tag) &&
      !/logo|brand|wordmark|site-title|custom-logo/i.test(tag)
    ) {
      continue;
    }
    const srcEarly = imageSrcFromTag(tag);
    const earlyResolved = srcEarly ? resolveUrl(srcEarly, baseUrl) : null;
    if (earlyResolved && isDecorativeContactIconUrl(earlyResolved)) continue;
    if (earlyResolved && isLanguageSwitcherOrFlagAssetUrl(earlyResolved)) continue;
    const context = html.slice(Math.max(0, m.index - 3200), Math.min(html.length, m.index + tag.length + 3200));
    let score = 0;
    if (/logo|brand/i.test(tag)) score += 36;
    if (/logo|brand/i.test(context)) score += 18;
    if (/wpml-ls|language-switcher|lang-switch|translatepress|site-languages|header-lang|menu-item-wpml|glink\s|class=["'][^"']*lang-[^"']*item/i.test(context)) {
      score -= 95;
    }
    if (/header|nav|navbar|menu|masthead|wixui-header/i.test(context)) score += 18;
    if (/wsite-logo|id=["']sitename["']/i.test(context)) score += 48;
    if (/wixui-image|wow-image|data-testid=["']imageX["']/i.test(context)) score += 34;
    const srcBlob = imageSrcFromTag(tag);
    if (
      srcBlob &&
      /static\.wixstatic\.com/i.test(srcBlob) &&
      /logo|wordmark|brand-mark|site-logo/i.test(srcBlob)
    ) {
      score += 44;
    }
    if (/<a\b[^>]*>[\s\S]{0,650}$/i.test(context.slice(0, 650))) score += 10;
    score += businessMatchScore(`${tag} ${context}`, tokens);
    const altMatch = tag.match(/\balt=["']([^"']+)["']/i);
    if (
      altMatch &&
      /^(spanish|español|espanol|english|inglés|ingles|\bes\b|\ben\b|français|português|language)$/i.test(
        altMatch[1].trim(),
      )
    ) {
      score -= 80;
    }
    if (altMatch && tokens.length > 0 && businessMatchScore(altMatch[1], tokens) > 0) {
      score += 28;
    }
    if (
      /idx|property search|mortgage|buyers|sellers|communities|powered by|exp realty|realtor/i.test(context) &&
      businessMatchScore(`${tag} ${context}`, tokens) === 0
    ) {
      score -= 24;
    }
    score += imageDimensionScore(tag);
    score += Math.max(0, 10 - Math.floor((m.index / Math.max(html.length, 1)) * 30));
    if (isLikelyTrustBadgeOrSeal(tag, context)) {
      score -= 55;
    }
    if (score < 24) continue;
    pushLogoCandidate(candidates, seen, imageSrcFromTag(tag), baseUrl, score, m.index);
  }

  // ── 2. <a> with "logo" class/id wrapping an <img> or <source> ──────────
  // YooTheme / WordPress themes: <a class="uk-logo"><picture><source data-srcset="...">
  const logoAnchorRe = /<a\s+[^>]*(?:class|id)=["'][^"']*logo[^"']*["'][^>]*>[\s\S]*?<\/a>/gi;
  while ((m = logoAnchorRe.exec(html)) !== null) {
    const block = m[0];
    const srcsetMatch = block.match(/data-srcset=["']([^"'\s,]+)/i);
    const imgSrcMatch = block.match(/data-(?:lazy-)?src=["']([^"']+)["']/i);
    const plainSrcMatch = block.match(/\bsrc=["']([^"']+)["']/i);
    const candidate = (
      srcsetMatch?.[1] ?? imgSrcMatch?.[1] ?? plainSrcMatch?.[1] ?? ""
    ).trim();
    pushLogoCandidate(candidates, seen, candidate, baseUrl, 72, m.index);
  }

  // ── 3. Wix: wix:image or data-pin-media with "logo" nearby ────────────
  const wixImgRe = /(?:wix:image|data-pin-media)=["']([^"']+)["']/gi;
  while ((m = wixImgRe.exec(html)) !== null) {
    const ctx = html.slice(Math.max(0, m.index - 200), m.index + m[0].length + 200);
    if (!/logo/i.test(ctx)) continue;
    pushLogoCandidate(candidates, seen, m[1].trim(), baseUrl, 58, m.index);
  }

  // ── 4. apple-touch-icon ────────────────────────────────────────────────
  const touchRe = /<link\s+[^>]*rel=["']apple-touch-icon[^"']*["'][^>]*href=["']([^"']+)["']/gi;
  if ((m = touchRe.exec(html)) !== null) {
    pushLogoCandidate(candidates, seen, m[1].trim(), baseUrl, 28, m.index);
  }
  const touchRev = /<link\s+[^>]*href=["']([^"']+)["'][^>]*rel=["']apple-touch-icon[^"']*["']/gi;
  if ((m = touchRev.exec(html)) !== null) {
    pushLogoCandidate(candidates, seen, m[1].trim(), baseUrl, 28, m.index);
  }

  // ── 5. Large favicon (>= 64px, rel="icon") ────────────────────────────
  const iconRe = /<link\s+[^>]*rel=["'](?:shortcut )?icon["'][^>]*href=["']([^"']+)["']/gi;
  let bestIcon: { url: string; index: number } | null = null;
  let bestSize = 0;
  while ((m = iconRe.exec(html)) !== null) {
    const tag = m[0];
    const sizeMatch = tag.match(/sizes=["'](\d+)x\d+["']/i);
    const size = sizeMatch ? parseInt(sizeMatch[1]) : 16;
    if (size > bestSize) {
      bestSize = size;
      const u = resolveUrl(m[1].trim(), baseUrl);
      if (u) bestIcon = { url: u, index: m.index };
    }
  }
  if (bestIcon && bestSize >= 64) {
    pushLogoCandidate(candidates, seen, bestIcon.url, baseUrl, 20, bestIcon.index);
  }

  // ── 6. og:image (fallback — often a social banner, not a logo) ─────────
  const ogRe = /<meta\s+[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/gi;
  if ((m = ogRe.exec(html)) !== null) {
    pushLogoCandidate(candidates, seen, m[1].trim(), baseUrl, 10, m.index);
  }
  const ogRev = /<meta\s+[^>]*content=["']([^"']+)["'][^>]*property=["']og:image["']/gi;
  if ((m = ogRev.exec(html)) !== null) {
    pushLogoCandidate(candidates, seen, m[1].trim(), baseUrl, 10, m.index);
  }

  // ── 7. Any favicon as last resort ──────────────────────────────────────
  if (bestIcon) {
    pushLogoCandidate(candidates, seen, bestIcon.url, baseUrl, 4, bestIcon.index);
  }

  const ranked = candidates
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map((c) => c.url);
  const fallback = resolveUrl("/favicon.ico", baseUrl);
  return fallback && !seen.has(fallback) ? [...ranked, fallback] : ranked;
}

/**
 * Best-effort single logo URL for older callers. Newer brand extraction should
 * use `extractLogoUrls` and inspect the candidates.
 */
export function extractLogoUrl(
  html: string,
  baseUrl: string,
  options: LogoExtractionOptions = {},
): string | null {
  return extractLogoUrls(html, baseUrl, options)[0] ?? null;
}

// ── Combined brand asset extraction ──────────────────────────────────────────

export type BrandAssets = {
  colors: BrandColorResult | null;
  logoUrl: string | null;
  logoUrls: string[];
  sourceFacts: WebsiteBrandFacts | null;
};

/**
 * Fetches a URL once and extracts both brand colors and logo URL.
 * Always merges external stylesheets (up to 5) because many WordPress/YooTheme/Elementor
 * sites deliver the real brand colors only in external CSS bundles, while the inline HTML
 * contains generic platform defaults.
 */
export async function fetchBrandAssetsFromUrl(
  url: string,
  timeoutMs = 8000,
  options: LogoExtractionOptions = {},
): Promise<BrandAssets> {
  const pageUrl = normalizeUrl(url.trim());
  let html = await fetchPageHtml(pageUrl, timeoutMs);
  let resolvedBase = pageUrl;

  if (!html) {
    const originFallback = brandHomepageForFetch(url);
    if (originFallback !== pageUrl) {
      html = await fetchPageHtml(originFallback, timeoutMs);
      resolvedBase = originFallback;
    }
  }

  if (!html) return { colors: null, logoUrl: null, logoUrls: [], sourceFacts: null };
  const normalized = resolvedBase;

  const cssUrls = extractLinkedStylesheetUrls(html, normalized);
  let combined = html;
  if (cssUrls.length > 0) {
    const cssText = await fetchExternalCss(cssUrls, Math.min(timeoutMs, 4000), 5);
    if (cssText) combined = html + "\n" + cssText;
  }

  const colors = extractBrandColors(combined);

  const logoUrls = extractLogoUrls(html, normalized, options);

  return {
    colors,
    logoUrl: logoUrls[0] ?? null,
    logoUrls,
    sourceFacts: extractWebsiteBrandFacts(html, normalized),
  };
}
