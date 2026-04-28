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
 * Used by Microlink screenshot capture and optionally outbound SMS/email
 * when env `PROSPECT_OUTBOUND_USE_MICROLINK_URL` is enabled.
 */
export function prospectPreviewMicrolinkUrl(previewId: string): string {
  return `${getPublicAppOrigin()}/preview/${previewId}`;
}

/**
 * URL merged into SMS/email outreach templates (`{{previewUrl}}`).
 *
 * Defaults to the primary app origin + `/preview/{uuid}` because email clients
 * crawl links and can render a Vercel Deployment Protection login card for a
 * protected `PREVIEW_PUBLIC_HOST` subdomain.
 *
 * Set env **`PROSPECT_OUTBOUND_USE_PRETTY_URL=true`** to use the pretty
 * `PREVIEW_PUBLIC_HOST` link in outbound copy when that host is public.
 *
 * Legacy support: **`PROSPECT_OUTBOUND_USE_MICROLINK_URL=false`** also opts into
 * the pretty URL.
 */
export function prospectOutboundTemplatePreviewUrl(
  previewId: string,
  slug?: string | null
): string {
  const pretty = process.env.PROSPECT_OUTBOUND_USE_PRETTY_URL?.trim().toLowerCase();
  const legacy = process.env.PROSPECT_OUTBOUND_USE_MICROLINK_URL?.trim().toLowerCase();
  if (pretty === "true" || pretty === "1" || legacy === "false" || legacy === "0") {
    return prospectPreviewPageUrl(previewId, slug);
  }
  return prospectPreviewMicrolinkUrl(previewId);
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
