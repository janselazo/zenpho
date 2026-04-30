import {
  fetchBrandAssetsFromUrl,
  fetchPageHtml,
} from "@/lib/crm/brand-color-extract";
import { normalizeUrlForFetch } from "@/lib/crm/safe-url-fetch";
import { MOCK_BRAND_IDENTITY } from "./mock-data";
import type { BrandIdentitySummary, ServiceResult } from "./types";

const FONT_FAMILY_RE = /font-family\s*:\s*([^;}{]+)/gi;
const GOOGLE_FONT_RE = /fonts\.googleapis\.com\/css[^"')\s]*/gi;

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
    .trim();
  if (!cleaned || /inherit|initial|unset|system-ui|-apple-system/i.test(cleaned)) {
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
  while ((match = fontRe.exec(html)) !== null && families.size < 4) {
    for (const cleaned of cleanFontFamilies(match[1])) {
      if (families.size >= 4) break;
      families.add(cleaned);
    }
  }
  const googleFonts = new Set<string>();
  const googleRe = new RegExp(GOOGLE_FONT_RE.source, "gi");
  while ((match = googleRe.exec(html)) !== null && googleFonts.size < 3) {
    const url = match[0].replace(/&amp;/g, "&");
    const family = new URL(`https://${url}`).searchParams.get("family");
    if (family) googleFonts.add(family.split(":")[0].replace(/\+/g, " "));
  }

  const notes: string[] = [];
  if (googleFonts.size > 0) {
    notes.push(...googleFonts);
  }
  if (families.size > 0) {
    notes.push(...families);
  }
  if (notes.length === 0) {
    notes.push("No distinctive website typography was detected from the homepage HTML.");
  }
  return notes;
}

export async function analyzeBrandIdentity(
  websiteUrl: string | null
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
    const [assets, html] = await Promise.all([
      fetchBrandAssetsFromUrl(normalized),
      fetchPageHtml(normalized, 8000),
    ]);
    const palette = assets.colors?.palette ?? [];
    const summary: BrandIdentitySummary = {
      logoUrl: assets.logoUrl,
      palette,
      primaryColor: assets.colors?.primary ?? palette[0] ?? null,
      accentColor: assets.colors?.accent ?? palette[1] ?? null,
      typographyNotes: typographyNotesFromHtml(html),
      sourceUrl: normalized,
      brandPresenceSummary:
        palette.length > 0 || assets.logoUrl
          ? "Brand identity signals were extracted from the live website and can be used to personalize the audit report."
          : "The website was reachable, but logo and color signals were limited.",
      warnings: [],
    };
    const warnings =
      palette.length === 0 && !assets.logoUrl
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
