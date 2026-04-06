/**
 * Allow embedding the public preview in the CRM iframe when origins differ
 * (e.g. CRM on www.zenpho.com, preview on preview.zenpho.com or another Vercel URL).
 * Replaces X-Frame-Options: SAMEORIGIN, which blocks any cross-origin parent.
 */
function addOrigin(parts: Set<string>, raw: string) {
  const t = raw.trim();
  if (!t) return;
  try {
    const u = new URL(t.includes("://") ? t : `https://${t}`);
    parts.add(`${u.protocol}//${u.host}`);
    if (u.hostname.startsWith("www.")) {
      parts.add(`${u.protocol}//${u.hostname.slice(4)}`);
    } else if (u.hostname && !u.hostname.startsWith("localhost")) {
      parts.add(`${u.protocol}//www.${u.hostname}`);
    }
  } catch {
    /* ignore */
  }
}

/**
 * Value for `Content-Security-Policy: frame-ancestors …` (no leading directive name).
 */
export function prospectPreviewFrameAncestorsValue(): string {
  const parts = new Set<string>(["'self'"]);

  addOrigin(parts, process.env.PUBLIC_APP_URL ?? "");

  const extras = process.env.PREVIEW_FRAME_ANCESTORS?.split(",") ?? [];
  for (const e of extras) addOrigin(parts, e.trim());

  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) {
    const host = vercel.replace(/^https?:\/\//i, "");
    addOrigin(parts, `https://${host}`);
  }

  parts.add("http://localhost:3000");
  parts.add("https://localhost:3000");

  return [...parts].join(" ");
}

export function prospectPreviewHtmlResponseHeaders(): Record<string, string> {
  return {
    "Content-Type": "text/html; charset=utf-8",
    "Cache-Control": "public, max-age=120",
    "X-Content-Type-Options": "nosniff",
    "Content-Security-Policy": `frame-ancestors ${prospectPreviewFrameAncestorsValue()}`,
  };
}
