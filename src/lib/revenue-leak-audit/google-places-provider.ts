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
  Coordinates,
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
  /** Rare: if Google attaches merchant reply objects, we detect them (field names vary). */
  reply?: unknown;
  reviewReply?: unknown;
  merchantReply?: unknown;
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
  /** Places can return numbers; some JSON shapes use numeric strings. */
  location?: { latitude?: number | string; longitude?: number | string };
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

function replyLooksPresent(reply: unknown): boolean {
  if (reply == null) return false;
  if (typeof reply === "string") return reply.trim().length > 0;
  if (typeof reply !== "object") return false;
  const o = reply as Record<string, unknown>;
  const candidates = [o.text, o.comment, o.body, o.reply, o.message];
  for (const c of candidates) {
    if (typeof c === "string" && c.trim()) return true;
    if (c && typeof c === "object" && "text" in c) {
      const t = (c as { text?: string }).text;
      if (typeof t === "string" && t.trim()) return true;
    }
  }
  return false;
}

/**
 * `true` / `false` when the payload includes a known reply field; `undefined` when absent (cannot infer).
 */
function extractHasOwnerReply(r: GooglePlaceReview): boolean | undefined {
  const any = r as Record<string, unknown>;
  const keys = ["reply", "reviewReply", "merchantReply"] as const;
  for (const k of keys) {
    if (!Object.prototype.hasOwnProperty.call(any, k)) continue;
    return replyLooksPresent(any[k]);
  }
  return undefined;
}

function normalizeReviews(reviews: GooglePlaceReview[] | undefined): BusinessReview[] {
  return (reviews ?? []).map((r) => {
    const hasOwnerReply = extractHasOwnerReply(r);
    return {
      authorName: r.authorAttribution?.displayName?.trim() || null,
      rating: parsePlaceReviewRating(r.rating) ?? parseStarRatingEnum(r.starRating),
      text: r.text?.text?.trim() || r.originalText?.text?.trim() || null,
      publishTime: r.publishTime?.trim() || null,
      relativePublishTime: r.relativePublishTimeDescription?.trim() || null,
      ...(hasOwnerReply !== undefined ? { hasOwnerReply } : {}),
    };
  });
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

/** Google Place resource IDs may be `ChIJ…` or `places/ChIJ…`; compare canonical suffixes. */
export function samePlaceId(a: string, b: string): boolean {
  const sa = stripPlacesResourcePrefix(a);
  const sb = stripPlacesResourcePrefix(b);
  if (sa === sb) return true;
  if (!sa.length || !sb.length) return false;
  /* Search vs Details payloads occasionally differ only by casing — treat as the same GBP. */
  return sa.toLowerCase() === sb.toLowerCase();
}

function stripPlacesResourcePrefix(id: string): string {
  return id.trim().replace(/^places\//, "");
}

/** Places API (New) GET uses `/v1/places/{placeId}` where {placeId} is the ID without a `places/` prefix. */
function placeIdForDetailsRequest(placeId: string): string {
  return stripPlacesResourcePrefix(placeId);
}

function parseLocationCoordinates(
  location: GooglePlace["location"] | undefined
): { lat: number; lng: number } | null {
  if (!location) return null;
  const lat = Number(location.latitude);
  const lng = Number(location.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
}

function normalizeBusiness(p: GooglePlace): BusinessProfile | null {
  const rawId = p.id?.trim();
  const name = p.displayName?.text?.trim();
  if (!rawId || !name) return null;
  const placeId = rawId.startsWith("places/") ? rawId : `places/${stripPlacesResourcePrefix(rawId)}`;
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
    coordinates: parseLocationCoordinates(p.location),
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

const NAME_JOIN_STOP = new Set([
  "the",
  "and",
  "a",
  "an",
  "in",
  "at",
  "of",
  "llc",
  "inc",
  "corp",
  "pllc",
  "ltd",
  "co",
]);

function normalizeComparableName(raw: string | null | undefined): string {
  return (raw ?? "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, "and")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function meaningfulNameTokens(norm: string): string[] {
  return norm.split(" ").filter((t) => t.length > 1 && !NAME_JOIN_STOP.has(t));
}

function namesCompatibleForSameListing(nameA: string, nameB: string): boolean {
  const na = normalizeComparableName(nameA);
  const nb = normalizeComparableName(nameB);
  const ta = meaningfulNameTokens(na);
  const tb = meaningfulNameTokens(nb);
  if (!ta.length || !tb.length) return false;

  let inter = 0;
  const sb = new Set(tb);
  for (const w of ta) if (sb.has(w)) inter++;
  const union = new Set([...ta, ...tb]).size;
  if (inter >= 2 && union > 0 && inter / union >= 0.45) return true;

  const compactA = na.replace(/\s+/g, "");
  const compactB = nb.replace(/\s+/g, "");
  if (compactA.length >= 10 && compactB.length >= 10) {
    if (compactA.includes(compactB) || compactB.includes(compactA)) return true;
  }
  return inter / Math.max(1, union) >= 0.58;
}

function digitsLast10Phone(phone: string | null | undefined): string | null {
  const d = (phone ?? "").replace(/\D/g, "");
  return d.length >= 10 ? d.slice(-10) : null;
}

function zipFiveFromAddress(addr: string | null | undefined): string | null {
  const m = addr?.match(/\b(\d{5})(?:-\d{4})?\b/);
  return m?.[1] ?? null;
}

function leadingStreetNumber(addr: string | null | undefined): string | null {
  const m = addr?.trim().match(/^(\d{2,7})\b/);
  return m?.[1] ?? null;
}

/**
 * Text Search vs Place Details can return different `id` shapes for the same storefront.
 * When strict `samePlaceId` fails, conservatively match on name + phone or coordinates or
 * ZIP + street number so `googleTextSearchPosition` matches what the user sees in Maps.
 */
function anchorsLikelySameListing(candidate: BusinessProfile, anchor: BusinessProfile): boolean {
  if (samePlaceId(candidate.placeId, anchor.placeId)) return true;
  if (!namesCompatibleForSameListing(candidate.name, anchor.name)) return false;

  const pc = digitsLast10Phone(candidate.phone);
  const pa = digitsLast10Phone(anchor.phone);
  if (pc && pa && pc === pa) return true;

  const dist = haversineMiles(candidate.coordinates, anchor.coordinates);
  if (dist != null && dist <= 0.5) return true;

  const zc = zipFiveFromAddress(candidate.address);
  const za = zipFiveFromAddress(anchor.address);
  if (zc && za && zc === za) {
    const nc = leadingStreetNumber(candidate.address);
    const na = leadingStreetNumber(anchor.address);
    if (nc && na && nc === na) return true;
    const dZip = haversineMiles(candidate.coordinates, anchor.coordinates);
    if (dZip != null && dZip <= 1.2) return true;
  }

  return false;
}

/**
 * Higher = stronger for peer comparison (ratings, reviews, proximity). Used to rank the
 * audited sample so position reflects reputation signals, not raw API sort order alone.
 */
function localPeerMeritScore(
  b: BusinessProfile,
  anchor: { lat: number; lng: number } | null
): number {
  const rating = b.rating ?? 0;
  const reviews = Math.max(0, b.reviewCount ?? 0);
  const dist = haversineMiles(anchor, b.coordinates);

  const starPts = (rating / 5) * 48;
  const reviewPts = Math.min(42, Math.log10(reviews + 1) * 16);

  let proximityPts = 6;
  if (dist == null) {
    proximityPts = 4;
  } else if (dist <= 3) {
    proximityPts = 16;
  } else if (dist <= 15) {
    proximityPts = 16 - (dist - 3) * 0.55;
  } else if (dist <= 45) {
    proximityPts = Math.max(2, 9.4 - (dist - 15) * 0.22);
  } else {
    proximityPts = 0;
  }

  const webPts = b.website ? 4 : 0;
  return starPts + reviewPts + proximityPts + webPts;
}

function compareMeritDescending(a: BusinessProfile, b: BusinessProfile, anchor: Coordinates | null): number {
  const sa = localPeerMeritScore(a, anchor);
  const sb = localPeerMeritScore(b, anchor);
  if (sb !== sa) return sb - sa;
  const ra = a.reviewCount ?? 0;
  const rb = b.reviewCount ?? 0;
  if (rb !== ra) return rb - ra;
  const sta = a.rating ?? 0;
  const stb = b.rating ?? 0;
  if (stb !== sta) return stb - sta;
  return stripPlacesResourcePrefix(a.placeId).localeCompare(stripPlacesResourcePrefix(b.placeId));
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

async function placesTextSearchPage(
  textQuery: string,
  pageSize: number,
  pageToken: string | null
): Promise<{ places: BusinessProfile[]; nextPageToken: string | null; warning: string | null }> {
  const key = apiKey();
  if (!key) {
    return {
      places: [],
      nextPageToken: null,
      warning: "Google Places API key is missing. Showing mock data.",
    };
  }
  const body: Record<string, unknown> = {
    textQuery,
    languageCode: "en",
    regionCode: "US",
    includePureServiceAreaBusinesses: true,
    pageSize: Math.min(Math.max(1, pageSize), 20),
  };
  if (pageToken) body.pageToken = pageToken;

  const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": key,
      "X-Goog-FieldMask": TEXT_SEARCH_FIELD_MASK,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const detail = (await res.text()).slice(0, 180);
    return {
      places: [],
      nextPageToken: null,
      warning: `Places search failed (${res.status}). ${detail}`,
    };
  }

  const data = (await res.json()) as { places?: GooglePlace[]; nextPageToken?: string };
  const places = (data.places ?? [])
    .map(normalizeBusiness)
    .filter((x): x is BusinessProfile => Boolean(x));
  const next = data.nextPageToken?.trim();
  return {
    places,
    nextPageToken: next || null,
    warning: null,
  };
}

async function placesTextSearchAllPages(
  textQuery: string,
  options: {
    maxPages: number;
    stopWhenFoundPlaceId?: string;
    /** When strict Place ID pagination stop misses, stop as soon as listing looks like the anchor. */
    anchorForHeuristicStop?: BusinessProfile | null;
  },
): Promise<{ orderedPlaces: BusinessProfile[]; warning: string | null }> {
  const pageSize = 20;
  const maxPages = Math.max(1, Math.min(options.maxPages, 5));
  let pageToken: string | null = null;
  let warning: string | null = null;
  const seen = new Set<string>();
  const orderedPlaces: BusinessProfile[] = [];

  for (let page = 0; page < maxPages; page++) {
    if (page > 0) {
      if (!pageToken) break;
      await new Promise((r) => setTimeout(r, 2000));
    }
    const batch = await placesTextSearchPage(textQuery, pageSize, page > 0 ? pageToken : null);
    if (batch.warning) warning = batch.warning;
    pageToken = batch.nextPageToken;

    for (const p of batch.places) {
      const id = stripPlacesResourcePrefix(p.placeId);
      if (seen.has(id)) continue;
      seen.add(id);
      orderedPlaces.push(p);
    }

    if (options.stopWhenFoundPlaceId || options.anchorForHeuristicStop) {
      let hit = false;
      if (options.stopWhenFoundPlaceId) {
        hit = orderedPlaces.some((p) => samePlaceId(p.placeId, options.stopWhenFoundPlaceId!));
      }
      if (
        !hit &&
        options.anchorForHeuristicStop &&
        orderedPlaces.some((p) => anchorsLikelySameListing(p, options.anchorForHeuristicStop!))
      ) {
        hit = true;
      }
      if (hit) break;
    }

    if (!pageToken) break;
  }

  return { orderedPlaces, warning };
}

async function placesTextSearch(
  textQuery: string,
  pageSize = 10
): Promise<{ places: BusinessProfile[]; warning: string | null }> {
  const { places, warning } = await placesTextSearchPage(textQuery, pageSize, null);
  return { places, warning };
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
      data: samePlaceId(placeId, MOCK_BUSINESS.placeId) ? MOCK_BUSINESS : { ...MOCK_BUSINESS, placeId },
      warnings: ["Google Places API key is missing. Showing mock business details."],
    };
  }

  const res = await fetch(
    `https://places.googleapis.com/v1/places/${encodeURIComponent(placeIdForDetailsRequest(placeId))}`,
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
    isSelectedBusiness: samePlaceId(b.placeId, selectedId),
  };
}

export async function discoverCompetitors(input: {
  business: BusinessProfile;
  serviceArea: string;
}): Promise<
  ServiceResult<{
    competitors: Competitor[];
    rankingSnapshot: GoogleLocalRankingSnapshot;
    resolvedBusinessCoordinates: { lat: number; lng: number } | null;
  }>
> {
  if (!apiKey()) {
    return {
      data: {
        competitors: mockCompetitors(),
        rankingSnapshot: mockRankingSnapshot(),
        resolvedBusinessCoordinates: input.business.coordinates ?? MOCK_BUSINESS.coordinates ?? null,
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
  const { orderedPlaces: places, warning: searchWarning } = await placesTextSearchAllPages(query, {
    maxPages: 3,
    stopWhenFoundPlaceId: input.business.placeId,
    anchorForHeuristicStop: input.business,
  });
  const strictIndex = places.findIndex((p) => samePlaceId(p.placeId, input.business.placeId));
  let selectedIndex = strictIndex;
  if (selectedIndex < 0) {
    const fuzzyIndex = places.findIndex((p) => anchorsLikelySameListing(p, input.business));
    if (fuzzyIndex >= 0) selectedIndex = fuzzyIndex;
  }
  const resolvedBusinessCoordinates =
    input.business.coordinates ??
    (selectedIndex >= 0 ? (places[selectedIndex]?.coordinates ?? null) : null);
  const anchorProfile: BusinessProfile = {
    ...input.business,
    coordinates: resolvedBusinessCoordinates,
  };
  const googleTextSearchPosition = selectedIndex >= 0 ? selectedIndex + 1 : null;

  let candidates: BusinessProfile[] = places.map((p, i) => {
    if (i !== selectedIndex) return p;
    return {
      ...p,
      rating: input.business.rating ?? p.rating,
      reviewCount: input.business.reviewCount ?? p.reviewCount,
      coordinates: resolvedBusinessCoordinates ?? p.coordinates,
    };
  });
  if (selectedIndex < 0) {
    candidates = [
      ...candidates,
      {
        ...input.business,
        coordinates: resolvedBusinessCoordinates,
      },
    ];
  }

  const anchorCoords = anchorProfile.coordinates;
  const meritOrdered = [...candidates].sort((a, b) => compareMeritDescending(a, b, anchorCoords));
  const meritRank = new Map<string, number>();
  meritOrdered.forEach((p, idx) => {
    meritRank.set(stripPlacesResourcePrefix(p.placeId), idx + 1);
  });
  const selectedProfile: BusinessProfile =
    selectedIndex >= 0 ? candidates[selectedIndex]! : { ...input.business, coordinates: resolvedBusinessCoordinates };
  const selectedMeritRank =
    meritRank.get(stripPlacesResourcePrefix(input.business.placeId)) ??
    meritRank.get(stripPlacesResourcePrefix(selectedProfile.placeId)) ??
    null;

  const competitors = meritOrdered
    .filter((p) => !samePlaceId(p.placeId, input.business.placeId))
    .slice(0, 12)
    .map((p) =>
      toCompetitor(
        p,
        anchorProfile,
        meritRank.get(stripPlacesResourcePrefix(p.placeId))!
      )
    );

  const topForReviews = competitors.slice(0, 3);
  if (topForReviews.length > 0) {
    const detailResults = await Promise.allSettled(
      topForReviews.map((c) => getBusinessDetails(c.placeId))
    );
    detailResults.forEach((result, idx) => {
      if (result.status !== "fulfilled") return;
      const detail = result.value.data;
      if (!detail) return;
      const target = competitors.find((c) => samePlaceId(c.placeId, topForReviews[idx]!.placeId));
      if (!target) return;
      if (detail.reviews?.length) target.reviews = detail.reviews.slice(0, 5);
      if (!target.coordinates && detail.coordinates) target.coordinates = detail.coordinates;
    });
  }

  const needCoords = competitors.filter((c) => !c.coordinates);
  if (needCoords.length > 0) {
    const coordResults = await Promise.allSettled(needCoords.map((c) => getBusinessDetails(c.placeId)));
    coordResults.forEach((result, idx) => {
      if (result.status !== "fulfilled") return;
      const detail = result.value.data;
      if (!detail?.coordinates) return;
      const target = competitors.find((c) => samePlaceId(c.placeId, needCoords[idx]!.placeId));
      if (target && !target.coordinates) target.coordinates = detail.coordinates;
    });
  }

  for (const c of competitors) {
    c.distanceMiles = haversineMiles(anchorProfile.coordinates, c.coordinates);
  }

  const topFive = meritOrdered
    .slice(0, 5)
    .map((p, index) => rankItemFromBusiness(p, index + 1, input.business.placeId));
  const selectedBusinessRankItem =
    selectedMeritRank != null
      ? rankItemFromBusiness(selectedProfile, selectedMeritRank, input.business.placeId)
      : rankItemFromBusiness(selectedProfile, meritOrdered.length + 1, input.business.placeId);

  const warnings = [
    ...(searchWarning ? [searchWarning] : []),
    competitors.length < 10
      ? `Only ${competitors.length} direct competitors were returned for this market sample.`
      : null,
  ].filter((x): x is string => Boolean(x));

  return {
    data: {
      competitors,
      rankingSnapshot: {
        query,
        location,
        topFive,
        selectedBusinessPosition: selectedMeritRank,
        selectedBusinessRankItem,
        googleTextSearchPosition,
        totalResultsChecked: candidates.length,
        warnings,
      },
      resolvedBusinessCoordinates,
    },
    warnings,
  };
}
