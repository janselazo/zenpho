/** Helpers for Prospects Places discover UI (favicons, type labels). */

const GENERIC_PLACE_TYPES = new Set([
  "establishment",
  "point_of_interest",
  "geocode",
  "premise",
  "street_address",
]);

export function websiteHostnameFromUri(uri: string | null | undefined): string | null {
  const u = uri?.trim();
  if (!u) return null;
  try {
    const parsed = new URL(/^https?:\/\//i.test(u) ? u : `https://${u}`);
    const host = parsed.hostname.replace(/^www\./i, "");
    return host || null;
  } catch {
    return null;
  }
}

/** Google-hosted favicon (no API key). Falls back should be handled in UI on error. */
export function googleFaviconUrl(hostname: string, size = 64): string {
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(hostname)}&sz=${size}`;
}

export function primaryPlaceTypeLabel(types: string[] | undefined): string {
  if (!types?.length) return "Business";
  const t = types.find((x) => x && !GENERIC_PLACE_TYPES.has(x));
  if (!t) return "Business";
  return t
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function initialsFromName(name: string, maxLen = 2): string {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!parts.length) return "?";
  if (parts.length === 1) return parts[0].slice(0, maxLen).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
