import type { AdsFunnelSpec } from "@/lib/crm/prospect-ads-funnel-spec-llm";
import { getBrandingFontPairing } from "@/lib/crm/branding-font-pairings";
import type { BrandingSpec } from "@/lib/crm/prospect-branding-spec-llm";

export type BrandingShareImageInput = {
  spec: BrandingSpec;
  funnel: AdsFunnelSpec | null;
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

function chip(x: number, y: number, label: string, color: string): string {
  return `<g>
    <rect x="${x}" y="${y}" width="154" height="96" fill="${color}" stroke="${LINE}" stroke-width="1"/>
    <text x="${x + 14}" y="${y + 32}" font-size="11" font-weight="700" fill="${color.toLowerCase() === "#ffffff" ? INK : "#ffffff"}" font-family="Inter, Arial, sans-serif">${esc(clamp(label, 18).toUpperCase())}</text>
    <text x="${x + 14}" y="${y + 56}" font-size="13" font-weight="700" fill="${color.toLowerCase() === "#ffffff" ? INK : "#ffffff"}" font-family="Inter, Arial, sans-serif">${esc(color)}</text>
  </g>`;
}

function campaignTile(
  x: number,
  y: number,
  w: number,
  h: number,
  opts: { label: string; title: string; accent: string; imageKind: "meta" | "story" | "google" | "hero" }
): string {
  const label = clamp(opts.label, 24).toUpperCase();
  const title = clamp(opts.title, 54);
  const visual =
    opts.imageKind === "story"
      ? `<rect x="${x + w - 78}" y="${y + 34}" width="48" height="${h - 64}" rx="22" fill="${opts.accent}" opacity="0.9"/>
         <circle cx="${x + w - 54}" cy="${y + 64}" r="14" fill="#fff" opacity="0.85"/>`
      : opts.imageKind === "google"
        ? `<rect x="${x + w - 96}" y="${y + 38}" width="62" height="62" fill="${opts.accent}" opacity="0.9"/>
           <rect x="${x + w - 83}" y="${y + 54}" width="36" height="8" fill="#fff" opacity="0.9"/>
           <rect x="${x + w - 83}" y="${y + 72}" width="28" height="8" fill="#fff" opacity="0.7"/>`
        : opts.imageKind === "hero"
          ? `<rect x="${x + w - 118}" y="${y + 42}" width="84" height="54" fill="${opts.accent}" opacity="0.9"/>
             <rect x="${x + w - 106}" y="${y + 58}" width="54" height="8" fill="#fff" opacity="0.9"/>
             <rect x="${x + w - 106}" y="${y + 76}" width="36" height="8" fill="#fff" opacity="0.7"/>`
          : `<circle cx="${x + w - 58}" cy="${y + 70}" r="34" fill="${opts.accent}" opacity="0.9"/>
             <circle cx="${x + w - 58}" cy="${y + 70}" r="18" fill="#fff" opacity="0.55"/>`;
  return `<g>
    <rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#ffffff" stroke="${LINE}" stroke-width="1"/>
    <text x="${x + 18}" y="${y + 30}" font-size="10" font-weight="700" fill="${MUTED}" font-family="Inter, Arial, sans-serif">${esc(label)}</text>
    ${textLines(title, x + 18, y + 62, { maxChars: 18, maxLines: 3, size: 25, lineHeight: 27, weight: 900, fill: INK })}
    ${visual}
  </g>`;
}

function sectionTitle(x: number, y: number, n: string, label: string): string {
  return `<text x="${x}" y="${y}" font-size="13" font-weight="800" fill="${MUTED}" font-family="Inter, Arial, sans-serif">${esc(n)} - ${esc(label.toUpperCase())}</text>`;
}

export function renderBrandingShareImage(
  input: BrandingShareImageInput
): BrandingShareImageResult {
  const { spec, funnel } = input;
  const pairing = getBrandingFontPairing(spec.fontPairingId);
  const brand = spec.brandName || "Brand";
  const primary = safeHex(spec.primaryColors[0]?.hex, "#111111");
  const accent = safeHex(spec.primaryColors[1]?.hex || spec.secondaryColors[0]?.hex, "#D8D3C8");
  const surface = safeHex(spec.secondaryColors[0]?.hex, "#F7F5F0");
  const colors = [
    spec.primaryColors[0] ? { name: spec.primaryColors[0].name, hex: primary } : { name: "Primary", hex: primary },
    spec.primaryColors[1] ? { name: spec.primaryColors[1].name, hex: accent } : { name: "Accent", hex: accent },
    spec.secondaryColors[0] ? { name: spec.secondaryColors[0].name, hex: surface } : { name: "Surface", hex: surface },
    ...(spec.secondaryColors[1] ? [{ name: spec.secondaryColors[1].name, hex: safeHex(spec.secondaryColors[1].hex, "#FFFFFF") }] : []),
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

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}" role="img" aria-label="${esc(brand)} brand kit and sales funnel preview">
  <rect width="${WIDTH}" height="${HEIGHT}" fill="${BG}"/>
  <rect x="24" y="24" width="${WIDTH - 48}" height="${HEIGHT - 48}" fill="none" stroke="${LINE}" stroke-width="1"/>

  <text x="48" y="58" font-size="13" font-weight="800" fill="${MUTED}" font-family="Inter, Arial, sans-serif">BRAND KIT + SALES FUNNEL</text>
  <text x="${WIDTH - 48}" y="58" text-anchor="end" font-size="12" font-weight="700" fill="${MUTED}" font-family="Inter, Arial, sans-serif">ZENPHO PREVIEW</text>

  <g>
    <rect x="48" y="88" width="340" height="190" fill="#fff" stroke="${LINE}" stroke-width="1"/>
    <text x="72" y="172" font-size="${brand.length > 22 ? 46 : 58}" font-weight="900" fill="${INK}" font-family="Inter, Arial, sans-serif">${esc(clamp(brand, 34).toUpperCase())}</text>
    ${textLines(spec.tagline || spec.industry || "Brand system and campaign direction.", 74, 214, { maxChars: 36, maxLines: 2, size: 15, lineHeight: 20, fill: MUTED })}
  </g>

  <g>
    ${sectionTitle(420, 94, "01", "Palette")}
    ${colors.map((c, i) => chip(420 + (i % 2) * 170, 116 + Math.floor(i / 2) * 112, c.name, c.hex)).join("")}
  </g>

  <g>
    ${sectionTitle(780, 94, "02", "Typography")}
    <rect x="780" y="116" width="348" height="208" fill="#fff" stroke="${LINE}" stroke-width="1"/>
    <text x="804" y="178" font-size="34" font-weight="900" fill="${INK}" font-family="Inter, Arial, sans-serif">${esc(pairing.displayFamily)}</text>
    <line x1="804" y1="202" x2="1104" y2="202" stroke="${LINE}"/>
    <text x="804" y="240" font-size="21" font-weight="500" fill="${INK}" font-family="Georgia, serif">${esc(pairing.bodyFamily)}</text>
    <text x="1022" y="224" font-size="88" font-weight="900" fill="${primary}" font-family="Inter, Arial, sans-serif">Aa</text>
    <text x="804" y="282" font-size="12" fill="${MUTED}" font-family="Inter, Arial, sans-serif">${esc(pairing.vibe)}</text>
  </g>

  <g>
    ${sectionTitle(48, 342, "03", "Personality")}
    <rect x="48" y="364" width="340" height="206" fill="#fff" stroke="${LINE}" stroke-width="1"/>
    ${personality.map((p, i) => `<text x="74" y="${402 + i * 34}" font-size="27" font-weight="900" fill="${INK}" font-family="Inter, Arial, sans-serif">${esc(p)}</text>`).join("")}
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
    ${motifs.map((m, i) => `<text x="${i < 2 ? 444 : 594}" y="${610 + (i % 2) * 22}" font-size="12" fill="${MUTED}" font-family="Inter, Arial, sans-serif">- ${esc(clamp(m, 32))}</text>`).join("")}
  </g>

  <g>
    ${sectionTitle(790, 342, "05", "Website direction")}
    <rect x="790" y="364" width="338" height="206" fill="#fff" stroke="${LINE}" stroke-width="1"/>
    <rect x="816" y="392" width="286" height="88" fill="${surface}" stroke="${LINE}"/>
    <rect x="838" y="416" width="130" height="10" fill="${INK}"/>
    <rect x="838" y="438" width="190" height="8" fill="${MUTED}" opacity="0.55"/>
    <rect x="838" y="460" width="76" height="16" fill="${primary}"/>
    <circle cx="1058" cy="436" r="34" fill="${accent}" opacity="0.85"/>
    ${textLines(headline, 816, 526, { maxChars: 42, maxLines: 2, size: 18, lineHeight: 23, weight: 900, fill: INK })}
  </g>

  <g>
    ${sectionTitle(48, 640, "06", "Campaign assets")}
    ${campaignTile(48, 666, 254, 154, { label: "Meta feed", title: metaTitle, accent: primary, imageKind: "meta" })}
    ${campaignTile(320, 666, 254, 154, { label: "Instagram story", title: storyTitle, accent, imageKind: "story" })}
    ${campaignTile(592, 666, 254, 154, { label: "Google display", title: googleTitle, accent: primary, imageKind: "google" })}
    ${campaignTile(864, 666, 264, 154, { label: "Hero banner", title: heroTitle, accent, imageKind: "hero" })}
  </g>

  <line x1="48" y1="846" x2="1152" y2="846" stroke="${LINE}"/>
  <text x="48" y="872" font-size="12" font-weight="800" fill="${INK}" font-family="Inter, Arial, sans-serif">${esc(brand.toUpperCase())}</text>
  <text x="600" y="872" text-anchor="middle" font-size="12" fill="${MUTED}" font-family="Inter, Arial, sans-serif">OUTREACH PREVIEW</text>
  <text x="1152" y="872" text-anchor="end" font-size="12" font-weight="800" fill="${INK}" font-family="Inter, Arial, sans-serif">BRAND + FUNNEL SNAPSHOT</text>
</svg>`;

  return {
    svg,
    width: WIDTH,
    height: HEIGHT,
    filename: `${slugify(brand)}-brand-kit-sales-funnel-preview.png`,
  };
}
