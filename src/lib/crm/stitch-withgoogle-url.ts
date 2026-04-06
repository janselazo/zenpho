/**
 * stitch.withgoogle.com URLs (client-safe: uses NEXT_PUBLIC_STITCH_APP_URL when set).
 * Project pages use /projects/{numericProjectId} per Stitch’s web app routing.
 */

export function getStitchWithGoogleAppBase(): string {
  const raw =
    typeof process.env.NEXT_PUBLIC_STITCH_APP_URL === "string"
      ? process.env.NEXT_PUBLIC_STITCH_APP_URL.trim()
      : "";
  return (raw || "https://stitch.withgoogle.com").replace(/\/+$/, "");
}

/** Home / landing (e.g. after “Copy prompt & open Google Stitch”). */
export function stitchWithGoogleAppHomeUrl(): string {
  return `${getStitchWithGoogleAppBase()}/`;
}

/** Open this generated project in the Stitch web app. */
export function stitchWithGoogleProjectUrl(projectId: string): string {
  const id = projectId.trim();
  if (!id) return stitchWithGoogleAppHomeUrl();
  return `${getStitchWithGoogleAppBase()}/projects/${encodeURIComponent(id)}`;
}
