import type { AdsFunnelSpec } from "@/lib/crm/prospect-ads-funnel-spec-llm";
import { getBrandingFontPairing } from "@/lib/crm/branding-font-pairings";
import type { BrandingSpec } from "@/lib/crm/prospect-branding-spec-llm";

export type BrandingShareImageInput = {
  spec: BrandingSpec;
  funnel: AdsFunnelSpec | null;
  realPalette?: string[];
  logoDataUrl?: string | null;
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
    imageKind: "meta" | "story" | "google" | "hero";
    imageUrl?: string | null;
  }
): string {
  const label = clamp(opts.label, 24).toUpperCase();
  const title = clamp(opts.title, 42);
  if (opts.imageUrl) {
    return `<g>
      <rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#ffffff" stroke="${LINE}" stroke-width="1"/>
      <image href="${esc(opts.imageUrl)}" x="${x + 12}" y="${y + 12}" width="${w - 24}" height="${h - 62}" preserveAspectRatio="xMidYMid slice"/>
      <rect x="${x + 12}" y="${y + h - 48}" width="${w - 24}" height="36" fill="#ffffff" opacity="0.94"/>
      <text x="${x + 20}" y="${y + h - 28}" font-size="8" font-weight="800" fill="${MUTED}" font-family="Inter, Arial, sans-serif">${esc(label)}</text>
      <text x="${x + 20}" y="${y + h - 13}" font-size="12" font-weight="900" fill="${INK}" font-family="Inter, Arial, sans-serif">${esc(clamp(title, 30))}</text>
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

function sectionTitle(x: number, y: number, n: string, label: string): string {
  return `<text x="${x}" y="${y}" font-size="13" font-weight="800" fill="${MUTED}" font-family="Inter, Arial, sans-serif">${esc(n)} - ${esc(label.toUpperCase())}</text>`;
}

export function renderBrandingShareImage(
  input: BrandingShareImageInput
): BrandingShareImageResult {
  const { spec, funnel, logoDataUrl, campaignImages } = input;
  const pairing = getBrandingFontPairing(spec.fontPairingId);
  const brand = spec.brandName || "Brand";
  const realPalette = (input.realPalette ?? [])
    .map((hex) => safeHex(hex, ""))
    .filter(Boolean)
    .slice(0, 5);
  const primary = safeHex(realPalette[0] || spec.primaryColors[0]?.hex, "#0DA7AD");
  const accent = safeHex(
    realPalette[1] || spec.primaryColors[1]?.hex || spec.secondaryColors[0]?.hex,
    "#2F64A7",
  );
  const surface = safeHex(realPalette[2] || spec.secondaryColors[0]?.hex, "#EAF7F8");
  const deep = safeHex(realPalette[3] || spec.secondaryColors[1]?.hex, "#123D68");
  const colors = [
    { name: spec.primaryColors[0]?.name || "Primary", hex: primary },
    { name: spec.primaryColors[1]?.name || "Accent", hex: accent },
    { name: spec.secondaryColors[0]?.name || "Surface", hex: surface },
    { name: spec.secondaryColors[1]?.name || "Deep", hex: deep },
  ].slice(0, 4);

  const headline =
    funnel?.landingPage.hero ||
    spec.toneExamples.headline ||
    spec.tagline ||
    "Brand presence built to convert.";
  const metaTitle = funnel?.facebook.headline || "Social campaign";
  const storyTitle = funnel?.instagram.storyHook || funnel?.instagram.feedHeadline || "Story creative";
  const googleTitle = funnel?.google.displayHeadline || "Search + display";
  const heroTitle = funnel?.landingPage.ctaPrimary || "Landing page CTA";

  const personality = spec.brandPersonality.slice(0, 4);
  const motifs = spec.keyVisualElements.slice(0, 4);
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
    ${sectionTitle(420, 342, "04", "Art direction")}
    <rect x="420" y="364" width="338" height="206" fill="#fff" stroke="${LINE}" stroke-width="1"/>
    <rect x="444" y="388" width="126" height="76" fill="${primary}"/>
    <circle cx="542" cy="426" r="30" fill="${accent}" opacity="0.9"/>
    <rect x="586" y="388" width="148" height="76" fill="${surface}" stroke="${LINE}"/>
    <path d="M608 444 C630 398 665 402 692 430 C708 446 718 450 734 438" fill="none" stroke="${primary}" stroke-width="8" opacity="0.55"/>
    <rect x="444" y="482" width="86" height="62" fill="${accent}" opacity="0.9"/>
    <rect x="546" y="482" width="86" height="62" fill="${primary}" opacity="0.18"/>
    <rect x="648" y="482" width="86" height="62" fill="${INK}" opacity="0.92"/>
    ${motifs.map((m, i) => `<text x="${i < 2 ? 444 : 594}" y="${610 + (i % 2) * 20}" font-size="10" fill="${MUTED}" font-family="Inter, Arial, sans-serif">- ${esc(clamp(m, 30))}</text>`).join("")}
  </g>

  <g>
    ${sectionTitle(790, 342, "05", "Website direction")}
    <rect x="790" y="364" width="338" height="206" fill="#fff" stroke="${LINE}" stroke-width="1"/>
    ${landingMiniature(812, 388, 294, 118, { primary, accent, surface }, campaignImages?.landingHero)}
    ${textLines(headline, 816, 542, { maxChars: 42, maxLines: 2, size: 15, lineHeight: 19, weight: 900, fill: INK })}
  </g>

  <g>
    ${sectionTitle(48, 640, "06", "Campaign assets")}
    ${campaignTile(48, 666, 254, 154, { label: "Meta feed", title: metaTitle, accent: primary, imageKind: "meta", imageUrl: campaignImages?.metaFeed })}
    ${campaignTile(320, 666, 254, 154, { label: "Instagram story", title: storyTitle, accent, imageKind: "story", imageUrl: campaignImages?.instagramStory })}
    ${campaignTile(592, 666, 254, 154, { label: "Google display", title: googleTitle, accent: primary, imageKind: "google", imageUrl: campaignImages?.googleDisplay })}
    ${campaignTile(864, 666, 264, 154, { label: "Hero banner", title: heroTitle, accent, imageKind: "hero", imageUrl: campaignImages?.heroBanner })}
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
