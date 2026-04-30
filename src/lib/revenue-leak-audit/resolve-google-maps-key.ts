/**
 * First non-empty value wins. Used by RSC pages and `/api/revenue-leak-audit/map-key`
 * so the competitor map works with server-only vars (no NEXT_PUBLIC_ required).
 *
 * `GOOGLE_PLACES_API_KEY` is last: reuse only when that key also has **Maps JavaScript API**
 * enabled and browser-safe restrictions (HTTP referrers). IP-restricted Places keys will not work in the browser.
 */
export const GOOGLE_MAPS_KEY_ENV_NAMES = [
  "NEXT_PUBLIC_GOOGLE_MAPS_API_KEY",
  "GOOGLE_MAPS_API_KEY",
  "GOOGLE_MAPS_BROWSER_API_KEY",
  "MAPS_API_KEY",
  "GOOGLE_PLACES_API_KEY",
] as const;

export type GoogleMapsKeySource = (typeof GOOGLE_MAPS_KEY_ENV_NAMES)[number] | null;

export function resolveGoogleMapsKeyFromEnv(): {
  key: string | null;
  foundIn: GoogleMapsKeySource;
} {
  for (const name of GOOGLE_MAPS_KEY_ENV_NAMES) {
    const value = process.env[name]?.trim();
    if (value) return { key: value, foundIn: name };
  }
  return { key: null, foundIn: null };
}
