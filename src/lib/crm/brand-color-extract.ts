/**
 * Extracts dominant brand colors from a website's HTML by parsing CSS custom properties,
 * meta theme-color, inline styles on key elements, and common CSS patterns.
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

/** Extracts colors from high-signal areas: CSS vars, meta tags, nav/header styles, brand classes. */
function extractPriorityColors(html: string): RGBTuple[] {
  const priority: RGBTuple[] = [];

  const themeColorRe = /<meta\s+name=["']theme-color["']\s+content=["']([^"']+)["']/gi;
  let m: RegExpExecArray | null;
  while ((m = themeColorRe.exec(html)) !== null) {
    const rgb = parseColorValue(m[1].trim());
    if (rgb) priority.push(rgb);
  }

  const msColorRe = /<meta\s+name=["']msapplication-TileColor["']\s+content=["']([^"']+)["']/gi;
  while ((m = msColorRe.exec(html)) !== null) {
    const rgb = parseColorValue(m[1].trim());
    if (rgb) priority.push(rgb);
  }

  // Match any CSS custom property containing "color", "primary", "brand", or "accent"
  // in its name. Covers Astra (--ast-global-color-*), Elementor (--e-global-color-*),
  // Wix (--color_N), Squarespace (--accent-*), WordPress (--wp--preset--color-*), etc.
  // Skip known WordPress default variables that are generic palette colors, not brand.
  const cssVarRe = /(--(?:[a-z0-9_-]*(?:color|primary|brand|accent)[a-z0-9_-]*)):\s*([^;}{]+)/gi;
  while ((m = cssVarRe.exec(html)) !== null) {
    const varName = m[1];
    if (WP_DEFAULT_VAR_RE.test(varName)) continue;
    const rgb = parseColorValue(m[2].trim());
    if (rgb) priority.push(rgb);
  }

  const navHeaderRe = /(?:nav|header|\.navbar|\.header|\.logo|\.brand|\.site-header)[^{}]*\{([^}]{1,600})\}/gi;
  while ((m = navHeaderRe.exec(html)) !== null) {
    const block = m[1];
    const bgColorRe = /(?:background-color|background|color)\s*:\s*([^;]+)/gi;
    let bm: RegExpExecArray | null;
    while ((bm = bgColorRe.exec(block)) !== null) {
      const c = parseColorValue(bm[1].trim());
      if (c && !isNearWhiteOrBlack(c)) priority.push(c);
    }
  }

  return priority;
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

  const priorityRaw = extractPriorityColors(html);
  const allRaw = extractAllColors(html);

  const priorityChromatic = priorityRaw.filter((c) => !isNeutral(c) && !isNearWhiteOrBlack(c));
  const allChromatic = allRaw.filter((c) => !isNeutral(c) && !isNearWhiteOrBlack(c));

  if (priorityChromatic.length === 0 && allChromatic.length === 0) return null;

  const countMap = new Map<string, { count: number; rgb: RGBTuple }>();
  for (const c of allChromatic) {
    const key = rgbToHex(c);
    const entry = countMap.get(key);
    if (entry) entry.count++;
    else countMap.set(key, { count: 1, rgb: c });
  }

  const byFrequency = [...countMap.values()].sort((a, b) => b.count - a.count);

  let primary: RGBTuple;
  if (priorityChromatic.length > 0) {
    primary = priorityChromatic[0];
  } else if (byFrequency.length > 0) {
    primary = byFrequency[0].rgb;
  } else {
    return null;
  }

  const candidates = dedupeColors(
    [
      primary,
      ...priorityChromatic.slice(1),
      ...byFrequency.map((e) => e.rgb),
    ],
    35,
  );

  const accent = candidates.length > 1 ? candidates[1] : null;
  const palette = candidates.slice(0, 5).map(rgbToHex);

  return {
    primary: rgbToHex(primary),
    accent: accent ? rgbToHex(accent) : null,
    palette,
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

/**
 * Best-effort logo URL extraction from raw HTML.
 * Priority: <img> with "logo" (data-src/data-srcset/src) → <a class="logo">
 * wrapper → Wix wix-image/data-pin-media → apple-touch-icon → large favicon →
 * og:image (fallback — often a social banner) → any favicon.
 */
export function extractLogoUrl(html: string, baseUrl: string): string | null {
  if (!html || typeof html !== "string") return null;

  let m: RegExpExecArray | null;

  // ── 1. <img> with "logo" in tag attributes — the strongest signal ──────
  // Many sites lazy-load with data-src, data-lazy-src, or data-srcset while
  // using a transparent placeholder in src. Check all data-* variants first.
  const imgRe = /<img\s+[^>]*(?:src|alt|class|id)=[^>]*>/gi;
  while ((m = imgRe.exec(html)) !== null) {
    const tag = m[0];
    if (!/logo/i.test(tag)) continue;
    const dataSrc = tag.match(/data-(?:lazy-)?src=["']([^"']+)["']/i);
    const dataSrcset = tag.match(/data-srcset=["']([^"'\s,]+)/i);
    const plainSrc = tag.match(/\bsrc=["']([^"']+)["']/i);
    const src = (
      dataSrc?.[1] ?? dataSrcset?.[1] ?? plainSrc?.[1] ?? ""
    ).trim();
    if (!src || /^data:/i.test(src)) continue;
    const u = resolveUrl(src, baseUrl);
    if (u) return u;
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
    if (candidate && !/^data:/i.test(candidate)) {
      const u = resolveUrl(candidate, baseUrl);
      if (u) return u;
    }
  }

  // ── 3. Wix: wix:image or data-pin-media with "logo" nearby ────────────
  const wixImgRe = /(?:wix:image|data-pin-media)=["']([^"']+)["']/gi;
  while ((m = wixImgRe.exec(html)) !== null) {
    const ctx = html.slice(Math.max(0, m.index - 200), m.index + m[0].length + 200);
    if (!/logo/i.test(ctx)) continue;
    const raw = m[1].trim();
    if (/^https?:\/\//i.test(raw)) return raw;
    const u = resolveUrl(raw, baseUrl);
    if (u) return u;
  }

  // ── 4. apple-touch-icon ────────────────────────────────────────────────
  const touchRe = /<link\s+[^>]*rel=["']apple-touch-icon[^"']*["'][^>]*href=["']([^"']+)["']/gi;
  if ((m = touchRe.exec(html)) !== null) {
    const u = resolveUrl(m[1].trim(), baseUrl);
    if (u) return u;
  }
  const touchRev = /<link\s+[^>]*href=["']([^"']+)["'][^>]*rel=["']apple-touch-icon[^"']*["']/gi;
  if ((m = touchRev.exec(html)) !== null) {
    const u = resolveUrl(m[1].trim(), baseUrl);
    if (u) return u;
  }

  // ── 5. Large favicon (>= 64px, rel="icon") ────────────────────────────
  const iconRe = /<link\s+[^>]*rel=["'](?:shortcut )?icon["'][^>]*href=["']([^"']+)["']/gi;
  let bestIcon: string | null = null;
  let bestSize = 0;
  while ((m = iconRe.exec(html)) !== null) {
    const tag = m[0];
    const sizeMatch = tag.match(/sizes=["'](\d+)x\d+["']/i);
    const size = sizeMatch ? parseInt(sizeMatch[1]) : 16;
    if (size > bestSize) {
      bestSize = size;
      const u = resolveUrl(m[1].trim(), baseUrl);
      if (u) bestIcon = u;
    }
  }
  if (bestIcon && bestSize >= 64) return bestIcon;

  // ── 6. og:image (fallback — often a social banner, not a logo) ─────────
  const ogRe = /<meta\s+[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/gi;
  if ((m = ogRe.exec(html)) !== null) {
    const u = resolveUrl(m[1].trim(), baseUrl);
    if (u) return u;
  }
  const ogRev = /<meta\s+[^>]*content=["']([^"']+)["'][^>]*property=["']og:image["']/gi;
  if ((m = ogRev.exec(html)) !== null) {
    const u = resolveUrl(m[1].trim(), baseUrl);
    if (u) return u;
  }

  // ── 7. Any favicon as last resort ──────────────────────────────────────
  if (bestIcon) return bestIcon;

  return resolveUrl("/favicon.ico", baseUrl);
}

// ── Combined brand asset extraction ──────────────────────────────────────────

export type BrandAssets = {
  colors: BrandColorResult | null;
  logoUrl: string | null;
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
): Promise<BrandAssets> {
  const html = await fetchPageHtml(url, timeoutMs);
  if (!html) return { colors: null, logoUrl: null, sourceFacts: null };
  const normalized = normalizeUrl(url);

  const cssUrls = extractLinkedStylesheetUrls(html, normalized);
  let combined = html;
  if (cssUrls.length > 0) {
    const cssText = await fetchExternalCss(cssUrls, Math.min(timeoutMs, 4000), 5);
    if (cssText) combined = html + "\n" + cssText;
  }

  const colors = extractBrandColors(combined);

  return {
    colors,
    logoUrl: extractLogoUrl(html, normalized),
    sourceFacts: extractWebsiteBrandFacts(html, normalized),
  };
}
