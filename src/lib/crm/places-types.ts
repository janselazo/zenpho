/** Normalized Google Places API (New) search result for the CRM UI. */

export type PlacesSearchPlace = {
  id: string;
  name: string;
  formattedAddress: string | null;
  rating: number | null;
  userRatingCount: number | null;
  websiteUri: string | null;
  types: string[];
  nationalPhoneNumber: string | null;
  internationalPhoneNumber: string | null;
  googleMapsUri: string | null;
  /** Google listing lifecycle, e.g. OPERATIONAL, CLOSED_PERMANENTLY (Place Details / Text Search when requested). */
  businessStatus: string | null;
};
