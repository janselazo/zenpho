/**
 * Prospect vs Zenpho-authored PDF visuals: scrape-derived identity vs Zenpho fallback.
 */

import path from "node:path";
import { promises as fs } from "node:fs";

import type { ResolvedBrandAssets } from "@/lib/crm/prospect-branding-asset-resolve";

/** Align with `globals.css` @theme (--color-accent, accent-violet, surface, border). */
export const ZENPHO_PDF_PRIMARY_HEX = "#2563EB";
export const ZENPHO_PDF_ACCENT_HEX = "#0EA5E9";
export const ZENPHO_PDF_SURFACE_HEX = "#F4F7FA";
export const ZENPHO_PDF_PAPER_HEX = "#FFFFFF";
export const ZENPHO_PDF_MUTED_HEX = "#E8ECF1";

const LOGO_FILENAME = "zenpho-logo.png";
const MARK_FILENAME = "zenpho-mark.png";

function fileInPublic(rel: string): string {
  return path.join(process.cwd(), "public", rel);
}

/**
 * Any usable palette/accent/logo from the homepage scrape qualifies as buyer cues.
 * Empty resolution / null ⇒ generic Zenpho layout (logo + Zenpho blues).
 */
export function hasProspectBrandVisualCues(
  assets: ResolvedBrandAssets | null | undefined,
): boolean {
  if (!assets) return false;
  const hasPalette =
    Array.isArray(assets.palette) && assets.palette.some((h) => Boolean(h?.trim()));
  const hasPrimaryOrAccent =
    Boolean(assets.primary?.trim()) || Boolean(assets.accent?.trim());
  const hasLogo =
    Boolean(assets.logoPng?.length) || Boolean(assets.logoSvg?.trim());
  return hasPalette || hasPrimaryOrAccent || hasLogo;
}

export async function readZenphoPdfLogoPng(): Promise<Buffer | null> {
  try {
    const p = fileInPublic(LOGO_FILENAME);
    return await fs.readFile(p);
  } catch {
    return null;
  }
}

export async function readZenphoPdfMarkPng(): Promise<Buffer | null> {
  try {
    const p = fileInPublic(MARK_FILENAME);
    return await fs.readFile(p);
  } catch {
    return null;
  }
}
