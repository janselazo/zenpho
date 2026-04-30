import { selectMostRecentReviews } from "./review-selection";
import type { BusinessProfile, BusinessReview } from "./types";

const POSITIVE_TERMS = [
  "fast",
  "professional",
  "friendly",
  "great",
  "excellent",
  "recommend",
  "helpful",
  "clean",
  "on time",
  "quality",
  "responsive",
];

const NEGATIVE_TERMS = [
  "late",
  "expensive",
  "rude",
  "no show",
  "never",
  "poor",
  "bad",
  "slow",
  "hard to reach",
  "didn't",
  "not respond",
  "unprofessional",
];

export type ReviewSentimentSummary = {
  sampleSize: number;
  sentimentScore: number;
  positiveThemes: string[];
  negativeThemes: string[];
  complaints: string[];
  trustSignals: string[];
  warnings: string[];
};

/** Sentiment derived only from the `recent` slice (e.g. last five by publish time). */
export type RecentReviewSentimentSample = {
  /** Count of reviews in the slice (including rows without text). */
  sampleSize: number;
  sentimentScore: number;
  positiveThemes: string[];
  negativeThemes: string[];
};

export type LastReviewsSentimentBlock = {
  recent: BusinessReview[];
  sentiment: RecentReviewSentimentSample;
  recommendations: string[];
};

function themeHits(text: string, terms: string[]): string[] {
  return terms
    .filter((term) => text.includes(term))
    .map((term) => term.charAt(0).toUpperCase() + term.slice(1))
    .slice(0, 5);
}

export function analyzeReviewSentiment(
  business: BusinessProfile
): ReviewSentimentSummary {
  const reviews = business.reviews.filter((r) => r.text?.trim());
  const sample = reviews.map((r) => r.text!.toLowerCase()).join(" ");
  const positive = themeHits(sample, POSITIVE_TERMS);
  const negative = themeHits(sample, NEGATIVE_TERMS);
  const ratingBase = business.rating == null ? 65 : Math.round((business.rating / 5) * 100);
  const sentimentScore = Math.max(
    0,
    Math.min(100, ratingBase + positive.length * 2 - negative.length * 5)
  );
  return {
    sampleSize: reviews.length,
    sentimentScore,
    positiveThemes: positive.length ? positive : ["Helpful service", "Local trust"],
    negativeThemes: negative,
    complaints: negative,
    trustSignals: positive,
    warnings:
      reviews.length < 5
        ? [`Limited review sample: ${reviews.length} review${reviews.length === 1 ? "" : "s"}.`]
        : [],
  };
}

export function analyzeRecentReviewSample(recent: BusinessReview[]): RecentReviewSentimentSample {
  const withText = recent.filter((r) => r.text?.trim());
  const sample = withText.map((r) => r.text!.toLowerCase()).join(" ");
  const positive = themeHits(sample, POSITIVE_TERMS);
  const negative = themeHits(sample, NEGATIVE_TERMS);
  const rated = recent.filter((r) => typeof r.rating === "number" && !Number.isNaN(r.rating));
  const avgRating =
    rated.length === 0 ? null : rated.reduce((sum, r) => sum + r.rating!, 0) / rated.length;
  const ratingBase = avgRating == null ? 65 : Math.round((avgRating / 5) * 100);
  const sentimentScore = Math.max(
    0,
    Math.min(100, ratingBase + positive.length * 2 - negative.length * 5)
  );
  return {
    sampleSize: recent.length,
    sentimentScore,
    positiveThemes: positive,
    negativeThemes: negative,
  };
}

export function buildRecentReviewSentimentRecommendations(
  recent: BusinessReview[],
  sentiment: RecentReviewSentimentSample
): string[] {
  const bullets: string[] = [];
  const withText = recent.filter((r) => r.text?.trim());
  const rated = recent.filter((r) => typeof r.rating === "number" && !Number.isNaN(r.rating));
  const avgRating =
    rated.length === 0 ? null : rated.reduce((sum, r) => sum + r.rating!, 0) / rated.length;
  const joined = withText.map((r) => r.text!.toLowerCase()).join(" ");

  if (recent.length === 0) {
    return [
      "No reviews were returned in Google’s current snapshot — keep requesting fresh Google reviews so sentiment checks stay meaningful.",
    ];
  }

  if (recent.length < 5) {
    bullets.push(
      `Google often returns a small review slice; this section uses the ${recent.length} most recent row${recent.length === 1 ? "" : "s"} from that sample, not your full history.`,
    );
  }

  if (withText.length === 0) {
    bullets.push(
      "These recent rows have little or no written text — follow up with happy customers and ask for short, specific Google reviews (what went well, who helped).",
    );
  }

  if (avgRating != null && avgRating <= 2.5) {
    bullets.push(
      "Average stars in this recent slice are very low — tighten quality and communication, document a recovery script, and resolve open issues before pushing for new reviews.",
    );
  }

  if (sentiment.negativeThemes.length >= 2) {
    const top = sentiment.negativeThemes.slice(0, 3).join(", ");
    bullets.push(
      `Multiple recent reviews touch on: ${top}. Tackle one theme per week operationally, then confirm improvement with the next reviewers.`,
    );
  } else if (sentiment.negativeThemes.length === 1) {
    bullets.push(
      `Watch for “${sentiment.negativeThemes[0]}” — if it appears again, add a checklist step (estimate, arrival window, callbacks) so the team handles it consistently.`,
    );
  }

  if (joined.includes("price") || joined.includes("expensive") || joined.includes("quote")) {
    bullets.push(
      "Price or quoting concerns showed up — clarify scope, what’s included, and typical ranges so expectations match the invoice.",
    );
  }

  if (
    joined.includes("never") ||
    joined.includes("call") ||
    joined.includes("no show") ||
    joined.includes("respond") ||
    joined.includes("not respond")
  ) {
    bullets.push(
      "Responsiveness is a theme — set a simple SLA (same-day call-back or text), track missed leads, and mention it on your profile and website.",
    );
  }

  if (sentiment.sentimentScore >= 72 && sentiment.negativeThemes.length <= 1) {
    bullets.push(
      "Recent tone skews positive — feature these stories on the homepage, reply to every review within 48 hours, and ask happy customers for one more line about the outcome.",
    );
  }

  if (bullets.length === 0) {
    bullets.push(
      "Re-scan sentiment after busy weeks — brief replies to new reviews and a quick scan for recurring words catch drift early.",
    );
  }

  return [...new Set(bullets)].slice(0, 5);
}

export function buildLastReviewsSentimentBlock(
  reviews: BusinessReview[],
  n = 5
): LastReviewsSentimentBlock {
  const recent = selectMostRecentReviews(reviews, n);
  const sentiment = analyzeRecentReviewSample(recent);
  const recommendations = buildRecentReviewSentimentRecommendations(recent, sentiment);
  return { recent, sentiment, recommendations };
}
