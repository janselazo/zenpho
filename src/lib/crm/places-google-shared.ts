import type { PlacesSearchPlace } from "@/lib/crm/places-types";

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
};

/** Text Search (New) — keep to Essentials / commonly supported fields; `businessStatus` is requested via Place Details after Autocomplete. */
export const PLACES_TEXT_SEARCH_FIELD_MASK =
  "places.id,places.displayName,places.formattedAddress,places.rating,places.userRatingCount,places.websiteUri,places.types,places.nationalPhoneNumber,places.internationalPhoneNumber,places.googleMapsUri";

export const PLACES_DETAILS_FIELD_MASK =
  "id,displayName,formattedAddress,rating,userRatingCount,websiteUri,types,nationalPhoneNumber,internationalPhoneNumber,googleMapsUri,businessStatus";

export function normalizePlacesApiPlace(p: GoogPlaceJson): PlacesSearchPlace | null {
  const id = p.id ?? "";
  const name = p.displayName?.text?.trim() ?? "";
  if (!id || !name) return null;
  const status = p.businessStatus?.trim();
  return {
    id,
    name,
    formattedAddress: p.formattedAddress ?? null,
    rating: typeof p.rating === "number" ? p.rating : null,
    userRatingCount:
      typeof p.userRatingCount === "number" ? p.userRatingCount : null,
    websiteUri: p.websiteUri ?? null,
    types: Array.isArray(p.types) ? p.types : [],
    nationalPhoneNumber: p.nationalPhoneNumber?.trim() || null,
    internationalPhoneNumber: p.internationalPhoneNumber?.trim() || null,
    googleMapsUri: p.googleMapsUri?.trim() || null,
    businessStatus: status || null,
  };
}
