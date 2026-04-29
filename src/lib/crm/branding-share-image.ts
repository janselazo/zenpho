import type { AdsFunnelSpec } from "@/lib/crm/prospect-ads-funnel-spec-llm";
import { getBrandingFontPairing } from "@/lib/crm/branding-font-pairings";
import type { BrandingSpec } from "@/lib/crm/prospect-branding-spec-llm";

export type BrandingShareImageInput = {
  spec: BrandingSpec;
  funnel: AdsFunnelSpec | null;
  realPalette?: string[];
  logoDataUrl?: string | null;
  merchImage?: string | null;
  campaignImages?: {
    landingHero?: string | null;
    metaFeed?: string | null;
    instagramStory?: string | null;
    googleDisplay?: string | null;
    heroBanner?: string | null;
  };
};

export type BrandingShareImageResult = {
  svg: string;
  width: number;
  height: number;
  filename: string;
};

const WIDTH = 1200;
const HEIGHT = 900;
const BG = "#f7f5f0";
const INK = "#111111";
const MUTED = "#5f676d";
const LINE = "#d8d3c8";

function esc(value: string | null | undefined): string {
  return (value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function clamp(value: string | null | undefined, max = 90): string {
  const t = (value ?? "").trim().replace(/\s+/g, " ");
  if (t.length <= max) return t;
  return `${t.slice(0, Math.max(0, max - 3)).trim()}...`;
}

function safeHex(value: string | null | undefined, fallback: string): string {
  const raw = (value ?? "").trim();
  const m = raw.match(/^#?([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/);
  if (!m) return fallback;
  let hex = m[1];
  if (hex.length === 3) hex = hex.split("").map((c) => c + c).join("");
  return `#${hex.toUpperCase()}`;
}

function hexToRgb(hex: string): [number, number, number] | null {
  const m = hex.match(/^#([0-9A-F]{6})$/i);
  if (!m) return null;
  const n = Number.parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rgbToHex([r, g, b]: [number, number, number]): string {
  return `#${((1 << 24) | (r << 16) | (g << 8) | b)
    .toString(16)
    .slice(1)
    .toUpperCase()}`;
}

function mixHex(a: string, b: string, amount: number): string {
  const ar = hexToRgb(a);
  const br = hexToRgb(b);
  if (!ar || !br) return a;
  const t = Math.max(0, Math.min(1, amount));
  return rgbToHex([
    Math.round(ar[0] + (br[0] - ar[0]) * t),
    Math.round(ar[1] + (br[1] - ar[1]) * t),
    Math.round(ar[2] + (br[2] - ar[2]) * t),
  ]);
}

function colorDistance(a: string, b: string): number {
  const ar = hexToRgb(a);
  const br = hexToRgb(b);
  if (!ar || !br) return 999;
  return Math.sqrt(
    (ar[0] - br[0]) ** 2 + (ar[1] - br[1]) ** 2 + (ar[2] - br[2]) ** 2,
  );
}

const GENERIC_WORDPRESS_COLORS = [
  "#CF2E2E",
  "#CC1818",
  "#FCB900",
  "#F0BB49",
  "#00D084",
  "#4AB866",
  "#0693E3",
  "#3858E9",
  "#9B51E0",
];

function looksGenericPaletteColor(hex: string): boolean {
  return GENERIC_WORDPRESS_COLORS.some((generic) => colorDistance(hex, generic) < 18);
}

function cleanBrandPalette(input: readonly string[]): string[] {
  const out: string[] = [];
  for (const raw of input) {
    const hex = safeHex(raw, "");
    if (!hex || looksGenericPaletteColor(hex)) continue;
    if (out.every((existing) => colorDistance(existing, hex) > 28)) {
      out.push(hex);
    }
  }
  return out.slice(0, 5);
}

function slugify(value: string): string {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return slug || "brand-kit";
}

function wrapText(value: string, maxChars: number, maxLines: number): string[] {
  const words = value.trim().replace(/\s+/g, " ").split(" ").filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (next.length > maxChars && line) {
      lines.push(line);
      line = word;
      if (lines.length >= maxLines) break;
    } else {
      line = next;
    }
  }
  if (line && lines.length < maxLines) lines.push(line);
  if (lines.length === maxLines && words.join(" ").length > lines.join(" ").length) {
    lines[maxLines - 1] = `${lines[maxLines - 1].replace(/\.\.\.$/, "")}...`;
  }
  return lines;
}

function textLines(
  value: string,
  x: number,
  y: number,
  opts: {
    maxChars: number;
    maxLines: number;
    size: number;
    lineHeight: number;
    weight?: number;
    fill?: string;
    family?: string;
  }
): string {
  const lines = wrapText(value, opts.maxChars, opts.maxLines);
  return lines
    .map(
      (line, i) =>
        `<text x="${x}" y="${y + i * opts.lineHeight}" font-size="${opts.size}" font-weight="${opts.weight ?? 400}" fill="${opts.fill ?? INK}" font-family="${opts.family ?? "Inter, Arial, sans-serif"}">${esc(line)}</text>`
    )
    .join("");
}

function textColorFor(bg: string): string {
  const m = bg.match(/^#([0-9a-fA-F]{6})$/);
  if (!m) return "#ffffff";
  const n = Number.parseInt(m[1], 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return (r * 299 + g * 587 + b * 114) / 1000 > 150 ? INK : "#ffffff";
}

function chip(x: number, y: number, label: string, color: string): string {
  const fg = textColorFor(color);
  return `<g>
    <rect x="${x}" y="${y}" width="154" height="96" fill="${color}" stroke="${LINE}" stroke-width="1"/>
    <text x="${x + 14}" y="${y + 32}" font-size="10" font-weight="700" fill="${fg}" font-family="Inter, Arial, sans-serif">${esc(clamp(label, 18).toUpperCase())}</text>
    <text x="${x + 14}" y="${y + 56}" font-size="12" font-weight="700" fill="${fg}" font-family="Inter, Arial, sans-serif">${esc(color)}</text>
  </g>`;
}

function landingMiniature(
  x: number,
  y: number,
  w: number,
  h: number,
  colors: { primary: string; accent: string; surface: string },
  imageUrl?: string | null,
): string {
  if (h >= 280) {
    const phoneW = Math.min(210, w * 0.72);
    const phoneH = h - 18;
    const phoneX = x + (w - phoneW) / 2;
    const phoneY = y + 8;
    const screenX = phoneX + 10;
    const screenY = phoneY + 10;
    const screenW = phoneW - 20;
    const screenH = phoneH - 20;
    const heroH = screenH * 0.32;
    const sectionGap = 8;
    const serviceY = screenY + heroH + sectionGap;
    const serviceH = screenH * 0.18;
    const proofY = serviceY + serviceH + sectionGap;
    const proofH = screenH * 0.2;
    const ctaY = proofY + proofH + sectionGap;
    const ctaH = screenY + screenH - ctaY;
    return `<g>
      <rect x="${phoneX}" y="${phoneY}" width="${phoneW}" height="${phoneH}" rx="22" fill="#111111"/>
      <rect x="${screenX}" y="${screenY}" width="${screenW}" height="${screenH}" rx="14" fill="#ffffff"/>
      <rect x="${screenX}" y="${screenY}" width="${screenW}" height="${heroH}" rx="14" fill="${colors.surface}"/>
      ${
        imageUrl
          ? `<image href="${esc(imageUrl)}" x="${screenX}" y="${screenY}" width="${screenW}" height="${heroH}" preserveAspectRatio="xMidYMid slice"/>
             <rect x="${screenX}" y="${screenY}" width="${screenW}" height="${heroH}" fill="#ffffff" opacity="0.18"/>`
          : `<circle cx="${screenX + screenW - 42}" cy="${screenY + 44}" r="25" fill="${colors.accent}" opacity="0.85"/>`
      }
      <rect x="${screenX + 16}" y="${screenY + 24}" width="${screenW * 0.52}" height="8" fill="${INK}" opacity="0.88"/>
      <rect x="${screenX + 16}" y="${screenY + 44}" width="${screenW * 0.66}" height="5" fill="${MUTED}" opacity="0.45"/>
      <rect x="${screenX + 16}" y="${screenY + 60}" width="${screenW * 0.34}" height="14" fill="${colors.primary}"/>
      <rect x="${screenX + 14}" y="${serviceY}" width="${screenW - 28}" height="${serviceH}" fill="#ffffff" stroke="${LINE}"/>
      <rect x="${screenX + 26}" y="${serviceY + 14}" width="44" height="28" fill="${colors.primary}" opacity="0.9"/>
      <rect x="${screenX + 80}" y="${serviceY + 15}" width="${screenW * 0.42}" height="6" fill="${INK}" opacity="0.75"/>
      <rect x="${screenX + 80}" y="${serviceY + 31}" width="${screenW * 0.36}" height="5" fill="${MUTED}" opacity="0.4"/>
      <rect x="${screenX + 14}" y="${proofY}" width="${screenW - 28}" height="${proofH}" fill="${colors.surface}" stroke="${LINE}"/>
      <circle cx="${screenX + 38}" cy="${proofY + 28}" r="14" fill="${colors.accent}" opacity="0.9"/>
      <rect x="${screenX + 62}" y="${proofY + 18}" width="${screenW * 0.46}" height="6" fill="${INK}" opacity="0.78"/>
      <rect x="${screenX + 62}" y="${proofY + 35}" width="${screenW * 0.56}" height="5" fill="${MUTED}" opacity="0.42"/>
      <rect x="${screenX + 14}" y="${ctaY}" width="${screenW - 28}" height="${ctaH - 8}" fill="#ffffff" stroke="${LINE}"/>
      <rect x="${screenX + 30}" y="${ctaY + 18}" width="${screenW * 0.46}" height="7" fill="${INK}" opacity="0.82"/>
      <rect x="${screenX + 30}" y="${ctaY + 38}" width="${screenW * 0.42}" height="16" fill="${colors.primary}"/>
      <rect x="${screenX + 104}" y="${ctaY + 38}" width="${screenW * 0.28}" height="16" fill="${colors.accent}" opacity="0.8"/>
    </g>`;
  }
  if (imageUrl) {
    return `<g>
      <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="2" fill="#ffffff" stroke="${LINE}"/>
      <image href="${esc(imageUrl)}" x="${x + 10}" y="${y + 10}" width="${w - 20}" height="${h * 0.58}" preserveAspectRatio="xMidYMid slice"/>
      <rect x="${x + 10}" y="${y + 10 + h * 0.58}" width="${w - 20}" height="${h * 0.28}" fill="#ffffff" stroke="${LINE}"/>
      <rect x="${x + 24}" y="${y + 26 + h * 0.58}" width="${w * 0.42}" height="7" fill="${INK}" opacity="0.8"/>
      <rect x="${x + 24}" y="${y + 44 + h * 0.58}" width="${w * 0.22}" height="14" fill="${colors.primary}"/>
      <rect x="${x + 98}" y="${y + 44 + h * 0.58}" width="${w * 0.22}" height="14" fill="${colors.accent}" opacity="0.8"/>
    </g>`;
  }
  return `<g>
    <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="2" fill="#ffffff" stroke="${LINE}"/>
    <rect x="${x + 14}" y="${y + 14}" width="${w - 28}" height="${h * 0.34}" fill="${colors.surface}" stroke="${LINE}"/>
    <rect x="${x + 28}" y="${y + 30}" width="${w * 0.34}" height="8" fill="${INK}" opacity="0.9"/>
    <rect x="${x + 28}" y="${y + 48}" width="${w * 0.48}" height="6" fill="${MUTED}" opacity="0.45"/>
    <rect x="${x + 28}" y="${y + 66}" width="${w * 0.2}" height="16" fill="${colors.primary}"/>
    <circle cx="${x + w - 52}" cy="${y + 56}" r="26" fill="${colors.accent}" opacity="0.9"/>
    <rect x="${x + 14}" y="${y + h * 0.46}" width="${(w - 40) / 3}" height="${h * 0.18}" fill="${colors.primary}" opacity="0.9"/>
    <rect x="${x + 26 + (w - 40) / 3}" y="${y + h * 0.46}" width="${(w - 40) / 3}" height="${h * 0.18}" fill="${colors.accent}" opacity="0.9"/>
    <rect x="${x + 38 + ((w - 40) / 3) * 2}" y="${y + h * 0.46}" width="${(w - 40) / 3}" height="${h * 0.18}" fill="${colors.primary}" opacity="0.18"/>
    <rect x="${x + 14}" y="${y + h * 0.72}" width="${w - 28}" height="${h * 0.17}" fill="#ffffff" stroke="${LINE}"/>
    <rect x="${x + 28}" y="${y + h * 0.77}" width="${w * 0.45}" height="7" fill="${INK}" opacity="0.75"/>
  </g>`;
}

function campaignTile(
  x: number,
  y: number,
  w: number,
  h: number,
  opts: {
    label: string;
    title: string;
    accent: string;
    cta: string;
    imageKind: "meta" | "story" | "google" | "hero";
    imageUrl?: string | null;
  }
): string {
  const label = clamp(opts.label, 24).toUpperCase();
  const title = clamp(opts.title, 42);
  const cta = clamp(opts.cta, 18).toUpperCase();
  if (opts.imageUrl) {
    const ctaW = Math.min(112, Math.max(82, cta.length * 6 + 22), w - 28);
    const ctaY = y + h - 31;
    return `<g>
      <rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#ffffff" stroke="${LINE}" stroke-width="1"/>
      <text x="${x + 14}" y="${y + 20}" font-size="8" font-weight="800" fill="${MUTED}" font-family="Inter, Arial, sans-serif">${esc(label)}</text>
      <image href="${esc(opts.imageUrl)}" x="${x + 12}" y="${y + 30}" width="${w - 24}" height="${h - 88}" preserveAspectRatio="xMidYMid slice"/>
      <text x="${x + 14}" y="${y + h - 42}" font-size="10" font-weight="900" fill="${INK}" font-family="Inter, Arial, sans-serif">${esc(clamp(title, 30))}</text>
      <rect x="${x + w - ctaW - 14}" y="${ctaY}" width="${ctaW}" height="22" rx="11" fill="${opts.accent}"/>
      <text x="${x + w - ctaW / 2 - 14}" y="${ctaY + 15}" text-anchor="middle" font-size="8" font-weight="900" fill="${textColorFor(opts.accent)}" font-family="Inter, Arial, sans-serif">${esc(cta)}</text>
    </g>`;
  }
  const visualX = x + w - 92;
  const visualY = y + 46;
  const visual =
    opts.imageKind === "story"
      ? `<rect x="${visualX + 22}" y="${visualY - 10}" width="44" height="82" rx="18" fill="${opts.accent}" opacity="0.9"/>
         <circle cx="${visualX + 44}" cy="${visualY + 18}" r="11" fill="#fff" opacity="0.85"/>
         <rect x="${visualX + 33}" y="${visualY + 48}" width="22" height="5" fill="#fff" opacity="0.75"/>`
      : opts.imageKind === "google"
        ? `<rect x="${visualX}" y="${visualY}" width="74" height="56" fill="${opts.accent}" opacity="0.9"/>
           <rect x="${visualX + 14}" y="${visualY + 15}" width="44" height="7" fill="#fff" opacity="0.9"/>
           <rect x="${visualX + 14}" y="${visualY + 32}" width="34" height="7" fill="#fff" opacity="0.7"/>`
        : opts.imageKind === "hero"
          ? `<rect x="${visualX - 4}" y="${visualY}" width="82" height="56" fill="${opts.accent}" opacity="0.9"/>
             <rect x="${visualX + 12}" y="${visualY + 17}" width="48" height="7" fill="#fff" opacity="0.9"/>
             <rect x="${visualX + 12}" y="${visualY + 34}" width="34" height="7" fill="#fff" opacity="0.7"/>`
          : `<rect x="${visualX - 2}" y="${visualY}" width="76" height="56" fill="${opts.accent}" opacity="0.16"/>
             <circle cx="${visualX + 36}" cy="${visualY + 28}" r="30" fill="${opts.accent}" opacity="0.9"/>
             <circle cx="${visualX + 36}" cy="${visualY + 28}" r="14" fill="#fff" opacity="0.55"/>`;
  return `<g>
    <rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#ffffff" stroke="${LINE}" stroke-width="1"/>
    <text x="${x + 16}" y="${y + 28}" font-size="9" font-weight="700" fill="${MUTED}" font-family="Inter, Arial, sans-serif">${esc(label)}</text>
    ${textLines(title, x + 16, y + 58, { maxChars: 16, maxLines: 3, size: 19, lineHeight: 21, weight: 900, fill: INK })}
    ${visual}
  </g>`;
}

function merchandisingTile(
  x: number,
  y: number,
  w: number,
  h: number,
  opts: {
    imageUrl?: string | null;
    primary: string;
    accent: string;
    surface: string;
    brand: string;
  },
): string {
  if (opts.imageUrl) {
    return `<g>
      <rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#ffffff" stroke="${LINE}" stroke-width="1"/>
      <image href="${esc(opts.imageUrl)}" x="${x + 18}" y="${y + 18}" width="${w - 36}" height="${h - 54}" preserveAspectRatio="xMidYMid slice"/>
      <rect x="${x + 18}" y="${y + h - 44}" width="${w - 36}" height="26" fill="#ffffff" opacity="0.94"/>
      <text x="${x + 32}" y="${y + h - 27}" font-size="12" font-weight="900" fill="${INK}" font-family="Inter, Arial, sans-serif">${esc(clamp(opts.brand, 28))} merch preview</text>
    </g>`;
  }

  return `<g>
    <rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#ffffff" stroke="${LINE}" stroke-width="1"/>
    <rect x="${x + 26}" y="${y + 32}" width="112" height="94" rx="10" fill="${opts.surface}" stroke="${LINE}"/>
    <path d="M${x + 58} ${y + 52} L${x + 80} ${y + 38} L${x + 104} ${y + 52} L${x + 96} ${y + 122} L${x + 66} ${y + 122} Z" fill="${opts.primary}" opacity="0.9"/>
    <rect x="${x + 164}" y="${y + 48}" width="70" height="86" rx="8" fill="#ffffff" stroke="${opts.primary}" stroke-width="5"/>
    <path d="M${x + 234} ${y + 72} C${x + 270} ${y + 72} ${x + 270} ${y + 112} ${x + 234} ${y + 112}" fill="none" stroke="${opts.accent}" stroke-width="8"/>
    <rect x="${x + 262}" y="${y + 36}" width="48" height="112" rx="8" fill="${opts.accent}" opacity="0.82"/>
    <rect x="${x + 272}" y="${y + 62}" width="28" height="8" fill="#ffffff" opacity="0.85"/>
    <rect x="${x + 32}" y="${y + 154}" width="${w - 64}" height="1" fill="${LINE}"/>
    <text x="${x + 32}" y="${y + 180}" font-size="12" font-weight="900" fill="${INK}" font-family="Inter, Arial, sans-serif">${esc(clamp(opts.brand, 28))} merch preview</text>
  </g>`;
}

function sectionTitle(x: number, y: number, n: string, label: string): string {
  return `<text x="${x}" y="${y}" font-size="13" font-weight="800" fill="${MUTED}" font-family="Inter, Arial, sans-serif">${esc(n)} - ${esc(label.toUpperCase())}</text>`;
}

export function renderBrandingShareImage(
  input: BrandingShareImageInput
): BrandingShareImageResult {
  const { spec, funnel, logoDataUrl, merchImage, campaignImages } = input;
  const pairing = getBrandingFontPairing(spec.fontPairingId);
  const brand = spec.brandName || "Brand";
  const realPalette = cleanBrandPalette(input.realPalette ?? []);
  const primary = realPalette[0] || "#0DA7AD";
  const accent = realPalette[1] || "#2F64A7";
  const surface = realPalette[2] || mixHex(primary, "#FFFFFF", 0.9);
  const deep = realPalette[3] || mixHex(accent, "#111111", 0.35);
  const colors = [
    { name: "Brand primary", hex: primary },
    { name: "Brand accent", hex: accent },
    { name: "Soft tint", hex: surface },
    { name: "Deep brand", hex: deep },
  ].slice(0, 4);

  const headline =
    funnel?.landingPage.hero ||
    spec.toneExamples.headline ||
    spec.tagline ||
    "Brand presence built to convert.";
  const metaTitle = funnel?.facebook.headline || "Social campaign";
  const storyTitle = funnel?.instagram.storyHook || funnel?.instagram.feedHeadline || "Story creative";
  const googleTitle = funnel?.google.displayHeadline || "Search + display";
  const metaCta = funnel?.facebook.cta || "Learn More";
  const storyCta = funnel?.instagram.storyCta || funnel?.instagram.feedCta || "Book Now";
  const googleCta = funnel?.google.displayCta || "Call Today";

  const personality = spec.brandPersonality.slice(0, 4);
  const brandMark = logoDataUrl
    ? `<image href="${esc(logoDataUrl)}" x="72" y="116" width="260" height="82" preserveAspectRatio="xMidYMid meet"/>`
    : `<text x="72" y="172" font-size="${brand.length > 22 ? 34 : 42}" font-weight="900" fill="${INK}" font-family="Inter, Arial, sans-serif">${esc(clamp(brand, 34).toUpperCase())}</text>`;

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}" role="img" aria-label="${esc(brand)} brand kit and sales funnel preview">
  <rect width="${WIDTH}" height="${HEIGHT}" fill="${BG}"/>
  <rect x="24" y="24" width="${WIDTH - 48}" height="${HEIGHT - 48}" fill="none" stroke="${LINE}" stroke-width="1"/>

  <text x="48" y="58" font-size="13" font-weight="800" fill="${MUTED}" font-family="Inter, Arial, sans-serif">BRAND KIT + SALES FUNNEL</text>
  <text x="${WIDTH - 48}" y="58" text-anchor="end" font-size="12" font-weight="700" fill="${MUTED}" font-family="Inter, Arial, sans-serif">ZENPHO PREVIEW</text>

  <g>
    <rect x="48" y="88" width="340" height="190" fill="#fff" stroke="${LINE}" stroke-width="1"/>
    ${brandMark}
    ${textLines(spec.tagline || spec.industry || "Brand system and campaign direction.", 74, 230, { maxChars: 38, maxLines: 2, size: 13, lineHeight: 17, fill: MUTED })}
  </g>

  <g>
    ${sectionTitle(420, 94, "01", "Palette")}
    ${colors.map((c, i) => chip(420 + (i % 2) * 170, 116 + Math.floor(i / 2) * 112, c.name, c.hex)).join("")}
  </g>

  <g>
    ${sectionTitle(780, 94, "02", "Typography")}
    <rect x="780" y="116" width="348" height="208" fill="#fff" stroke="${LINE}" stroke-width="1"/>
    ${textLines(pairing.displayFamily, 804, 174, { maxChars: 19, maxLines: 2, size: 27, lineHeight: 30, weight: 900 })}
    <line x1="804" y1="214" x2="1092" y2="214" stroke="${LINE}"/>
    <text x="804" y="250" font-size="18" font-weight="500" fill="${INK}" font-family="Georgia, serif">${esc(pairing.bodyFamily)}</text>
    <text x="1018" y="225" font-size="76" font-weight="900" fill="${primary}" font-family="Inter, Arial, sans-serif">Aa</text>
    ${textLines(pairing.vibe, 804, 292, { maxChars: 45, maxLines: 1, size: 11, lineHeight: 14, fill: MUTED })}
  </g>

  <g>
    ${sectionTitle(48, 342, "03", "Personality")}
    <rect x="48" y="364" width="340" height="206" fill="#fff" stroke="${LINE}" stroke-width="1"/>
    ${personality.map((p, i) => `<text x="74" y="${402 + i * 30}" font-size="23" font-weight="900" fill="${INK}" font-family="Inter, Arial, sans-serif">${esc(clamp(p, 20))}</text>`).join("")}
    ${textLines(spec.targetAudience || "Primary customer segment and buyer motivation.", 74, 538, { maxChars: 44, maxLines: 2, size: 12, lineHeight: 16, fill: MUTED })}
  </g>

  <g>
    ${sectionTitle(420, 342, "04", "Merchandising")}
    <rect x="420" y="364" width="338" height="206" fill="#fff" stroke="${LINE}" stroke-width="1"/>
    ${merchandisingTile(420, 364, 338, 206, { imageUrl: merchImage, primary, accent, surface, brand })}
  </g>

  <g>
    ${sectionTitle(790, 342, "05", "Website direction")}
    <rect x="790" y="364" width="338" height="456" fill="#fff" stroke="${LINE}" stroke-width="1"/>
    ${landingMiniature(812, 384, 294, 382, { primary, accent, surface }, campaignImages?.landingHero)}
    ${textLines(headline, 816, 798, { maxChars: 42, maxLines: 1, size: 13, lineHeight: 16, weight: 900, fill: INK })}
  </g>

  <g>
    ${sectionTitle(48, 640, "06", "Campaign assets")}
    ${campaignTile(48, 666, 220, 154, { label: "Facebook Ads", title: metaTitle, cta: metaCta, accent: primary, imageKind: "meta", imageUrl: campaignImages?.metaFeed })}
    ${campaignTile(286, 666, 220, 154, { label: "Instagram Ads", title: storyTitle, cta: storyCta, accent, imageKind: "story", imageUrl: campaignImages?.instagramStory })}
    ${campaignTile(524, 666, 220, 154, { label: "Google Display Ads", title: googleTitle, cta: googleCta, accent: primary, imageKind: "google", imageUrl: campaignImages?.googleDisplay })}
  </g>

  <line x1="48" y1="846" x2="1152" y2="846" stroke="${LINE}"/>
  <text x="48" y="872" font-size="12" font-weight="800" fill="${INK}" font-family="Inter, Arial, sans-serif">${esc(brand.toUpperCase())}</text>
  <text x="1152" y="872" text-anchor="end" font-size="12" font-weight="800" fill="${INK}" font-family="Inter, Arial, sans-serif">BRAND + FUNNEL SNAPSHOT</text>
</svg>`;

  return {
    svg,
    width: WIDTH,
    height: HEIGHT,
    filename: `${slugify(brand)}-brand-kit-sales-funnel-preview.png`,
  };
}
