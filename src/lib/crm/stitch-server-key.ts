/**
 * Server-only Stitch credentials for @google/stitch-sdk (HTTP tool client).
 * Never import this from client components.
 */

function normalizeApiKey(raw: string | undefined): string | undefined {
  if (typeof raw !== "string") return undefined;
  let t = raw.trim();
  if (
    (t.startsWith('"') && t.endsWith('"')) ||
    (t.startsWith("'") && t.endsWith("'"))
  ) {
    t = t.slice(1, -1).trim();
  }
  return t.length > 0 ? t : undefined;
}

/**
 * Reads STITCH_API_KEY, then GOOGLE_STITCH_API_KEY (optional alias).
 */
export function getStitchServerApiKey(): string | undefined {
  return (
    normalizeApiKey(process.env.STITCH_API_KEY) ??
    normalizeApiKey(process.env.GOOGLE_STITCH_API_KEY)
  );
}

export function isStitchServerApiKeyConfigured(): boolean {
  return Boolean(getStitchServerApiKey());
}

/** Returned when generate runs but no key is available on this server process. */
export const STITCH_API_KEY_MISSING_USER_MESSAGE =
  "No Stitch API key on this server. One-click generate uses Google’s Stitch HTTP API (@google/stitch-sdk), not Cursor MCP. Set STITCH_API_KEY (or GOOGLE_STITCH_API_KEY) in .env.local or your host env, restart npm run dev or redeploy, and do not wrap the value in quotes. See .env.example — or use Copy prompt & open Google Stitch.";
