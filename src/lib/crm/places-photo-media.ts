/**
 * Server-side Place Photo fetch (Places API — New).
 * Caller must enforce auth; responses are JPEG/PNG blobs from Google.
 */

const SAFE_PLACE_PHOTO_REF = /^places\/[^\s]+\/photos\/[^\s]+$/;

export async function fetchGooglePlacePhotoMedia(
  apiKey: string,
  photoResourceName: string,
  opts?: { maxPx?: number }
): Promise<ArrayBuffer | null> {
  const key = apiKey.trim();
  const ref = photoResourceName.trim();
  if (!key || !ref || !SAFE_PLACE_PHOTO_REF.test(ref)) return null;
  const px = opts?.maxPx ?? 960;
  const url = `https://places.googleapis.com/v1/${ref}/media`;
  const u = new URL(url);
  u.searchParams.set("maxHeightPx", String(px));
  u.searchParams.set("maxWidthPx", String(px));
  const res = await fetch(u.toString(), {
    method: "GET",
    headers: {
      "X-Goog-Api-Key": key,
      Accept: "image/*,*/*",
    },
  });
  if (!res.ok) return null;
  const ct = res.headers.get("Content-Type") ?? "";
  if (!ct.startsWith("image/")) return null;
  return res.arrayBuffer();
}
