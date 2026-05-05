import type { PlacesSearchPlace } from "@/lib/crm/places-types";

function coerceFiniteNumber(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const t = v.trim();
    if (!t) return null;
    const n = Number(t);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function coerceFiniteInt(v: unknown): number | null {
  const n = coerceFiniteNumber(v);
  return n === null ? null : Math.round(n);
}

/**
 * Coerce rating, review count, and website URI after JSON/session restore or odd API shapes
 * so UI heuristics (highlights, filters) match glance facts.
 */
export function sanitizePlacesSearchPlace(p: PlacesSearchPlace): PlacesSearchPlace {
  const w = p.websiteUri;
  const websiteUri =
    w == null ? null : String(w).trim() || null;
  const refs = Array.isArray(p.photoRefs)
    ? p.photoRefs
        .map((x) => (typeof x === "string" ? x.trim() : ""))
        .filter(Boolean)
        .slice(0, 6)
    : undefined;
  return {
    ...p,
    rating: coerceFiniteNumber(p.rating),
    userRatingCount: coerceFiniteInt(p.userRatingCount),
    websiteUri,
    ...(refs?.length ? { photoRefs: refs } : {}),
  };
}

/** Raw Place object from Google Places API (New) Text Search or Place Details. */
export type GoogPlaceJson = {
  id?: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  rating?: number;
  userRatingCount?: number;
  websiteUri?: string;
  types?: string[];
  nationalPhoneNumber?: string;
  internationalPhoneNumber?: string;
  googleMapsUri?: string;
  businessStatus?: string;
  photos?: Array<{ name?: string }>;
};

/** Text Search (New) — keep to Essentials / commonly supported fields; `businessStatus` is requested via Place Details after Autocomplete. */
export const PLACES_TEXT_SEARCH_FIELD_MASK =
  "places.id,places.displayName,places.formattedAddress,places.rating,places.userRatingCount,places.websiteUri,places.types,places.nationalPhoneNumber,places.internationalPhoneNumber,places.googleMapsUri";

export const PLACES_DETAILS_FIELD_MASK =
  "id,displayName,formattedAddress,rating,userRatingCount,websiteUri,types,nationalPhoneNumber,internationalPhoneNumber,googleMapsUri,businessStatus,photos";

export function normalizePlacesApiPlace(p: GoogPlaceJson): PlacesSearchPlace | null {
  const id = p.id ?? "";
  const name = p.displayName?.text?.trim() ?? "";
  if (!id || !name) return null;
  const status = p.businessStatus?.trim();
  const photoRefs = Array.isArray(p.photos)
    ? p.photos
        .map((ph) =>
          typeof ph?.name === "string" ? ph.name.trim() : ""
        )
        .filter(Boolean)
        .slice(0, 6)
    : [];
  const out: PlacesSearchPlace = {
    id,
    name,
    formattedAddress: p.formattedAddress ?? null,
    rating: coerceFiniteNumber(p.rating),
    userRatingCount: coerceFiniteInt(p.userRatingCount),
    websiteUri: p.websiteUri == null ? null : String(p.websiteUri).trim() || null,
    types: Array.isArray(p.types) ? p.types : [],
    nationalPhoneNumber: p.nationalPhoneNumber?.trim() || null,
    internationalPhoneNumber: p.internationalPhoneNumber?.trim() || null,
    googleMapsUri: p.googleMapsUri?.trim() || null,
    businessStatus: status || null,
  };
  if (photoRefs.length) out.photoRefs = photoRefs;
  return out;
}
