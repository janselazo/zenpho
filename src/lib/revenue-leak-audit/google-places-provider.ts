import {
  MOCK_BUSINESS,
  MOCK_SEARCH_RESULTS,
  mockCompetitors,
  mockRankingSnapshot,
} from "./mock-data";
import { parsePlaceReviewRating, parseStarRatingEnum } from "./review-selection";
import type {
  BusinessIdentityAttribute,
  BusinessPhoto,
  BusinessProfile,
  BusinessReview,
  BusinessSearchResult,
  Competitor,
  GoogleLocalRankItem,
  GoogleLocalRankingSnapshot,
  ServiceResult,
} from "./types";

type GoogleText = { text?: string; languageCode?: string };
type GooglePlacePhoto = {
  name?: string;
  widthPx?: number;
  heightPx?: number;
  authorAttributions?: { displayName?: string }[];
};
type GooglePlaceReview = {
  name?: string;
  relativePublishTimeDescription?: string;
  rating?: number;
  /** Present on some Places payloads as an enum string (e.g. `FIVE`). */
  starRating?: string;
  text?: GoogleText;
  originalText?: GoogleText;
  publishTime?: string;
  authorAttribution?: { displayName?: string };
};

type GooglePlace = {
  id?: string;
  displayName?: GoogleText;
  formattedAddress?: string;
  rating?: number;
  userRatingCount?: number;
  websiteUri?: string;
  types?: string[];
  primaryTypeDisplayName?: GoogleText;
  nationalPhoneNumber?: string;
  internationalPhoneNumber?: string;
  googleMapsUri?: string;
  businessStatus?: string;
  location?: { latitude?: number; longitude?: number };
  regularOpeningHours?: { weekdayDescriptions?: string[] };
  photos?: GooglePlacePhoto[];
  reviews?: GooglePlaceReview[];
  iconBackgroundColor?: string;
  iconMaskBaseUri?: string;
};

const TEXT_SEARCH_FIELD_MASK = [
  "places.id",
  "places.displayName",
  "places.formattedAddress",
  "places.rating",
  "places.userRatingCount",
  "places.websiteUri",
  "places.types",
  "places.primaryTypeDisplayName",
  "places.nationalPhoneNumber",
  "places.internationalPhoneNumber",
  "places.googleMapsUri",
  "places.businessStatus",
  "places.location",
  "places.photos",
  "places.iconBackgroundColor",
  "places.iconMaskBaseUri",
].join(",");

const DETAILS_FIELD_MASK = [
  "id",
  "displayName",
  "formattedAddress",
  "rating",
  "userRatingCount",
  "websiteUri",
  "types",
  "primaryTypeDisplayName",
  "nationalPhoneNumber",
  "internationalPhoneNumber",
  "googleMapsUri",
  "businessStatus",
  "location",
  "regularOpeningHours",
  "photos",
  /** Places returns a small relevance-sorted sample; see `review-selection.ts`. */
  "reviews",
  "iconBackgroundColor",
  "iconMaskBaseUri",
].join(",");

function apiKey(): string | null {
  return process.env.GOOGLE_PLACES_API_KEY?.trim() || null;
}

function cleanCategory(types: string[], primary?: GoogleText): string | null {
  const primaryText = primary?.text?.trim();
  if (primaryText) return primaryText;
  const first = types.find(Boolean);
  if (!first) return null;
  return first
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function normalizePhotos(photos: GooglePlacePhoto[] | undefined): BusinessPhoto[] {
  return (photos ?? []).map((p) => ({
    name: p.name?.trim() || null,
    widthPx: typeof p.widthPx === "number" ? p.widthPx : null,
    heightPx: typeof p.heightPx === "number" ? p.heightPx : null,
    authorAttributions: p.authorAttributions
      ?.map((a) => a.displayName?.trim())
      .filter((x): x is string => Boolean(x)),
  }));
}

function normalizeReviews(reviews: GooglePlaceReview[] | undefined): BusinessReview[] {
  return (reviews ?? []).map((r) => ({
    authorName: r.authorAttribution?.displayName?.trim() || null,
    rating: parsePlaceReviewRating(r.rating) ?? parseStarRatingEnum(r.starRating),
    text: r.text?.text?.trim() || r.originalText?.text?.trim() || null,
    publishTime: r.publishTime?.trim() || null,
    relativePublishTime: r.relativePublishTimeDescription?.trim() || null,
  }));
}

function detectGoogleIdentityAttributes(p: GooglePlace): BusinessIdentityAttribute[] {
  const haystack = [
    p.displayName?.text,
    p.formattedAddress,
    p.primaryTypeDisplayName?.text,
    ...(p.types ?? []),
    ...(p.reviews ?? []).map((r) => r.text?.text ?? r.originalText?.text ?? ""),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (/\blatino[-\s]?owned\b|\blatina[-\s]?owned\b|\blatinx[-\s]?owned\b|\bhispanic[-\s]?owned\b/.test(haystack)) {
    return [
      {
        id: "latino_owned",
        label: "Identifies as Latino-owned",
        detected: true,
        source: "google",
      },
    ];
  }
  return [];
}

function normalizeIconBackgroundColor(raw: string | undefined): string | null {
  const s = raw?.trim();
  if (!s) return null;
  return s.startsWith("#") ? s : `#${s}`;
}

function normalizeIconMaskBaseUri(raw: string | undefined): string | null {
  const s = raw?.trim();
  if (!s) return null;
  return s.replace(/\/+$/, "");
}

function normalizeBusiness(p: GooglePlace): BusinessProfile | null {
  const placeId = p.id?.trim();
  const name = p.displayName?.text?.trim();
  if (!placeId || !name) return null;
  const types = Array.isArray(p.types) ? p.types : [];
  const photos = normalizePhotos(p.photos);
  return {
    placeId,
    name,
    address: p.formattedAddress?.trim() || null,
    phone:
      p.nationalPhoneNumber?.trim() ||
      p.internationalPhoneNumber?.trim() ||
      null,
    website: p.websiteUri?.trim() || null,
    category: cleanCategory(types, p.primaryTypeDisplayName),
    iconBackgroundColor: normalizeIconBackgroundColor(p.iconBackgroundColor),
    iconMaskBaseUri: normalizeIconMaskBaseUri(p.iconMaskBaseUri),
    types,
    rating: typeof p.rating === "number" ? p.rating : null,
    reviewCount:
      typeof p.userRatingCount === "number" ? Math.round(p.userRatingCount) : null,
    reviews: normalizeReviews(p.reviews),
    photos,
    photoCount: photos.length || null,
    coordinates:
      typeof p.location?.latitude === "number" &&
      typeof p.location?.longitude === "number"
        ? { lat: p.location.latitude, lng: p.location.longitude }
        : null,
    hours: p.regularOpeningHours?.weekdayDescriptions ?? [],
    googleMapsUri: p.googleMapsUri?.trim() || null,
    businessStatus: p.businessStatus?.trim() || null,
    identityAttributes: detectGoogleIdentityAttributes(p),
  };
}

function toSearchResult(b: BusinessProfile): BusinessSearchResult {
  return {
    placeId: b.placeId,
    name: b.name,
    address: b.address,
    category: b.category,
    rating: b.rating,
    reviewCount: b.reviewCount,
    website: b.website,
    coordinates: b.coordinates,
    googleMapsUri: b.googleMapsUri,
  };
}

function marketStrengthScore(b: {
  rating: number | null;
  reviewCount: number | null;
  website: string | null;
  photoCount: number | null;
}): number {
  const ratingScore = Math.min(40, Math.max(0, ((b.rating ?? 0) / 5) * 40));
  const reviewScore = Math.min(35, Math.log10((b.reviewCount ?? 0) + 1) * 12);
  const websiteScore = b.website ? 15 : 0;
  const photoScore = Math.min(10, (b.photoCount ?? 0) * 1.5);
  return Math.round(ratingScore + reviewScore + websiteScore + photoScore);
}

function haversineMiles(
  a: { lat: number; lng: number } | null,
  b: { lat: number; lng: number } | null
): number | null {
  if (!a || !b) return null;
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad;
  const dLng = (b.lng - a.lng) * rad;
  const lat1 = a.lat * rad;
  const lat2 = b.lat * rad;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return Math.round(3958.8 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h)) * 10) / 10;
}

function toCompetitor(
  b: BusinessProfile,
  selected: BusinessProfile,
  rank: number
): Competitor {
  return {
    placeId: b.placeId,
    name: b.name,
    address: b.address,
    website: b.website,
    rating: b.rating,
    reviewCount: b.reviewCount,
    photoCount: b.photoCount,
    category: b.category,
    types: b.types,
    iconBackgroundColor: b.iconBackgroundColor,
    iconMaskBaseUri: b.iconMaskBaseUri,
    coordinates: b.coordinates,
    marketStrengthScore: marketStrengthScore(b),
    distanceMiles: haversineMiles(selected.coordinates, b.coordinates),
    rank,
  };
}

async function placesTextSearch(
  textQuery: string,
  pageSize = 10
): Promise<{ places: BusinessProfile[]; warning: string | null }> {
  const key = apiKey();
  if (!key) {
    return {
      places: [],
      warning: "Google Places API key is missing. Showing mock data.",
    };
  }
  const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": key,
      "X-Goog-FieldMask": TEXT_SEARCH_FIELD_MASK,
    },
    body: JSON.stringify({
      textQuery,
      languageCode: "en",
      regionCode: "US",
      includePureServiceAreaBusinesses: true,
      pageSize,
    }),
  });

  if (!res.ok) {
    const detail = (await res.text()).slice(0, 180);
    return {
      places: [],
      warning: `Places search failed (${res.status}). ${detail}`,
    };
  }

  const data = (await res.json()) as { places?: GooglePlace[] };
  return {
    places: (data.places ?? [])
      .map(normalizeBusiness)
      .filter((x): x is BusinessProfile => Boolean(x)),
    warning: null,
  };
}

export async function searchBusinesses(input: {
  businessName: string;
  city?: string;
}): Promise<ServiceResult<BusinessSearchResult[]>> {
  const businessName = input.businessName.trim();
  const city = input.city?.trim();
  if (!apiKey()) {
    return {
      data: MOCK_SEARCH_RESULTS,
      warnings: ["Google Places API key is missing. Showing mock business results."],
    };
  }
  const query = city ? `${businessName} in ${city}` : businessName;
  const { places, warning } = await placesTextSearch(query, 8);
  return {
    data: places.map(toSearchResult),
    warnings: warning ? [warning] : [],
  };
}

export async function getBusinessDetails(
  placeId: string
): Promise<ServiceResult<BusinessProfile | null>> {
  if (!apiKey()) {
    return {
      data: placeId === MOCK_BUSINESS.placeId ? MOCK_BUSINESS : { ...MOCK_BUSINESS, placeId },
      warnings: ["Google Places API key is missing. Showing mock business details."],
    };
  }

  const res = await fetch(
    `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey()!,
        "X-Goog-FieldMask": DETAILS_FIELD_MASK,
      },
    }
  );

  if (!res.ok) {
    const detail = (await res.text()).slice(0, 180);
    return {
      data: null,
      warnings: [`Place details failed (${res.status}). ${detail}`],
    };
  }
  const place = normalizeBusiness((await res.json()) as GooglePlace);
  return {
    data: place,
    warnings: place ? [] : ["Could not normalize Google Business Profile details."],
  };
}

function rankItemFromBusiness(
  b: BusinessProfile,
  position: number,
  selectedId: string
): GoogleLocalRankItem {
  return {
    position,
    placeId: b.placeId,
    name: b.name,
    address: b.address,
    rating: b.rating,
    reviewCount: b.reviewCount,
    category: b.category,
    website: b.website,
    isSelectedBusiness: b.placeId === selectedId,
  };
}

export async function discoverCompetitors(input: {
  business: BusinessProfile;
  serviceArea: string;
}): Promise<
  ServiceResult<{
    competitors: Competitor[];
    rankingSnapshot: GoogleLocalRankingSnapshot;
  }>
> {
  if (!apiKey()) {
    return {
      data: {
        competitors: mockCompetitors(),
        rankingSnapshot: mockRankingSnapshot(),
      },
      warnings: ["Google Places API key is missing. Showing mock competitor data."],
    };
  }

  const category = input.business.category || input.business.types[0] || "local service business";
  const location =
    input.serviceArea ||
    input.business.address?.split(",").slice(-2, -1)[0]?.trim() ||
    "near me";
  const query = `${category} near ${location}`;
  const { places, warning } = await placesTextSearch(query, 20);
  const selectedIndex = places.findIndex((p) => p.placeId === input.business.placeId);
  const competitors = places
    .filter((p) => p.placeId !== input.business.placeId)
    .slice(0, 12)
    .map((p, index) => toCompetitor(p, input.business, index + 1));

  const topForReviews = competitors.slice(0, 3);
  if (topForReviews.length > 0) {
    const detailResults = await Promise.allSettled(
      topForReviews.map((c) => getBusinessDetails(c.placeId))
    );
    detailResults.forEach((result, idx) => {
      if (result.status !== "fulfilled") return;
      const detail = result.value.data;
      if (!detail || !detail.reviews?.length) return;
      const target = competitors.find((c) => c.placeId === topForReviews[idx].placeId);
      if (target) target.reviews = detail.reviews.slice(0, 5);
    });
  }

  const topFive = places
    .slice(0, 5)
    .map((p, index) => rankItemFromBusiness(p, index + 1, input.business.placeId));
  const selectedBusinessPosition = selectedIndex >= 0 ? selectedIndex + 1 : null;
  const selectedBusinessRankItem =
    selectedIndex >= 0
      ? rankItemFromBusiness(places[selectedIndex], selectedIndex + 1, input.business.placeId)
      : rankItemFromBusiness(
          input.business,
          Math.max(places.length, topFive.length) + 1,
          input.business.placeId
        );

  const warnings = [
    ...(warning ? [warning] : []),
    competitors.length < 10
      ? `Only ${competitors.length} direct competitors were returned for this market sample.`
      : null,
    selectedBusinessPosition === null
      ? `Selected business was not found in the first ${places.length} Google results checked; shown after checked results.`
      : null,
  ].filter((x): x is string => Boolean(x));

  return {
    data: {
      competitors,
      rankingSnapshot: {
        query,
        location,
        topFive,
        selectedBusinessPosition: selectedBusinessRankItem.position,
        selectedBusinessRankItem,
        totalResultsChecked: places.length,
        warnings,
      },
    },
    warnings,
  };
}
