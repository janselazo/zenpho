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

export function prospectPreviewPageUrl(previewId: string): string {
  const base = getPublicAppOrigin();
  return `${base}/preview/${previewId}`;
}
