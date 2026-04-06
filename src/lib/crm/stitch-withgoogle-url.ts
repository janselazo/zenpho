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

/**
 * Live Stitch screen preview (same experience as in the Stitch web app).
 * Example: https://stitch.withgoogle.com/preview/11249266973760348805?node-id=4d88779fd33843a38ff74588bf20fd9f
 */
export function stitchWithGoogleScreenPreviewUrl(
  projectId: string,
  screenId: string
): string {
  const pid = projectId.trim();
  const sid = screenId.trim();
  if (!pid || !sid) return "";
  const base = getStitchWithGoogleAppBase();
  const u = new URL(`${base}/preview/${encodeURIComponent(pid)}`);
  u.searchParams.set("node-id", sid);
  return u.toString();
}

/** Only allow redirects to Stitch app hosts (avoid open redirects if DB is tampered). */
export function isAllowedStitchPreviewRedirectUrl(url: string): boolean {
  try {
    const u = new URL(url.trim());
    if (u.protocol !== "https:") return false;
    const host = u.hostname.toLowerCase();
    const hosts = new Set<string>(["stitch.withgoogle.com"]);
    try {
      hosts.add(new URL(getStitchWithGoogleAppBase()).hostname.toLowerCase());
    } catch {
      /* ignore invalid env base */
    }
    return hosts.has(host);
  } catch {
    return false;
  }
}
