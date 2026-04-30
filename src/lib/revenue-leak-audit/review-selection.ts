import type { BusinessReview } from "./types";

/**
 * Google Places (New) place details return a **small, relevance-sorted** review sample (often ~5).
 * We cannot request “all 1★ reviews” from that endpoint — if Google omits low stars from the sample,
 * the UI cannot show them until we add another data source (e.g. owner Google Business Profile API,
 * or a compliant reviews aggregator). `selectLowestRatedReviews` only **re-orders** what we already have.
 */

/** Keywords for tagging complaint themes in review text (used for highlights, not for picking lowest-star rows). */
export const REVIEW_COMPLAINT_TERMS = [
  "slow",
  "late",
  "rude",
  "expensive",
  "price",
  "quote",
  "call",
  "phone",
  "follow up",
  "no show",
  "appointment",
  "wait",
  "never",
  "poor",
  "bad",
  "terrible",
  "worst",
  "disappointed",
  "unprofessional",
  "waste",
  "horrible",
  "scam",
  "refused",
  "ignored",
] as const;

export function complaintScoreFromText(text: string | null | undefined): number {
  if (!text?.trim()) return 0;
  const t = text.toLowerCase();
  return REVIEW_COMPLAINT_TERMS.reduce((n, w) => n + (t.includes(w) ? 1 : 0), 0);
}

export function extractComplaintThemes(combinedReviewText: string, max = 6): string[] {
  const t = combinedReviewText.toLowerCase();
  return REVIEW_COMPLAINT_TERMS.filter((term) => t.includes(term)).slice(0, max);
}

export function parsePlaceReviewRating(value: unknown): number | null {
  if (typeof value === "number" && !Number.isNaN(value)) {
    return Math.min(5, Math.max(1, value));
  }
  if (typeof value === "string") {
    const n = Number.parseFloat(value);
    if (!Number.isNaN(n)) return Math.min(5, Math.max(1, n));
  }
  return null;
}

/** Maps Places API-style enum strings (if present) to a 1–5 star count. */
export function parseStarRatingEnum(raw: unknown): number | null {
  if (typeof raw !== "string") return null;
  const key = raw.trim().toUpperCase().replace(/^STAR_RATING_/, "");
  const map: Record<string, number> = {
    UNSPECIFIED: NaN,
    ONE: 1,
    TWO: 2,
    THREE: 3,
    FOUR: 4,
    FIVE: 5,
  };
  const n = map[key];
  return typeof n === "number" && !Number.isNaN(n) ? n : null;
}

function reviewPublishTimeMs(r: BusinessReview): number | null {
  if (!r.publishTime?.trim()) return null;
  const t = Date.parse(r.publishTime);
  return Number.isNaN(t) ? null : t;
}

/**
 * Star tier for ordering: 1★ rows first, then 2★, etc. Uses rounding so 1.0–1.4 sorts before 2.0.
 */
function starTier(rating: number): number {
  return Math.min(5, Math.max(1, Math.round(rating)));
}

/**
 * Lowest-rated reviews for the audit: all available 1★ first, then 2★, and so on (within the Google sample).
 * Ties use numeric rating, then oldest `publishTime` first so age does not hide lower-star rows.
 * Does not use “complaint keyword” weighting (it falsely ranked glowing 5★ reviews that mentioned e.g. “call” or “wait”).
 */
export function selectLowestRatedReviews(reviews: BusinessReview[], limit = 4): BusinessReview[] {
  const eligible = reviews.filter((r) => Boolean(r.text?.trim()) || r.rating !== null);

  const rated = eligible.filter((r) => typeof r.rating === "number" && !Number.isNaN(r.rating));
  const unrated = eligible.filter((r) => !(typeof r.rating === "number" && !Number.isNaN(r.rating)));

  rated.sort((a, b) => {
    const tierA = starTier(a.rating!);
    const tierB = starTier(b.rating!);
    if (tierA !== tierB) return tierA - tierB;
    const diff = a.rating! - b.rating!;
    if (diff !== 0) return diff;
    const ta = reviewPublishTimeMs(a);
    const tb = reviewPublishTimeMs(b);
    if (ta != null && tb != null) return ta - tb;
    if (ta != null) return -1;
    if (tb != null) return 1;
    return 0;
  });
  unrated.sort((a, b) => {
    const ta = reviewPublishTimeMs(a);
    const tb = reviewPublishTimeMs(b);
    if (ta != null && tb != null) return ta - tb;
    if (ta != null) return -1;
    if (tb != null) return 1;
    return 0;
  });

  return [...rated, ...unrated].slice(0, limit);
}

/**
 * Most recent reviews first (newest `publishTime`), then rows without a parseable date
 * (stable order). Uses the same Google Places sample as the rest of the audit.
 */
export function selectMostRecentReviews(reviews: BusinessReview[], limit = 5): BusinessReview[] {
  const withTime = reviews.filter((r) => reviewPublishTimeMs(r) != null);
  const withoutTime = reviews.filter((r) => reviewPublishTimeMs(r) == null);
  withTime.sort((a, b) => reviewPublishTimeMs(b)! - reviewPublishTimeMs(a)!);
  return [...withTime, ...withoutTime].slice(0, limit);
}

export function formatReviewStarLabel(rating: number | null): string {
  if (rating === null || Number.isNaN(rating)) return "N/A";
  if (rating === 1) return "1 star";
  return `${rating} stars`;
}
