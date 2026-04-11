/** Discriminator for doc vs. industry (and future categories). */
export type AgencyDocType = "doc" | "industry";

/** Default body for custom docs when no row exists in `agency_workspace_doc`. */
export const DEFAULT_CUSTOM_DOC_BODY = "";

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function isValidCustomDocSlugFormat(slug: string): boolean {
  return slug.length > 0 && slug.length <= 96 && SLUG_PATTERN.test(slug);
}

/** Derive a URL slug from a title (lowercase, hyphens). */
export function slugifyTitle(title: string): string {
  const s = title
    .trim()
    .toLowerCase()
    .replace(/['']/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return s || "document";
}

/** Normalize user-provided slug input. */
export function normalizeSlugInput(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export type AgencyCustomDocRow = {
  id: string;
  slug: string;
  title: string;
  description: string;
  icon_key: string | null;
  doc_type: AgencyDocType;
  created_at: string;
  created_by: string | null;
};
