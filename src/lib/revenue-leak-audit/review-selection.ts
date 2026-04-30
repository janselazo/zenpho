import type { BusinessReview } from "./types";

/** Keywords used to surface complaint-heavy reviews when star ratings tie (e.g. API returns only five-star samples). */
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

/** Prefer the lowest numeric ratings; when Google only returns high-star samples, break ties with complaint-like language. */
export function selectLowestRatedReviews(reviews: BusinessReview[], limit = 5): BusinessReview[] {
  const eligible = reviews.filter((r) => Boolean(r.text?.trim()) || r.rating !== null);

  const rated = eligible.filter((r) => typeof r.rating === "number" && !Number.isNaN(r.rating));
  const unrated = eligible.filter((r) => !(typeof r.rating === "number" && !Number.isNaN(r.rating)));

  rated.sort((a, b) => {
    const diff = a.rating! - b.rating!;
    if (diff !== 0) return diff;
    return complaintScoreFromText(b.text) - complaintScoreFromText(a.text);
  });
  unrated.sort((a, b) => complaintScoreFromText(b.text) - complaintScoreFromText(a.text));

  return [...rated, ...unrated].slice(0, limit);
}

export function formatReviewStarLabel(rating: number | null): string {
  if (rating === null || Number.isNaN(rating)) return "N/A";
  if (rating === 1) return "1 star";
  return `${rating} stars`;
}
