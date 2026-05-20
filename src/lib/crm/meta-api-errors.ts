/** User-facing copy for common Meta Graph / Ad Library API failures. */
export function friendlyMetaApiError(raw: string | null | undefined): string | null {
  if (!raw?.trim()) return null;
  const text = raw.trim();

  if (
    /session has expired|error validating access token|expired.*access token/i.test(
      text,
    )
  ) {
    return "Meta API access token expired. Generate a new token in Meta Business Manager, set META_ACCESS_TOKEN in .env.local (or Vercel env vars), then restart the app.";
  }

  if (
    /pages_read_engagement|Page Public Content Access|Page Public Metadata Access|Could not resolve a numeric Facebook Page ID|Application does not have permission/i.test(
      text,
    )
  ) {
    return "Meta blocks third-party Page metadata, so this report uses Pixel detection and an Ad Library keyword scan.";
  }

  return text;
}
