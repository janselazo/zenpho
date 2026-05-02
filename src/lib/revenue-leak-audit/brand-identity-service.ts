import { resolveProspectBrandAssets } from "@/lib/crm/prospect-branding-asset-resolve";
import { normalizeUrlForFetch } from "@/lib/crm/safe-url-fetch";
import { MOCK_BRAND_IDENTITY } from "./mock-data";
import type { BrandIdentitySummary, ServiceResult } from "./types";

const FONT_FAMILY_RE = /font-family\s*:\s*([^;}{]+)/gi;
const GOOGLE_FONT_RE = /fonts\.googleapis\.com\/css2?[^"')\s]*/gi;
const ELEMENTOR_HOSTED_GF_RE =
  /(?:href|src)=["']([^"']*\/uploads\/elementor\/google-fonts\/css\/([a-z0-9_-]+)\.css[^"']*)["']/gi;

function labelFromFontFileSlug(slug: string): string {
  const compact = slug.toLowerCase().replace(/[-_]/g, "");
  const splitSuffix = compact.match(/^(.*?)(sans|slab|serif|display|mono|script)$/i);
  const spaced =
    splitSuffix && splitSuffix[1] ? `${splitSuffix[1]} ${splitSuffix[2]}` : slug.replace(/[-_]/g, " ");
  return spaced.replace(/\b\w/g, (c) => c.toUpperCase());
}

function addGoogleFontFamiliesFromApiUrl(hrefRaw: string, into: Set<string>): void {
  const normalized = hrefRaw.replace(/&amp;/g, "&").trim();
  if (!normalized) return;
  let u: URL;
  try {
    u = /^https?:\/\//i.test(normalized) ? new URL(normalized) : new URL(`https://${normalized}`);
  } catch {
    return;
  }
  for (const raw of u.searchParams.getAll("family")) {
    const name = raw.split(":")[0].replace(/\+/g, " ").trim();
    if (name) into.add(name);
  }
}

function humanizeFontName(value: string): string | null {
  const trimmed = value.trim();
  const wpVar = trimmed.match(/var\(--wp--preset--font-family--([^)]+)\)/i);
  const raw = wpVar ? wpVar[1] : trimmed;
  const cleaned = raw
    .replace(/!important/gi, "")
    .replace(/["']/g, "")
    .replace(/^var\(|\)$/g, "")
    .replace(/^--wp--preset--font-family--/i, "")
    .replace(/[-_]+/g, " ")
    .replace(/^[(]+|[)]+$/g, "")
    .trim();
  if (!cleaned || /inherit|initial|unset|system-ui|-apple-system/i.test(cleaned)) {
    return null;
  }
  const lower = cleaned.toLowerCase().replace(/\s+/g, " ");
  if (/^sans serif$|^serif$|^monospace$|^cursive$|^fantasy$|^ui sans serif$/.test(lower)) {
    return null;
  }
  if (/^theme\s+font/i.test(lower)) {
    return null;
  }
  if (/^(star|dashicons|fontawesome|fa-solid|eicons|icomoon)$/i.test(lower)) {
    return null;
  }
  if (/e global typography|typography text font family|^e typography\b|font family$/i.test(lower)) {
    return null;
  }
  if (/^[0-9a-f]{6,}\s*font family$/i.test(lower) || /^font family\s*[0-9a-f]{6,}$/i.test(lower)) {
    return null;
  }
  if (/\b[0-9a-f]{7,}\b.*font family/i.test(lower) || /font family.*\b[0-9a-f]{7,}\b/i.test(lower)) {
    return null;
  }
  if (/\bdemo\b/i.test(lower)) {
    return null;
  }
  return cleaned.replace(/\b\w/g, (char) => char.toUpperCase());
}

function cleanFontFamilies(value: string): string[] {
  return value
    .replace(/!important/gi, "")
    .replace(/["']/g, "")
    .split(",")
    .map(humanizeFontName)
    .filter((x): x is string => Boolean(x));
}

function typographyNotesFromHtml(html: string | null): string[] {
  if (!html) return [];
  const families = new Set<string>();
  let match: RegExpExecArray | null;
  const fontRe = new RegExp(FONT_FAMILY_RE.source, "gi");
  while ((match = fontRe.exec(html)) !== null && families.size < 6) {
    for (const cleaned of cleanFontFamilies(match[1])) {
      if (families.size >= 6) break;
      families.add(cleaned);
    }
  }
  const googleFonts = new Set<string>();
  const googleRe = new RegExp(GOOGLE_FONT_RE.source, "gi");
  while ((match = googleRe.exec(html)) !== null && googleFonts.size < 8) {
    addGoogleFontFamiliesFromApiUrl(match[0], googleFonts);
  }
  const elementorRe = new RegExp(ELEMENTOR_HOSTED_GF_RE.source, "gi");
  while ((match = elementorRe.exec(html)) !== null && googleFonts.size < 8) {
    const slug = match[2];
    if (slug) googleFonts.add(labelFromFontFileSlug(slug));
  }

  const notes: string[] = [];
  const seenNote = new Set<string>();
  const pushUnique = (label: string) => {
    const k = label.toLowerCase();
    if (seenNote.has(k)) return;
    seenNote.add(k);
    notes.push(label);
    if (notes.length >= 8) return;
  };
  if (googleFonts.size > 0) {
    for (const g of googleFonts) {
      pushUnique(g);
      if (notes.length >= 8) break;
    }
  }
  if (families.size > 0) {
    for (const f of families) {
      pushUnique(f);
      if (notes.length >= 8) break;
    }
  }
  if (notes.length === 0) {
    notes.push("No distinctive website typography was detected from the homepage HTML.");
  }
  return notes;
}

export async function analyzeBrandIdentity(
  websiteUrl: string | null,
  businessName: string | null = null,
): Promise<ServiceResult<BrandIdentitySummary>> {
  const normalized = websiteUrl ? normalizeUrlForFetch(websiteUrl) : null;
  if (!normalized) {
    return {
      data: {
        ...MOCK_BRAND_IDENTITY,
        logoUrl: null,
        sourceUrl: websiteUrl,
        brandPresenceSummary:
          "No crawlable website was available, so logo, palette, and typography could not be extracted.",
        warnings: ["Brand assets unavailable because the business website is missing or blocked."],
      },
      warnings: ["Brand assets unavailable because the business website is missing or blocked."],
    };
  }

  try {
    const assets = await resolveProspectBrandAssets({ websiteUrl: normalized, businessName });
    const palette = assets.palette;
    const summary: BrandIdentitySummary = {
      logoUrl: assets.logoSourceUrl,
      palette,
      primaryColor: assets.primary ?? palette[0] ?? null,
      accentColor: assets.accent ?? palette[1] ?? null,
      typographyNotes: typographyNotesFromHtml(assets.markupForTypography),
      sourceUrl: normalized,
      brandPresenceSummary:
        palette.length > 0 || assets.logoSourceUrl
          ? "Brand identity signals were extracted from the live website and can be used to personalize the audit report."
          : "The website was reachable, but logo and color signals were limited.",
      warnings: [],
    };
    const warnings =
      palette.length === 0 && !assets.logoSourceUrl
        ? ["Brand assets were limited on the selected website."]
        : [];
    return { data: { ...summary, warnings }, warnings };
  } catch {
    return {
      data: {
        ...MOCK_BRAND_IDENTITY,
        logoUrl: null,
        sourceUrl: normalized,
        brandPresenceSummary:
          "Brand extraction failed, so the report will use Zenpho styling until assets are available.",
        warnings: ["Brand assets unavailable."],
      },
      warnings: ["Brand assets unavailable."],
    };
  }
}
