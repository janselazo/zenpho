import type { BusinessProfile } from "./types";

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
