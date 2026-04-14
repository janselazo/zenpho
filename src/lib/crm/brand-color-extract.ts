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

/** Extracts colors from high-signal areas: CSS vars, meta tags, nav/header styles, brand classes. */
function extractPriorityColors(html: string): RGBTuple[] {
  const priority: RGBTuple[] = [];

  const themeColorRe = /<meta\s+name=["']theme-color["']\s+content=["']([^"']+)["']/gi;
  let m: RegExpExecArray | null;
  while ((m = themeColorRe.exec(html)) !== null) {
    const rgb = hexToRgb(m[1].trim());
    if (rgb) priority.push(rgb);
  }

  const msColorRe = /<meta\s+name=["']msapplication-TileColor["']\s+content=["']([^"']+)["']/gi;
  while ((m = msColorRe.exec(html)) !== null) {
    const rgb = hexToRgb(m[1].trim());
    if (rgb) priority.push(rgb);
  }

  const cssVarRe = /--(?:primary|brand|accent|main|theme|color-primary|brand-color|logo)[^:]*:\s*([^;}{]+)/gi;
  while ((m = cssVarRe.exec(html)) !== null) {
    const val = m[1].trim();
    const rgb = hexToRgb(val);
    if (rgb) { priority.push(rgb); continue; }
    const rgbMatch = val.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
    if (rgbMatch) priority.push([parseInt(rgbMatch[1]), parseInt(rgbMatch[2]), parseInt(rgbMatch[3])]);
  }

  const navHeaderRe = /(?:nav|header|\.navbar|\.header|\.logo|\.brand|\.site-header)[^{}]*\{([^}]{1,600})\}/gi;
  while ((m = navHeaderRe.exec(html)) !== null) {
    const block = m[1];
    const bgColorRe = /(?:background-color|background|color)\s*:\s*([^;]+)/gi;
    let bm: RegExpExecArray | null;
    while ((bm = bgColorRe.exec(block)) !== null) {
      const val = bm[1].trim();
      const rgb = hexToRgb(val);
      if (rgb && !isNearWhiteOrBlack(rgb)) priority.push(rgb);
      const rgbMatch2 = val.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
      if (rgbMatch2) {
        const c: RGBTuple = [parseInt(rgbMatch2[1]), parseInt(rgbMatch2[2]), parseInt(rgbMatch2[3])];
        if (!isNearWhiteOrBlack(c)) priority.push(c);
      }
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

// ── HTML fetch (shared) ──────────────────────────────────────────────────────

export async function fetchPageHtml(
  url: string,
  timeoutMs = 8000,
): Promise<string | null> {
  if (!url?.trim()) return null;
  const normalized = /^https?:\/\//i.test(url) ? url : `https://${url}`;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(normalized, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; ZenphoBot/1.0; +https://zenpho.com)",
        Accept: "text/html,application/xhtml+xml",
      },
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

function resolveUrl(raw: string, baseUrl: string): string | null {
  try {
    return new URL(raw, baseUrl).href;
  } catch {
    return null;
  }
}

/**
 * Best-effort logo URL extraction from raw HTML.
 * Priority: og:image → apple-touch-icon → large png favicon → <img> with "logo" in src/alt/class.
 */
export function extractLogoUrl(html: string, baseUrl: string): string | null {
  if (!html || typeof html !== "string") return null;

  let m: RegExpExecArray | null;

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

  const touchRe = /<link\s+[^>]*rel=["']apple-touch-icon[^"']*["'][^>]*href=["']([^"']+)["']/gi;
  if ((m = touchRe.exec(html)) !== null) {
    const u = resolveUrl(m[1].trim(), baseUrl);
    if (u) return u;
  }

  const iconRe = /<link\s+[^>]*rel=["']icon["'][^>]*type=["']image\/png["'][^>]*href=["']([^"']+)["']/gi;
  let bestIcon: string | null = null;
  let bestSize = 0;
  while ((m = iconRe.exec(html)) !== null) {
    const href = m[0];
    const sizeMatch = href.match(/sizes=["'](\d+)x\d+["']/i);
    const size = sizeMatch ? parseInt(sizeMatch[1]) : 16;
    if (size > bestSize) {
      bestSize = size;
      const u = resolveUrl(m[1].trim(), baseUrl);
      if (u) bestIcon = u;
    }
  }
  if (bestIcon && bestSize >= 64) return bestIcon;

  const imgRe = /<img\s+[^>]*(?:src|alt|class)=[^>]*>/gi;
  while ((m = imgRe.exec(html)) !== null) {
    const tag = m[0];
    if (!/logo/i.test(tag)) continue;
    const srcMatch = tag.match(/src=["']([^"']+)["']/i);
    if (!srcMatch) continue;
    const src = srcMatch[1].trim();
    if (/\.svg$|\.png$|\.jpg$|\.jpeg$|\.webp$/i.test(src) || /^data:/i.test(src) === false) {
      const u = resolveUrl(src, baseUrl);
      if (u && !/^data:/i.test(u)) return u;
    }
  }

  if (bestIcon) return bestIcon;

  return null;
}

// ── Combined brand asset extraction ──────────────────────────────────────────

export type BrandAssets = {
  colors: BrandColorResult | null;
  logoUrl: string | null;
};

/**
 * Fetches a URL once and extracts both brand colors and logo URL.
 */
export async function fetchBrandAssetsFromUrl(
  url: string,
  timeoutMs = 8000,
): Promise<BrandAssets> {
  const html = await fetchPageHtml(url, timeoutMs);
  if (!html) return { colors: null, logoUrl: null };
  const normalized = /^https?:\/\//i.test(url) ? url : `https://${url}`;
  return {
    colors: extractBrandColors(html),
    logoUrl: extractLogoUrl(html, normalized),
  };
}
