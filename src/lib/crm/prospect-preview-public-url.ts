/**
 * Canonical HTTPS origin for public preview URLs (SMS/MMS, email, screenshot APIs).
 */
export function getPublicAppOrigin(): string {
  const explicit = process.env.PUBLIC_APP_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, "");
  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) {
    const host = vercel.replace(/^https?:\/\//i, "");
    return `https://${host}`;
  }
  return "http://localhost:3000";
}

/**
 * Public link for a prospect preview.
 * - If `PREVIEW_PUBLIC_HOST` is set (e.g. `preview.zenpho.com`) and `slug` is set → `https://preview.zenpho.com/{slug}`.
 * - Else if `slug` is set → `{PUBLIC_APP_URL}/preview/{slug}`.
 * - Else → `{PUBLIC_APP_URL}/preview/{uuid}` (legacy).
 */
/**
 * Stable screenshot/crawler URL: primary app origin + `/preview/{uuid}`.
 * Used by Microlink screenshot capture and any bot/crawler flow that must avoid
 * pretty-domain rewrites.
 */
export function prospectPreviewMicrolinkUrl(previewId: string): string {
  return `${getPublicAppOrigin()}/preview/${previewId}`;
}

/**
 * URL merged into SMS/email outreach templates (`{{previewUrl}}`).
 *
 * Defaults to the branded preview page URL (e.g. `https://preview.zenpho.com/{slug}`)
 * when `PREVIEW_PUBLIC_HOST` and a slug are available. Email screenshot embeds are
 * handled separately, so outbound copy can keep the clean public preview domain.
 *
 * Set env **`PROSPECT_OUTBOUND_USE_MICROLINK_URL=true`** to force the raw app
 * origin + `/preview/{uuid}` link for debugging or protected preview-host setups.
 */
export function prospectOutboundTemplatePreviewUrl(
  previewId: string,
  slug?: string | null
): string {
  const legacy = process.env.PROSPECT_OUTBOUND_USE_MICROLINK_URL?.trim().toLowerCase();
  if (legacy === "true" || legacy === "1") {
    return prospectPreviewMicrolinkUrl(previewId);
  }
  return prospectPreviewPageUrl(previewId, slug);
}

export function prospectPreviewPageUrl(previewId: string, slug?: string | null): string {
  const hostOnly = process.env.PREVIEW_PUBLIC_HOST?.trim()
    .replace(/^https?:\/\//i, "")
    .replace(/\/.*$/, "")
    .trim();

  const s = typeof slug === "string" && slug.trim() ? slug.trim() : null;

  if (hostOnly && s) {
    return `https://${hostOnly}/${s}`;
  }

  const base = getPublicAppOrigin();
  if (s) {
    return `${base}/preview/${s}`;
  }
  return `${base}/preview/${previewId}`;
}
