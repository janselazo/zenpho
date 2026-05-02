import type { PlacesSearchPlace } from "@/lib/crm/places-types";
import type { BusinessSearchResult } from "@/lib/revenue-leak-audit/types";

/** Maps GBP search autocomplete rows into the Places shape branding PDF expects. */
export function businessSearchResultToPlacesPlace(r: BusinessSearchResult): PlacesSearchPlace {
  return {
    id: r.placeId,
    name: r.name,
    formattedAddress: r.address ?? null,
    rating: r.rating ?? null,
    userRatingCount: r.reviewCount ?? null,
    websiteUri: r.website?.trim() || null,
    types: [],
    nationalPhoneNumber: null,
    internationalPhoneNumber: null,
    googleMapsUri: r.googleMapsUri ?? null,
    businessStatus: null,
  };
}
