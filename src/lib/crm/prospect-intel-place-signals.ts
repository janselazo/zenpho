import type { IntelSignals } from "@/lib/crm/prospect-intel-report";
import type { PlacesSearchPlace } from "@/lib/crm/places-types";

export function signalsFromPlace(place: PlacesSearchPlace): IntelSignals {
  const uri = place.websiteUri?.trim() || null;
  return {
    name: place.name,
    hasWebsite: Boolean(uri),
    websiteUrl: uri,
    https: uri ? uri.startsWith("https:") : undefined,
    pageTitle: null,
    metaDescription: null,
    rating: place.rating,
    reviewCount: place.userRatingCount,
    placeTypes: place.types,
    formattedAddress: place.formattedAddress,
  };
}
