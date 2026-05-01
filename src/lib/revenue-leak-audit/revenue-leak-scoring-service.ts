import type { PhotoAnalysisSummary } from "./photo-analysis-service";
import type { ReviewSentimentSummary } from "./review-sentiment-service";
import type {
  ActionPlanItem,
  AuditAssumptions,
  AuditCategory,
  AuditFinding,
  AuditGrade,
  AuditScores,
  BusinessProfile,
  Competitor,
  CompetitorMapPoint,
  CompetitorStrengthsInsight,
  FoundIssuesMoneySummary,
  GoogleLocalRankingSnapshot,
  RevenueEstimate,
  SectionProblemSummary,
  WebsiteAudit,
} from "./types";

type BuildInput = {
  business: BusinessProfile;
  assumptions: AuditAssumptions;
  competitors: Competitor[];
  rankingSnapshot: GoogleLocalRankingSnapshot;
  websiteAudit: WebsiteAudit;
  reviewSentiment: ReviewSentimentSummary;
  photoAnalysis: PhotoAnalysisSummary;
  competitorStrengths: CompetitorStrengthsInsight;
};

const CATEGORIES: AuditCategory[] = [
  "My Business vs Google Competitors",
  "Google Business Profile",
  "Reviews & Reputation",
  "Website Conversion",
  "Website Trust & Visual Proof",
  "Tracking & Ads Readiness",
  "Photo Quality & Quantity",
  "Local SEO & Market Positioning",
];

export function gradeFromScore(score: number): AuditGrade {
  if (score < 50) return "Poor";
  if (score < 70) return "Average";
  if (score < 85) return "Good";
  return "Excellent";
}

function clampScore(score: number): number {
  /** Avoid a literal 0 — stacked heuristics can overshoot; floor keeps Poor vs "no data" distinct. */
  const floor = 10;
  return Math.max(floor, Math.min(100, Math.round(score)));
}

/** Sums penalties but caps how much they can drag the score down (many gaps shouldn't collapse to the minimum). */
function scoreAfterPenalties(base: number, penalties: number[], maxTotalPenalty: number): number {
  const total = penalties.reduce((a, b) => a + b, 0);
  return base - Math.min(maxTotalPenalty, total);
}

/** Any common analytics / paid-media tag we look for in homepage HTML. */
function hasPaidOrAnalyticsBaseline(audit: WebsiteAudit): boolean {
  if (!audit.available) return false;
  return (
    audit.hasGoogleAnalytics ||
    audit.hasGoogleTagManager ||
    audit.hasGoogleAdsTag ||
    audit.hasMetaPixel ||
    audit.hasTikTokPixel ||
    audit.hasBingUet ||
    audit.hasLinkedInInsight ||
    audit.hasPinterestPixel ||
    audit.hasTwitterPixel ||
    audit.hasSnapchatPixel
  );
}

function formatDetectedMarketingTags(audit: WebsiteAudit): string {
  const tags: string[] = [];
  if (audit.hasGoogleTagManager) tags.push("Google Tag Manager");
  if (audit.hasGoogleAnalytics) tags.push("Google Analytics (GA4 / gtag)");
  if (audit.hasGoogleAdsTag) tags.push("Google Ads conversion");
  if (audit.hasMetaPixel) tags.push("Meta (Facebook / Instagram) Pixel");
  if (audit.hasTikTokPixel) tags.push("TikTok Pixel");
  if (audit.hasBingUet) tags.push("Microsoft Advertising UET (Bing)");
  if (audit.hasLinkedInInsight) tags.push("LinkedIn Insight Tag");
  if (audit.hasPinterestPixel) tags.push("Pinterest Tag");
  if (audit.hasTwitterPixel) tags.push("X (Twitter) Ads Pixel");
  if (audit.hasSnapchatPixel) tags.push("Snapchat Pixel");
  return tags.length ? tags.join("; ") : "none";
}

function avg(nums: number[]): number {
  return nums.length === 0
    ? 0
    : nums.reduce((sum, n) => sum + n, 0) / nums.length;
}

type LeakImpact = {
  /** Standalone monthly revenue at risk for this finding. */
  low: number;
  high: number;
  /** Per-finding leak rate as a fraction of monthly leads (0..1). */
  leakRateLow: number;
  leakRateHigh: number;
};

function addressableMonthlyRevenue(assumptions: AuditAssumptions): number {
  return Math.max(
    0,
    assumptions.estimatedMonthlyLeads *
      assumptions.closeRate *
      assumptions.averageJobValue
  );
}

function clampRate(rate: number): number {
  if (!Number.isFinite(rate) || rate < 0) return 0;
  if (rate > 0.95) return 0.95;
  return rate;
}

function moneyImpact(
  assumptions: AuditAssumptions,
  lowLift: number,
  highLift: number
): LeakImpact {
  const cap = addressableMonthlyRevenue(assumptions);
  const leakRateLow = clampRate(lowLift);
  const leakRateHigh = clampRate(Math.max(highLift, lowLift));
  return {
    low: Math.round(cap * leakRateLow),
    high: Math.round(cap * leakRateHigh),
    leakRateLow,
    leakRateHigh,
  };
}

/** Recompute per-finding dollar impacts when estimate assumptions change (leak rates unchanged). */
export function applyAssumptionsToFindings(
  assumptions: AuditAssumptions,
  findings: AuditFinding[]
): AuditFinding[] {
  const cap = addressableMonthlyRevenue(assumptions);
  return findings.map((f) => ({
    ...f,
    estimatedRevenueImpactLow: Math.round(cap * clampRate(f.leakRateLow)),
    estimatedRevenueImpactHigh: Math.round(
      cap * clampRate(Math.max(f.leakRateHigh, f.leakRateLow))
    ),
  }));
}

/** Rebuild money summary totals using edited assumptions while keeping the same detected leaks. */
export function buildMoneySummaryFromAssumptions(
  assumptions: AuditAssumptions,
  findings: AuditFinding[]
): FoundIssuesMoneySummary {
  return buildMoneySummary(assumptions, applyAssumptionsToFindings(assumptions, findings));
}

function finding(
  input: Omit<AuditFinding, "id">,
  index: number
): AuditFinding {
  return {
    id: `${input.category.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${index}`,
    ...input,
  };
}

/**
 * Max share of addressable revenue treated as “at risk” from all checklist gaps combined.
 * Realistically, losing nearly all pipeline to fixable issues is rare; ~50% is a strong
 * upper bound for this style of audit.
 */
const MAX_COMBINED_LEAK_RATE = 0.52;

/**
 * Combine leak rates with funnel math: combinedLeak = 1 - product(1 - r_i).
 * Long issue lists are damped: many items overlap the same funnel friction (SEO + GBP +
 * reviews), so each additional finding past the first few should not move the total as much
 * as full independence implies.
 */
function combineLeakRates(rates: readonly number[]): number {
  if (rates.length === 0) return 0;
  const survival = rates.reduce(
    (acc, rate) => acc * (1 - clampRate(rate)),
    1
  );
  let combined = 1 - survival;
  const n = rates.length;
  if (n > 4) {
    combined *= 1 / (1 + 0.085 * (n - 4));
  }
  return Math.min(MAX_COMBINED_LEAK_RATE, combined);
}

function competitorAverages(competitors: Competitor[]) {
  return {
    rating: avg(competitors.map((c) => c.rating ?? 0).filter(Boolean)),
    reviews: Math.round(avg(competitors.map((c) => c.reviewCount ?? 0))),
    photos: Math.round(avg(competitors.map((c) => c.photoCount ?? 0))),
  };
}

/** Maps-style ranking: lowest `rank` first (ties keep input order). Uses top 5 for a local pack benchmark. */
function topFiveCompetitorBenchmark(competitors: Competitor[]): {
  avgRating: number | null;
  avgReviews: number | null;
  ratedCount: number;
  reviewFieldCount: number;
} {
  const sorted = [...competitors].sort((a, b) => {
    const ra = a.rank == null ? 999 : a.rank;
    const rb = b.rank == null ? 999 : b.rank;
    return ra - rb;
  });
  const top5 = sorted.slice(0, 5);
  const rated = top5.filter(
    (c) => c.rating != null && Number.isFinite(c.rating)
  );
  const withReviews = top5.filter(
    (c) => c.reviewCount != null && Number.isFinite(c.reviewCount)
  );
  const avgRating =
    rated.length >= 2 ? avg(rated.map((c) => c.rating!)) : null;
  const avgReviewsRaw =
    withReviews.length >= 2
      ? avg(withReviews.map((c) => c.reviewCount!))
      : null;
  return {
    avgRating,
    avgReviews: avgReviewsRaw != null ? Math.round(avgReviewsRaw) : null,
    ratedCount: rated.length,
    reviewFieldCount: withReviews.length,
  };
}

function daysSince(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const time = Date.parse(iso);
  if (!Number.isFinite(time)) return null;
  return Math.max(0, Math.floor((Date.now() - time) / (24 * 60 * 60 * 1000)));
}

function newestReviewDays(business: BusinessProfile): number | null {
  const days = business.reviews
    .map((r) => daysSince(r.publishTime))
    .filter((d): d is number => typeof d === "number");
  if (days.length === 0) return null;
  return Math.min(...days);
}

function titleMentionsLocale(title: string | null, business: BusinessProfile): boolean {
  if (!title) return false;
  const lower = title.toLowerCase();
  const tokens: string[] = [];
  if (business.address) {
    business.address
      .split(/[,\s]+/)
      .map((part) => part.trim().toLowerCase())
      .filter((part) => part.length >= 4)
      .forEach((part) => tokens.push(part));
  }
  if (tokens.length === 0) return false;
  return tokens.some((token) => lower.includes(token));
}

function buildFindings(input: BuildInput): AuditFinding[] {
  const {
    business,
    assumptions,
    competitors,
    rankingSnapshot,
    websiteAudit,
    reviewSentiment,
    photoAnalysis,
    competitorStrengths,
  } = input;
  const comp = competitorAverages(competitors);
  const top5Bench = topFiveCompetitorBenchmark(competitors);
  const findings: AuditFinding[] = [];
  let i = 1;

  if (comp.reviews > (business.reviewCount ?? 0) * 2 && comp.reviews > 25) {
    const impact = moneyImpact(assumptions, 0.05, 0.15);
    findings.push(
      finding(
        {
          category: "My Business vs Google Competitors",
          severity: "High",
          title: "Competitors Have Significantly More Google Reviews",
          whatWeFound: `${business.name} has ${business.reviewCount ?? 0} reviews. Top competitors average ${comp.reviews} reviews.`,
          whyItMatters:
            "More Google reviews usually increase trust and conversion from Google Maps traffic.",
          evidence: `Competitor review average: ${comp.reviews}. Business review count: ${business.reviewCount ?? 0}.`,
          estimatedRevenueImpactLow: impact.low,
          estimatedRevenueImpactHigh: impact.high,
          leakRateLow: impact.leakRateLow,
          leakRateHigh: impact.leakRateHigh,
          recommendedFix:
            "Install an automated review request workflow after completed jobs and ask every happy customer for a Google review.",
          priorityScore: 92,
        },
        i++
      )
    );
  }

  if (
    rankingSnapshot.selectedBusinessPosition &&
    rankingSnapshot.selectedBusinessPosition > 5
  ) {
    const impact = moneyImpact(assumptions, 0.08, 0.22);
    const googlePos =
      rankingSnapshot.googleTextSearchPosition != null
        ? ` Google's text search ordered this listing around #${rankingSnapshot.googleTextSearchPosition} in the pages we fetched.`
        : "";
    findings.push(
      finding(
        {
          category: "My Business vs Google Competitors",
          severity:
            rankingSnapshot.selectedBusinessPosition > 15 ? "Critical" : "High",
          title: "Your Business Is Not Showing in the Top Google Positions",
          whatWeFound: `${business.name} ranks #${rankingSnapshot.selectedBusinessPosition} within the audited competitor sample for "${rankingSnapshot.query}" when scored by rating, review volume, and distance.${googlePos}`,
          whyItMatters:
            "Local buyers often choose from the first few Google Map results, so lower visibility can reduce calls and quote requests.",
          evidence: `Merit rank in sample: #${rankingSnapshot.selectedBusinessPosition}. Top table shows the strongest listings in this batch by those signals.`,
          estimatedRevenueImpactLow: impact.low,
          estimatedRevenueImpactHigh: impact.high,
          leakRateLow: impact.leakRateLow,
          leakRateHigh: impact.leakRateHigh,
          recommendedFix:
            "Improve local SEO signals: category relevance, review velocity, photos, service pages, location content, and Google profile completeness.",
          priorityScore: 95,
        },
        i++
      )
    );
  }

  if (comp.rating > 0 && (business.rating ?? 0) > 0 && comp.rating - (business.rating ?? 0) >= 0.2) {
    const impact = moneyImpact(assumptions, 0.03, 0.1);
    findings.push(
      finding(
        {
          category: "My Business vs Google Competitors",
          severity: comp.rating - (business.rating ?? 0) >= 0.5 ? "High" : "Medium",
          title: "Star Rating Is Lower Than Top Competitors",
          whatWeFound: `${business.name} averages ${(business.rating ?? 0).toFixed(1)} stars while top competitors average ${comp.rating.toFixed(1)}.`,
          whyItMatters:
            "Buyers often shortlist the highest rating from the local pack. Even a 0.2 star gap can move clicks and calls to competitors.",
          evidence: `Selected rating: ${(business.rating ?? 0).toFixed(1)}. Competitor average: ${comp.rating.toFixed(1)}.`,
          estimatedRevenueImpactLow: impact.low,
          estimatedRevenueImpactHigh: impact.high,
          leakRateLow: impact.leakRateLow,
          leakRateHigh: impact.leakRateHigh,
          recommendedFix:
            "Run a structured review-recovery sequence: fix top complaints, follow up after every job, and ask satisfied customers for fresh reviews.",
          priorityScore: 80,
        },
        i++
      )
    );
  }

  if (competitorStrengths.topGap) {
    const gap = competitorStrengths.topGap;
    const impact = moneyImpact(assumptions, 0.03, 0.09);
    const competitorList = gap.praisedCompetitors.slice(0, 3).join(", ");
    const ownNote =
      gap.ownMentions === 0
        ? "this praise theme is essentially missing from your own public reviews"
        : `your reviews mention it ~${gap.ownMentions}× vs ~${gap.competitorMentions}× for top competitors`;
    findings.push(
      finding(
        {
          category: "My Business vs Google Competitors",
          severity: "Medium",
          title: `Competitors Win on ${gap.label}`,
          whatWeFound: `Top competitors (${competitorList}) are repeatedly praised by Google reviewers for ${gap.label.toLowerCase()} — ${ownNote}.`,
          whyItMatters:
            "Public review themes are the first thing buyers read before choosing. When competitors visibly own a strength, they shortlist faster and you don't get a call.",
          evidence: gap.exampleQuote
            ? `Example competitor review: "${gap.exampleQuote}"`
            : `Detected ${gap.competitorMentions} competitor mention${gap.competitorMentions === 1 ? "" : "s"} of this theme across the top ${competitorStrengths.themes.length > 0 ? Math.min(3, competitors.length) : 0} competitors.`,
          estimatedRevenueImpactLow: impact.low,
          estimatedRevenueImpactHigh: impact.high,
          leakRateLow: impact.leakRateLow,
          leakRateHigh: impact.leakRateHigh,
          recommendedFix: competitorStrengths.recommendation,
          priorityScore: 81,
        },
        i++
      )
    );
  }

  if (
    comp.photos > 0 &&
    (business.photoCount ?? 0) > 0 &&
    comp.photos > (business.photoCount ?? 0) * 1.8
  ) {
    const impact = moneyImpact(assumptions, 0.02, 0.07);
    findings.push(
      finding(
        {
          category: "My Business vs Google Competitors",
          severity: "Medium",
          title: "Competitors Have a Stronger Photo Footprint on Google",
          whatWeFound: `${business.name} has ~${business.photoCount ?? 0} Google photos. Top competitors average ~${comp.photos}.`,
          whyItMatters:
            "Photo-rich listings tend to earn more profile views and direction requests in the local pack.",
          evidence: `Selected photo count: ${business.photoCount ?? 0}. Competitor average: ${comp.photos}.`,
          estimatedRevenueImpactLow: impact.low,
          estimatedRevenueImpactHigh: impact.high,
          leakRateLow: impact.leakRateLow,
          leakRateHigh: impact.leakRateHigh,
          recommendedFix:
            "Upload fresh team, truck, project, and before/after photos to Google Business Profile every month.",
          priorityScore: 64,
        },
        i++
      )
    );
  }

  if (!business.website) {
    const impact = moneyImpact(assumptions, 0.12, 0.3);
    findings.push(
      finding(
        {
          category: "Google Business Profile",
          severity: "Critical",
          title: "Google Profile Is Missing a Website Link",
          whatWeFound: "The Google Business Profile does not have a website attached.",
          whyItMatters:
            "A missing website link gives high-intent Google visitors fewer ways to trust the business and request service.",
          evidence: "websiteUri was not present in Google Places data.",
          estimatedRevenueImpactLow: impact.low,
          estimatedRevenueImpactHigh: impact.high,
          leakRateLow: impact.leakRateLow,
          leakRateHigh: impact.leakRateHigh,
          recommendedFix:
            "Add a conversion-focused website or landing page to the Google profile immediately.",
          priorityScore: 96,
        },
        i++
      )
    );
  }

  if (!business.phone) {
    const impact = moneyImpact(assumptions, 0.04, 0.12);
    findings.push(
      finding(
        {
          category: "Google Business Profile",
          severity: "High",
          title: "Google Profile Is Missing a Phone Number",
          whatWeFound: "No phone number was available from the selected Google profile.",
          whyItMatters:
            "Local service leads often convert by calling directly from Google Maps.",
          evidence: "nationalPhoneNumber/internationalPhoneNumber missing.",
          estimatedRevenueImpactLow: impact.low,
          estimatedRevenueImpactHigh: impact.high,
          leakRateLow: impact.leakRateLow,
          leakRateHigh: impact.leakRateHigh,
          recommendedFix: "Add and verify the correct primary call number in Google Business Profile.",
          priorityScore: 90,
        },
        i++
      )
    );
  }

  if (business.hours.length === 0) {
    const impact = moneyImpact(assumptions, 0.02, 0.07);
    findings.push(
      finding(
        {
          category: "Google Business Profile",
          severity: "Medium",
          title: "Google Profile Is Missing Business Hours",
          whatWeFound: "No business hours were available on the selected Google profile.",
          whyItMatters:
            "Buyers compare “open now” providers in the local pack. Missing hours can drop ranking and lose evening/weekend leads.",
          evidence: "regularOpeningHours not populated in Google Places data.",
          estimatedRevenueImpactLow: impact.low,
          estimatedRevenueImpactHigh: impact.high,
          leakRateLow: impact.leakRateLow,
          leakRateHigh: impact.leakRateHigh,
          recommendedFix:
            "Add accurate weekday + weekend hours, plus holiday/special hours when relevant.",
          priorityScore: 76,
        },
        i++
      )
    );
  }

  if (!business.category) {
    const impact = moneyImpact(assumptions, 0.03, 0.09);
    findings.push(
      finding(
        {
          category: "Google Business Profile",
          severity: "Medium",
          title: "Primary Google Category Is Missing or Generic",
          whatWeFound: "The selected business does not have a clear primary Google category.",
          whyItMatters:
            "Google relies on the primary category to decide which searches you appear in. A weak category means lost relevance and ranking.",
          evidence: "primaryType / category not present in Google Places data.",
          estimatedRevenueImpactLow: impact.low,
          estimatedRevenueImpactHigh: impact.high,
          leakRateLow: impact.leakRateLow,
          leakRateHigh: impact.leakRateHigh,
          recommendedFix:
            "Set the most specific primary category that matches the highest-value service, and add 2–4 supporting categories.",
          priorityScore: 78,
        },
        i++
      )
    );
  }

  if ((business.photoCount ?? 0) < 10) {
    const impact = moneyImpact(assumptions, 0.02, 0.06);
    findings.push(
      finding(
        {
          category: "Google Business Profile",
          severity: "Medium",
          title: "Google Profile Has Very Few Photos",
          whatWeFound: `Only ${business.photoCount ?? 0} photo${(business.photoCount ?? 0) === 1 ? "" : "s"} are visible on the Google profile.`,
          whyItMatters:
            "Profiles with at least 10–20 quality photos tend to earn materially more profile views, calls, and direction requests.",
          evidence: `photoCount: ${business.photoCount ?? 0}.`,
          estimatedRevenueImpactLow: impact.low,
          estimatedRevenueImpactHigh: impact.high,
          leakRateLow: impact.leakRateLow,
          leakRateHigh: impact.leakRateHigh,
          recommendedFix:
            "Upload 10+ recent photos: storefront/truck, team, finished work, before/after, and customer-facing details.",
          priorityScore: 62,
        },
        i++
      )
    );
  }

  if ((business.reviewCount ?? 0) < 25) {
    const impact = moneyImpact(assumptions, 0.03, 0.1);
    findings.push(
      finding(
        {
          category: "Google Business Profile",
          severity: (business.reviewCount ?? 0) < 10 ? "High" : "Medium",
          title: "Review Count Is Below the Local Trust Threshold",
          whatWeFound: `${business.name} has ${business.reviewCount ?? 0} Google review${(business.reviewCount ?? 0) === 1 ? "" : "s"}.`,
          whyItMatters:
            "Most buyers expect 25–50+ reviews to consider a local provider. Below that threshold, calls and form fills drop sharply.",
          evidence: `userRatingCount: ${business.reviewCount ?? 0}.`,
          estimatedRevenueImpactLow: impact.low,
          estimatedRevenueImpactHigh: impact.high,
          leakRateLow: impact.leakRateLow,
          leakRateHigh: impact.leakRateHigh,
          recommendedFix:
            "Install an automated review request flow that fires after every completed job (SMS + email).",
          priorityScore: 82,
        },
        i++
      )
    );
  }

  if (business.businessStatus && /CLOSED|SUSPEND/i.test(business.businessStatus)) {
    const impact = moneyImpact(assumptions, 0.3, 0.7);
    findings.push(
      finding(
        {
          category: "Google Business Profile",
          severity: "Critical",
          title: "Google Lists This Business as Not Fully Operational",
          whatWeFound: `Google reports a non-operational status: ${business.businessStatus}.`,
          whyItMatters:
            "A closed or suspended status removes the business from most local searches and stops the lead flow entirely.",
          evidence: `businessStatus: ${business.businessStatus}.`,
          estimatedRevenueImpactLow: impact.low,
          estimatedRevenueImpactHigh: impact.high,
          leakRateLow: impact.leakRateLow,
          leakRateHigh: impact.leakRateHigh,
          recommendedFix:
            "Reclaim/verify the listing, correct status, and re-publish key info (hours, photos, services).",
          priorityScore: 97,
        },
        i++
      )
    );
  }

  {
    const hasThemes = reviewSentiment.negativeThemes.length > 0;
    const ur = business.rating;
    const reliableTop5 =
      top5Bench.avgRating != null && top5Bench.ratedCount >= 2;
    const STAR_GAP = 0.12;
    const belowTop5Avg =
      reliableTop5 &&
      ur != null &&
      ur + STAR_GAP < top5Bench.avgRating!;
    const belowFallbackStars = !reliableTop5 && (ur ?? 5) < 4.5;
    const belowStars = belowTop5Avg || belowFallbackStars;
    if (belowStars || hasThemes) {
      const impact = moneyImpact(assumptions, 0.04, 0.12);
      const packSize = Math.min(5, Math.max(0, competitors.length));
      const benchLine = reliableTop5 && packSize > 0
        ? `Top ${packSize} Google Maps result${packSize === 1 ? "" : "s"} in this search average ${top5Bench.avgRating!.toFixed(1)} stars${
            top5Bench.avgReviews != null
              ? ` and ~${top5Bench.avgReviews} reviews each`
              : ""
          }. Your rating: ${ur?.toFixed(1) ?? "not available"}.`
        : `Strong local pack benchmark unavailable (${top5Bench.ratedCount} rated competitor${top5Bench.ratedCount === 1 ? "" : "s"} in top 5); comparing to a 4.5+ star convention. Your rating: ${ur?.toFixed(1) ?? "not available"}.`;
      const themesLine = `Negative themes: ${
        reviewSentiment.negativeThemes.join(", ") || "none in sample"
      }.`;
      const criticalStarGap =
        reliableTop5 &&
        ur != null &&
        top5Bench.avgRating! - ur >= 0.35;
      const severity =
        (ur != null && ur < 4.0) || criticalStarGap ? "Critical" : "High";
      findings.push(
        finding(
          {
            category: "Reviews & Reputation",
            severity,
            title: "Review Trust Is Below a Strong Local Standard",
            whatWeFound: `${benchLine} ${themesLine}`,
            whyItMatters:
              "Compared with the businesses Google surfaces beside you, a weaker rating or repeated complaints can reduce calls from buyers shortlisting providers.",
            evidence: `${reliableTop5 ? `Local top-5 avg rating ${top5Bench.avgRating!.toFixed(1)} (n=${top5Bench.ratedCount}). ` : ""}Sentiment score: ${reviewSentiment.sentimentScore}/100 from ${reviewSentiment.sampleSize} review samples.`,
            estimatedRevenueImpactLow: impact.low,
            estimatedRevenueImpactHigh: impact.high,
            leakRateLow: impact.leakRateLow,
            leakRateHigh: impact.leakRateHigh,
            recommendedFix:
              "Request fresh positive reviews, respond to unhappy customers, and fix recurring complaint patterns.",
            priorityScore: 86,
          },
          i++
        )
      );
    }
  }

  if (reviewSentiment.negativeThemes.length >= 2) {
    const impact = moneyImpact(assumptions, 0.02, 0.08);
    findings.push(
      finding(
        {
          category: "Reviews & Reputation",
          severity: "Medium",
          title: "Recurring Complaint Themes in Recent Reviews",
          whatWeFound: `Reviewers repeatedly mention: ${reviewSentiment.negativeThemes.join(", ")}.`,
          whyItMatters:
            "Repeated complaint patterns become a public objection in the buyer's research and depress the conversion rate from calls to booked jobs.",
          evidence: `Negative themes detected from a ${reviewSentiment.sampleSize}-review sample.`,
          estimatedRevenueImpactLow: impact.low,
          estimatedRevenueImpactHigh: impact.high,
          leakRateLow: impact.leakRateLow,
          leakRateHigh: impact.leakRateHigh,
          recommendedFix:
            "Pick the top two complaint themes and create a written process change. Reply to each negative review with the fix.",
          priorityScore: 75,
        },
        i++
      )
    );
  }

  {
    const newest = newestReviewDays(business);
    if (newest !== null && newest > 90 && (business.reviewCount ?? 0) > 0) {
      const impact = moneyImpact(assumptions, 0.02, 0.07);
      findings.push(
        finding(
          {
            category: "Reviews & Reputation",
            severity: newest > 180 ? "High" : "Medium",
            title: "Review Velocity Has Stalled",
            whatWeFound: `The most recent visible review is about ${newest} days old.`,
            whyItMatters:
              "Google rewards recency. Long gaps between reviews signal a stale business and reduce local pack rankings.",
            evidence: `Most recent review publishTime ≈ ${newest} days ago across ${business.reviews.length} sampled reviews.`,
            estimatedRevenueImpactLow: impact.low,
            estimatedRevenueImpactHigh: impact.high,
          leakRateLow: impact.leakRateLow,
          leakRateHigh: impact.leakRateHigh,
            recommendedFix:
              "Trigger a review request after every completed job and aim for 4–8 fresh reviews per month.",
            priorityScore: 73,
          },
          i++
        )
      );
    }
  }

  if (reviewSentiment.sentimentScore < 60) {
    const impact = moneyImpact(assumptions, 0.03, 0.09);
    findings.push(
      finding(
        {
          category: "Reviews & Reputation",
          severity: reviewSentiment.sentimentScore < 45 ? "High" : "Medium",
          title: "Public Sentiment Score Is Below the Local Trust Bar",
          whatWeFound: `Sentiment score: ${reviewSentiment.sentimentScore}/100 from ${reviewSentiment.sampleSize} sampled reviews.`,
          whyItMatters:
            "Even when the star rating looks fine, weak sentiment in the review text turns shoppers toward higher-trust competitors.",
          evidence: `Positive themes: ${reviewSentiment.positiveThemes.join(", ") || "limited"}. Negative themes: ${
            reviewSentiment.negativeThemes.join(", ") || "none"
          }.`,
          estimatedRevenueImpactLow: impact.low,
          estimatedRevenueImpactHigh: impact.high,
          leakRateLow: impact.leakRateLow,
          leakRateHigh: impact.leakRateHigh,
          recommendedFix:
            "Coach the team to ask for reviews that name the result (“finished on time”, “fair price”, “clean job site”) so positive themes show up in the public review text.",
          priorityScore: 68,
        },
        i++
      )
    );
  }

  if (!websiteAudit.hasPrimaryCta || !websiteAudit.hasQuoteCta) {
    const impact = moneyImpact(assumptions, 0.06, 0.18);
    findings.push(
      finding(
        {
          category: "Website Conversion",
          severity: "High",
          title: "Website CTA Is Too Weak for Quote Requests",
          whatWeFound:
            "The website does not show a strong quote, estimate, booking, or call CTA signal.",
          whyItMatters:
            "Visitors from Google need an obvious next step. Weak CTAs reduce form fills and calls.",
          evidence: `Primary CTA detected: ${websiteAudit.hasPrimaryCta ? "yes" : "no"}. Quote CTA detected: ${websiteAudit.hasQuoteCta ? "yes" : "no"}.`,
          estimatedRevenueImpactLow: impact.low,
          estimatedRevenueImpactHigh: impact.high,
          leakRateLow: impact.leakRateLow,
          leakRateHigh: impact.leakRateHigh,
          recommendedFix:
            "Add a clear above-the-fold CTA: “Get a Free Estimate”, “Call Now”, and “Book Service”.",
          priorityScore: 93,
        },
        i++
      )
    );
  }

  if (!websiteAudit.hasPhoneLink) {
    const impact = moneyImpact(assumptions, 0.03, 0.1);
    findings.push(
      finding(
        {
          category: "Website Conversion",
          severity: "High",
          title: "No Click-to-Call Path Detected",
          whatWeFound: "The website does not appear to include a clickable tel: phone link.",
          whyItMatters:
            "Mobile visitors often want to call immediately. Missing click-to-call adds friction.",
          evidence: "No href=\"tel:\" link detected in homepage HTML.",
          estimatedRevenueImpactLow: impact.low,
          estimatedRevenueImpactHigh: impact.high,
          leakRateLow: impact.leakRateLow,
          leakRateHigh: impact.leakRateHigh,
          recommendedFix:
            "Add a sticky mobile call button and clickable phone links in the header and hero.",
          priorityScore: 88,
        },
        i++
      )
    );
  }

  if (!websiteAudit.hasContactForm) {
    const impact = moneyImpact(assumptions, 0.04, 0.12);
    findings.push(
      finding(
        {
          category: "Website Conversion",
          severity: "High",
          title: "No Lead Capture Form Detected",
          whatWeFound: "The homepage HTML did not include a contact or quote form.",
          whyItMatters:
            "Some buyers prefer submitting details instead of calling. No form can leak after-hours and comparison-shopping leads.",
          evidence: "No <form> element detected.",
          estimatedRevenueImpactLow: impact.low,
          estimatedRevenueImpactHigh: impact.high,
          leakRateLow: impact.leakRateLow,
          leakRateHigh: impact.leakRateHigh,
          recommendedFix:
            "Add a short quote request form with name, phone, service needed, and preferred time.",
          priorityScore: 87,
        },
        i++
      )
    );
  }

  if (websiteAudit.available && !websiteAudit.https) {
    const impact = moneyImpact(assumptions, 0.02, 0.06);
    findings.push(
      finding(
        {
          category: "Website Conversion",
          severity: "High",
          title: "Website Is Not Served Over HTTPS",
          whatWeFound: "The homepage URL did not resolve to an HTTPS-secured connection.",
          whyItMatters:
            "Modern browsers warn visitors before they submit forms or call. Insecure pages drop conversion and hurt SEO.",
          evidence: `normalizedUrl: ${websiteAudit.normalizedUrl ?? websiteAudit.url ?? "n/a"}.`,
          estimatedRevenueImpactLow: impact.low,
          estimatedRevenueImpactHigh: impact.high,
          leakRateLow: impact.leakRateLow,
          leakRateHigh: impact.leakRateHigh,
          recommendedFix:
            "Force HTTPS at the host/CDN, install a valid certificate, and 301 redirect every HTTP URL.",
          priorityScore: 85,
        },
        i++
      )
    );
  }

  if (websiteAudit.available && !websiteAudit.hasViewport) {
    const impact = moneyImpact(assumptions, 0.02, 0.06);
    findings.push(
      finding(
        {
          category: "Website Conversion",
          severity: "Medium",
          title: "Mobile Viewport Tag Is Missing",
          whatWeFound: "The page does not declare a mobile viewport meta tag.",
          whyItMatters:
            "Without a viewport, mobile visitors see desktop-sized layouts and bounce before calling. Most local search traffic is mobile.",
          evidence: "<meta name=\"viewport\"> not detected.",
          estimatedRevenueImpactLow: impact.low,
          estimatedRevenueImpactHigh: impact.high,
          leakRateLow: impact.leakRateLow,
          leakRateHigh: impact.leakRateHigh,
          recommendedFix:
            "Add `<meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">` and re-test on mobile.",
          priorityScore: 70,
        },
        i++
      )
    );
  }

  if (
    websiteAudit.available &&
    websiteAudit.mobileFriendly === false
  ) {
    const impact = moneyImpact(assumptions, 0.03, 0.1);
    findings.push(
      finding(
        {
          category: "Website Conversion",
          severity: "High",
          title: "Website Is Not Considered Mobile-Friendly",
          whatWeFound: "Mobile usability signals (viewport + mobile speed) suggest a poor mobile experience.",
          whyItMatters:
            "Most local-pack traffic is on a phone. Bad mobile UX kills calls and form fills before the lead is captured.",
          evidence: `Viewport: ${websiteAudit.hasViewport ? "yes" : "no"}. Mobile PageSpeed: ${
            websiteAudit.pageSpeedMobileScore ?? "n/a"
          }.`,
          estimatedRevenueImpactLow: impact.low,
          estimatedRevenueImpactHigh: impact.high,
          leakRateLow: impact.leakRateLow,
          leakRateHigh: impact.leakRateHigh,
          recommendedFix:
            "Switch to a responsive theme, fix tap targets, and run a real device test on a mid-range Android phone.",
          priorityScore: 83,
        },
        i++
      )
    );
  }

  if (websiteAudit.available && !websiteAudit.hasWebChat) {
    const impact = moneyImpact(assumptions, 0.02, 0.07);
    findings.push(
      finding(
        {
          category: "Website Conversion",
          severity: "Medium",
          title: "No Live Chat or Messaging Widget Detected",
          whatWeFound:
            "The homepage does not appear to include a live chat, messenger, or click-to-text widget.",
          whyItMatters:
            "Many local-service buyers want to message instead of calling, especially after hours. A chat or text widget captures leads that would otherwise leave without a call or form fill.",
          evidence:
            "No chat-widget signatures detected (Intercom, Drift, Tidio, Tawk.to, HubSpot Chat, LeadConnector, Crisp, LiveChat, Zendesk, Olark, Facebook Messenger, WhatsApp click-to-chat, etc.).",
          estimatedRevenueImpactLow: impact.low,
          estimatedRevenueImpactHigh: impact.high,
          leakRateLow: impact.leakRateLow,
          leakRateHigh: impact.leakRateHigh,
          recommendedFix:
            "Add a chat or click-to-text widget routed to a phone (Tidio, Tawk.to, HubSpot Chat, Intercom, or a WhatsApp/SMS button). Reply within 5 minutes during business hours.",
          priorityScore: 74,
        },
        i++
      )
    );
  }

  if (
    websiteAudit.available &&
    websiteAudit.cmsPlatformId &&
    websiteAudit.cmsPlatformId !== "wordpress"
  ) {
    const label = websiteAudit.cmsPlatformLabel ?? "this platform";
    const impact = moneyImpact(assumptions, 0.02, 0.06);
    findings.push(
      finding(
        {
          category: "Website Conversion",
          severity: "Medium",
          title: `Website Uses ${label} Instead of WordPress`,
          whatWeFound: `The homepage appears to run on ${label}, not WordPress.`,
          whyItMatters:
            "For local service and lead-generation businesses, WordPress is usually the better long-term fit: stronger SEO control (titles, internal linking, schema), a deep market of form, chat, CRM, and analytics plugins, and far more professionals who can maintain or migrate the site without vendor lock-in. All-in-one builders can launch quickly, but they often cap advanced SEO, integrations, and portability as you grow.",
          evidence: `Detected platform id: ${websiteAudit.cmsPlatformId}. Label: ${label}.`,
          estimatedRevenueImpactLow: impact.low,
          estimatedRevenueImpactHigh: impact.high,
          leakRateLow: impact.leakRateLow,
          leakRateHigh: impact.leakRateHigh,
          recommendedFix:
            "Plan a WordPress site on solid hosting (or a phased rebuild while keeping this site live). Match URL patterns, implement LocalBusiness schema, speed-focused mobile templates, and reliable lead capture (forms + click-to-call/text). Use an experienced WordPress migration partner so rankings and tracking carry over.",
          priorityScore: 63,
        },
        i++
      )
    );
  }

  if (
    websiteAudit.pageSpeedMobileScore !== null &&
    websiteAudit.pageSpeedMobileScore < 55
  ) {
    const impact = moneyImpact(assumptions, 0.04, 0.12);
    findings.push(
      finding(
        {
          category: "Website Conversion",
          severity: "Medium",
          title: "Mobile Website Speed Is Slowing Conversion",
          whatWeFound: `Mobile PageSpeed score is ${websiteAudit.pageSpeedMobileScore}/100.`,
          whyItMatters:
            "Slow mobile pages increase drop-off before visitors call or submit a quote request.",
          evidence: `PageSpeed mobile performance score: ${websiteAudit.pageSpeedMobileScore}.`,
          estimatedRevenueImpactLow: impact.low,
          estimatedRevenueImpactHigh: impact.high,
          leakRateLow: impact.leakRateLow,
          leakRateHigh: impact.leakRateHigh,
          recommendedFix:
            "Compress images, reduce blocking scripts, improve hosting/cache, and simplify the mobile landing page.",
          priorityScore: 78,
        },
        i++
      )
    );
  }

  if (!websiteAudit.hasTestimonials || !websiteAudit.hasProjectPhotos) {
    const impact = moneyImpact(assumptions, 0.05, 0.14);
    findings.push(
      finding(
        {
          category: "Website Trust & Visual Proof",
          severity: "High",
          title: "Website Lacks Trust Proof",
          whatWeFound:
            "Testimonials, customer proof, project photos, or visual proof signals are missing or weak.",
          whyItMatters:
            "Trust proof helps convert visitors who are comparing multiple local providers.",
          evidence: `Testimonials: ${websiteAudit.hasTestimonials ? "yes" : "no"}. Project photos: ${websiteAudit.hasProjectPhotos ? "yes" : "no"}.`,
          estimatedRevenueImpactLow: impact.low,
          estimatedRevenueImpactHigh: impact.high,
          leakRateLow: impact.leakRateLow,
          leakRateHigh: impact.leakRateHigh,
          recommendedFix:
            "Add testimonials, Google review highlights, client/project photos, team photos, and before/after examples.",
          priorityScore: 89,
        },
        i++
      )
    );
  }

  if (websiteAudit.available && !websiteAudit.hasClientPhotos) {
    const impact = moneyImpact(assumptions, 0.02, 0.07);
    findings.push(
      finding(
        {
          category: "Website Trust & Visual Proof",
          severity: "Medium",
          title: "No Client / Team Photos Detected on the Website",
          whatWeFound: "The homepage HTML did not include image alt or filenames signaling client, team, owner, or staff photos.",
          whyItMatters:
            "Local service buyers want to see the people behind the work. Stock-only imagery weakens trust and conversion.",
          evidence: "No <img> tags matched client/team/owner/staff/customer signals.",
          estimatedRevenueImpactLow: impact.low,
          estimatedRevenueImpactHigh: impact.high,
          leakRateLow: impact.leakRateLow,
          leakRateHigh: impact.leakRateHigh,
          recommendedFix:
            "Add 4–8 candid team and customer photos in the hero, about, and trust sections. Use descriptive alt text.",
          priorityScore: 67,
        },
        i++
      )
    );
  }

  if (websiteAudit.available && !websiteAudit.hasBeforeAfter) {
    const impact = moneyImpact(assumptions, 0.02, 0.06);
    findings.push(
      finding(
        {
          category: "Website Trust & Visual Proof",
          severity: "Medium",
          title: "No Before / After Visual Proof Detected",
          whatWeFound: "The homepage does not appear to include before/after visuals.",
          whyItMatters:
            "Before/after photos collapse the buyer's risk. Without them the lead has to imagine the result, which lowers form fills.",
          evidence: "No image src/alt matched before/after patterns.",
          estimatedRevenueImpactLow: impact.low,
          estimatedRevenueImpactHigh: impact.high,
          leakRateLow: impact.leakRateLow,
          leakRateHigh: impact.leakRateHigh,
          recommendedFix:
            "Build a small before/after gallery on the homepage and the most-visited service pages.",
          priorityScore: 64,
        },
        i++
      )
    );
  }

  if (
    websiteAudit.available &&
    (websiteAudit.hasPhoneLink || websiteAudit.hasPhoneText) &&
    !websiteAudit.hasTextEnabledPhone
  ) {
    const impact = moneyImpact(assumptions, 0.02, 0.07);
    findings.push(
      finding(
        {
          category: "Website Trust & Visual Proof",
          severity: "Medium",
          title: "No Text-Enabled Phone Path Detected",
          whatWeFound:
            "The homepage shows a phone number or click-to-call, but no SMS (sms:/smsto:) link, WhatsApp chat link, or clear “text us” / click-to-text signal was detected.",
          whyItMatters:
            "Many local buyers prefer texting for quick questions or after-hours contact. Without an obvious text path, those leads default to competitors or never engage.",
          evidence: `Click-to-call: ${websiteAudit.hasPhoneLink ? "yes" : "no"}. Phone number in copy: ${websiteAudit.hasPhoneText ? "yes" : "no"}. Text/SMS channels in HTML: not detected.`,
          estimatedRevenueImpactLow: impact.low,
          estimatedRevenueImpactHigh: impact.high,
          leakRateLow: impact.leakRateLow,
          leakRateHigh: impact.leakRateHigh,
          recommendedFix:
            "Add an `sms:` link next to the phone number, a WhatsApp or business-texting widget (Podium, TextUs, etc.), or a visible “Text us” CTA with the mobile number.",
          priorityScore: 65,
        },
        i++
      )
    );
  }

  if (websiteAudit.blurryImageSignals > 0) {
    const impact = moneyImpact(assumptions, 0.02, 0.06);
    findings.push(
      finding(
        {
          category: "Photo Quality & Quantity",
          severity: "Medium",
          title: "Homepage images may look low quality (small display dimensions)",
          whatWeFound: `${websiteAudit.blurryImageSignals} homepage <img> tag(s) use small width/height attributes, which often renders soft or pixelated on modern screens.`,
          whyItMatters:
            "Poorly sized web images hurt trust the same way weak Google profile photos do — buyers equate visual polish with workmanship.",
          evidence: `${websiteAudit.blurryImageSignals} image tags had small width/height attributes in fetched HTML.`,
          estimatedRevenueImpactLow: impact.low,
          estimatedRevenueImpactHigh: impact.high,
          leakRateLow: impact.leakRateLow,
          leakRateHigh: impact.leakRateHigh,
          recommendedFix:
            "Replace low-resolution images with clear team, project, service, and before/after photos.",
          priorityScore: 66,
        },
        i++
      )
    );
  }

  if (websiteAudit.available && !hasPaidOrAnalyticsBaseline(websiteAudit)) {
    const impact = moneyImpact(assumptions, 0.02, 0.08);
    findings.push(
      finding(
        {
          category: "Tracking & Ads Readiness",
          severity: "Medium",
          title: "Limited Marketing Analytics & Ad Pixels Detected",
          whatWeFound:
            "Homepage HTML did not show recognizable Google Analytics (GA4 / gtag), Google Tag Manager, Google Ads conversion snippets, Meta (Facebook) Pixel, TikTok Pixel, Microsoft Advertising UET (Bing), LinkedIn Insight Tag, Pinterest Tag, X (Twitter) Pixel, or Snapchat Pixel.",
          whyItMatters:
            "Paid campaigns and organic traffic need measurable conversion signals (calls, forms, quotes). Without at least one of these tags, channel ROI and optimization stay guesswork.",
          evidence:
            "Checked script URLs and common signatures in the fetched HTML. Detected: " +
            formatDetectedMarketingTags(websiteAudit),
          estimatedRevenueImpactLow: impact.low,
          estimatedRevenueImpactHigh: impact.high,
          leakRateLow: impact.leakRateLow,
          leakRateHigh: impact.leakRateHigh,
          recommendedFix:
            "Use Google Tag Manager as the container where possible: deploy GA4, add pixels for each ad platform you use (Meta, TikTok, Microsoft Ads, etc.), and fire conversion events for calls, lead forms, and quote requests.",
          priorityScore: 72,
        },
        i++
      )
    );
  }

  if (
    websiteAudit.available &&
    websiteAudit.hasGoogleTagManager &&
    !websiteAudit.hasGoogleAnalytics
  ) {
    const impact = moneyImpact(assumptions, 0.01, 0.05);
    findings.push(
      finding(
        {
          category: "Tracking & Ads Readiness",
          severity: "Medium",
          title: "Tag Manager Detected But Analytics Not Firing",
          whatWeFound: "Google Tag Manager is on the site, but no GA4/Universal Analytics signal was detected.",
          whyItMatters:
            "GTM without GA leaves the business blind to which channels actually produce the calls and forms it pays for.",
          evidence: `GTM: detected. GA/gtag in initial HTML: not detected. Snapshot of tags visible in HTML: ${formatDetectedMarketingTags(websiteAudit)}. (GA may still load through the container — confirm in Google Tag Assistant / preview mode.)`,
          estimatedRevenueImpactLow: impact.low,
          estimatedRevenueImpactHigh: impact.high,
          leakRateLow: impact.leakRateLow,
          leakRateHigh: impact.leakRateHigh,
          recommendedFix:
            "Publish a GA4 tag in GTM and verify pageview + key conversion events in real-time.",
          priorityScore: 71,
        },
        i++
      )
    );
  }

  if (websiteAudit.available && !websiteAudit.hasMetaPixel && hasPaidOrAnalyticsBaseline(websiteAudit)) {
    const impact = moneyImpact(assumptions, 0.01, 0.04);
    findings.push(
      finding(
        {
          category: "Tracking & Ads Readiness",
          severity: "Low",
          title: "No Meta (Facebook/Instagram) Pixel Detected",
          whatWeFound: "The Meta Pixel was not detected on the homepage.",
          whyItMatters:
            "Without the Pixel, Meta cannot retarget visitors who didn't call, which leaves a cheap remarketing channel unused.",
          evidence:
            "Meta Pixel (fbq / connect.facebook.net) not found in initial HTML. " +
            `Other marketing tags detected in HTML: ${formatDetectedMarketingTags(websiteAudit)}.`,
          estimatedRevenueImpactLow: impact.low,
          estimatedRevenueImpactHigh: impact.high,
          leakRateLow: impact.leakRateLow,
          leakRateHigh: impact.leakRateHigh,
          recommendedFix:
            "Install Meta Pixel via GTM and configure Lead/Contact custom events.",
          priorityScore: 50,
        },
        i++
      )
    );
  }

  if (!websiteAudit.hasGoogleAdsTag && (assumptions.monthlyAdSpend ?? 0) > 0) {
    const impact = moneyImpact(assumptions, 0.03, 0.1);
    findings.push(
      finding(
        {
          category: "Tracking & Ads Readiness",
          severity: "High",
          title: "Ad Spend May Not Be Connected to Conversion Tracking",
          whatWeFound: "Google Ads conversion tag was not detected, but monthly ad spend was entered.",
          whyItMatters:
            "Untracked ads can waste budget because campaigns cannot optimize toward qualified calls and forms.",
          evidence: `Monthly ad spend assumption: $${assumptions.monthlyAdSpend}. Google Ads tag: not detected.`,
          estimatedRevenueImpactLow: impact.low,
          estimatedRevenueImpactHigh: impact.high,
          leakRateLow: impact.leakRateLow,
          leakRateHigh: impact.leakRateHigh,
          recommendedFix:
            "Connect Google Ads conversion tracking, call tracking, and landing page events through GTM.",
          priorityScore: 84,
        },
        i++
      )
    );
  }

  if (photoAnalysis.hasLowResolutionSignals) {
    const impact = moneyImpact(assumptions, 0.01, 0.05);
    findings.push(
      finding(
        {
          category: "Photo Quality & Quantity",
          severity: "Medium",
          title: "Some Google profile photos look low resolution",
          whatWeFound:
            photoAnalysis.profileLowResolutionCount === 1
              ? "At least one Google Business Profile photo has declared dimensions below 500×350 pixels."
              : `${photoAnalysis.profileLowResolutionCount} Google Business Profile photos have declared dimensions below 500×350 pixels.`,
          whyItMatters:
            "Low-resolution profile photos make the business look amateur and reduce trust before the click.",
          evidence: photoAnalysis.notes.join(" "),
          estimatedRevenueImpactLow: impact.low,
          estimatedRevenueImpactHigh: impact.high,
          leakRateLow: impact.leakRateLow,
          leakRateHigh: impact.leakRateHigh,
          recommendedFix:
            "Replace small/blurry photos with high-resolution shots taken on a recent phone (≥ 1920×1080) and re-upload.",
          priorityScore: 56,
        },
        i++
      )
    );
  }

  if (photoAnalysis.hasLowQuantity) {
    const impact = moneyImpact(assumptions, 0.02, 0.07);
    findings.push(
      finding(
        {
          category: "Photo Quality & Quantity",
          severity: "Medium",
          title: "Google Photo Footprint Is Weak",
          whatWeFound: `Business photos: ${photoAnalysis.businessPhotoCount}. Competitor average: ${photoAnalysis.competitorAveragePhotoCount}.`,
          whyItMatters:
            "Photos help prospects trust the business before calling from Google Maps.",
          evidence: photoAnalysis.notes.join(" "),
          estimatedRevenueImpactLow: impact.low,
          estimatedRevenueImpactHigh: impact.high,
          leakRateLow: impact.leakRateLow,
          leakRateHigh: impact.leakRateHigh,
          recommendedFix:
            "Add team, truck, project, before/after, and location photos to Google every month.",
          priorityScore: 70,
        },
        i++
      )
    );
  }

  if (!websiteAudit.hasServicePages || !websiteAudit.hasLocationPages) {
    const impact = moneyImpact(assumptions, 0.03, 0.1);
    findings.push(
      finding(
        {
          category: "Local SEO & Market Positioning",
          severity: "Medium",
          title: "Local Service Content Is Thin",
          whatWeFound:
            "The website appears to have limited service or location content signals.",
          whyItMatters:
            "Specific service and city pages help Google understand where and when to show the business.",
          evidence: `Service signals: ${websiteAudit.hasServicePages ? "yes" : "no"}. Location signals: ${websiteAudit.hasLocationPages ? "yes" : "no"}.`,
          estimatedRevenueImpactLow: impact.low,
          estimatedRevenueImpactHigh: impact.high,
          leakRateLow: impact.leakRateLow,
          leakRateHigh: impact.leakRateHigh,
          recommendedFix:
            "Create service pages and location/service-area pages tied to the highest-value jobs.",
          priorityScore: 74,
        },
        i++
      )
    );
  }

  if (websiteAudit.available && !websiteAudit.hasLocalBusinessSchema) {
    const impact = moneyImpact(assumptions, 0.02, 0.06);
    findings.push(
      finding(
        {
          category: "Local SEO & Market Positioning",
          severity: "Medium",
          title: "Missing LocalBusiness Schema",
          whatWeFound: "The page does not appear to include LocalBusiness / Service structured data.",
          whyItMatters:
            "Schema helps Google connect the website to the Google profile and unlocks rich results that earn clicks.",
          evidence: "No application/ld+json LocalBusiness/Organization/Service block detected.",
          estimatedRevenueImpactLow: impact.low,
          estimatedRevenueImpactHigh: impact.high,
          leakRateLow: impact.leakRateLow,
          leakRateHigh: impact.leakRateHigh,
          recommendedFix:
            "Add LocalBusiness JSON-LD with name, address, phone, hours, areaServed, sameAs (social/Google), and main services.",
          priorityScore: 69,
        },
        i++
      )
    );
  }

  const minImagesForImageSeo = 3;
  const imgSeo = websiteAudit.imageSeo;
  const imgN = websiteAudit.imageCount;
  if (websiteAudit.available && imgSeo && imgN >= minImagesForImageSeo) {
    const altRatio = imgSeo.weakOrMissingAlt / imgN;
    if (altRatio >= 0.25 || imgSeo.weakOrMissingAlt >= 5) {
      const impact = moneyImpact(assumptions, 0.02, 0.07);
      const pct = Math.round(altRatio * 100);
      findings.push(
        finding(
          {
            category: "Photo Quality & Quantity",
            severity: altRatio >= 0.4 || imgSeo.weakOrMissingAlt >= 12 ? "Medium" : "Low",
            title: "Homepage images are missing useful alt text",
            whatWeFound: `${imgSeo.weakOrMissingAlt} of ${imgN} homepage images (${pct}%) are missing or have weak alt text.`,
            whyItMatters:
              "Search engines rely entirely on alt text to understand image content — without it, images are invisible to crawlers.",
            evidence: `Decorative images excluded when marked role=presentation or aria-hidden=true. Counts: weakOrMissingAlt=${imgSeo.weakOrMissingAlt}, missingAltAttribute=${imgSeo.missingAltAttribute}, total <img>=${imgN}.`,
            estimatedRevenueImpactLow: impact.low,
            estimatedRevenueImpactHigh: impact.high,
            leakRateLow: impact.leakRateLow,
            leakRateHigh: impact.leakRateHigh,
            recommendedFix:
              "Add concise, descriptive alt text for every non-decorative image (service, location, team, results). Keep decorative images explicitly marked and alt=\"\" with role=\"presentation\" where appropriate.",
            priorityScore: altRatio >= 0.4 ? 66 : 62,
          },
          i++
        )
      );
    }

    const titleRatio = imgSeo.missingTitle / imgN;
    if (titleRatio >= 0.5) {
      const impact = moneyImpact(assumptions, 0.01, 0.04);
      const pct = Math.round(titleRatio * 100);
      findings.push(
        finding(
          {
            category: "Photo Quality & Quantity",
            severity: "Low",
            title: "Many homepage images lack a title attribute",
            whatWeFound: `${imgSeo.missingTitle} of ${imgN} images (${pct}%) have no title attribute in the homepage HTML.`,
            whyItMatters:
              "Title attributes provide additional context for search engines and improve accessibility for screen readers.",
            evidence: `missingTitle=${imgSeo.missingTitle}, images=${imgN}.`,
            estimatedRevenueImpactLow: impact.low,
            estimatedRevenueImpactHigh: impact.high,
            leakRateLow: impact.leakRateLow,
            leakRateHigh: impact.leakRateHigh,
            recommendedFix:
              "Where helpful (not duplicative of alt), add short title attributes describing the image for humans and assistive tech.",
            priorityScore: 54,
          },
          i++
        )
      );
    }

    const genRatio = imgN > 0 ? imgSeo.genericFilename / imgN : 0;
    if (imgSeo.genericFilename >= 3 || genRatio >= 0.35) {
      const impact = moneyImpact(assumptions, 0.015, 0.05);
      const samples =
        imgSeo.genericFilenameSamples.length > 0
          ? ` Examples: ${imgSeo.genericFilenameSamples.join(", ")}.`
          : "";
      findings.push(
        finding(
          {
            category: "Photo Quality & Quantity",
            severity: genRatio >= 0.45 ? "Medium" : "Low",
            title: "Homepage images use generic filenames",
            whatWeFound: `${imgSeo.genericFilename} of ${imgN} image sources look generically named (short tokens, numbers-only, hashes, etc.).${samples}`,
            whyItMatters:
              "Descriptive filenames (e.g. fresh-pasta-rome.jpg) help Google understand the content of your images.",
            evidence: `genericFilename=${imgSeo.genericFilename}, images=${imgN}. Heuristic flags common CMS/upload patterns.`,
            estimatedRevenueImpactLow: impact.low,
            estimatedRevenueImpactHigh: impact.high,
            leakRateLow: impact.leakRateLow,
            leakRateHigh: impact.leakRateHigh,
            recommendedFix:
              "Rename key images with short, readable slugs (service + location or topic) before upload; avoid default camera or upload names.",
            priorityScore: genRatio >= 0.45 ? 63 : 58,
          },
          i++
        )
      );
    }

    const wasteBytes = websiteAudit.pageSpeedImageWasteBytes;
    const wasteThreshold = 200 * 1024;
    let compressible = false;
    let compressEvidence = "";
    if (wasteBytes !== null && wasteBytes >= wasteThreshold) {
      compressible = true;
      const mib = wasteBytes / (1024 * 1024);
      const label =
        mib >= 1
          ? `${mib.toFixed(1)} MiB`
          : `${Math.round(wasteBytes / 1024)} KiB`;
      compressEvidence = `Lighthouse (mobile) estimated image-related byte savings ~${label} across optimization audits.`;
    } else if (
      wasteBytes === null &&
      imgSeo.largeDeclaredDimensions >= 2 &&
      websiteAudit.pageSpeedMobileScore !== null &&
      websiteAudit.pageSpeedMobileScore < 70
    ) {
      compressible = true;
      compressEvidence = `No Lighthouse image-byte breakdown in this run; homepage has ${imgSeo.largeDeclaredDimensions} images with width/height ≥1920px and mobile PageSpeed ${websiteAudit.pageSpeedMobileScore}/100 — large images often hurt load and rankings.`;
    }
    if (compressible) {
      const impact = moneyImpact(assumptions, 0.02, 0.08);
      findings.push(
        finding(
          {
            category: "Photo Quality & Quantity",
            severity: wasteBytes !== null && wasteBytes >= 500 * 1024 ? "High" : "Medium",
            title: "Heavy or oversized homepage images hurt mobile performance",
            whatWeFound:
              wasteBytes !== null && wasteBytes >= wasteThreshold
                ? `Mobile Lighthouse reports substantial image optimization opportunity (~${Math.round(wasteBytes / 1024)} KiB combined across image audits).`
                : `Several images declare very large dimensions and mobile PageSpeed is below 70, suggesting heavy imagery may be slowing the page.`,
            whyItMatters:
              "Large image file sizes slow down page load speed, which negatively affects your search ranking.",
            evidence: compressEvidence,
            estimatedRevenueImpactLow: impact.low,
            estimatedRevenueImpactHigh: impact.high,
            leakRateLow: impact.leakRateLow,
            leakRateHigh: impact.leakRateHigh,
            recommendedFix:
              "Compress and resize images to displayed dimensions; prefer WebP/AVIF; use responsive srcset and lazy-load below-the-fold images.",
            priorityScore: wasteBytes !== null && wasteBytes >= 500 * 1024 ? 65 : 60,
          },
          i++
        )
      );
    }
  }

  if (websiteAudit.available && !websiteAudit.title) {
    const impact = moneyImpact(assumptions, 0.01, 0.05);
    findings.push(
      finding(
        {
          category: "Local SEO & Market Positioning",
          severity: "Medium",
          title: "Homepage Title Tag Is Missing",
          whatWeFound: "No <title> or og:title was found on the homepage.",
          whyItMatters:
            "The title tag is the most important on-page SEO signal and the headline shown in search results.",
          evidence: "title / og:title not detected.",
          estimatedRevenueImpactLow: impact.low,
          estimatedRevenueImpactHigh: impact.high,
          leakRateLow: impact.leakRateLow,
          leakRateHigh: impact.leakRateHigh,
          recommendedFix:
            "Set a title in the format `Primary Service in City | Brand Name`. Keep it under 60 characters.",
          priorityScore: 72,
        },
        i++
      )
    );
  }

  if (websiteAudit.available && !websiteAudit.metaDescription) {
    const impact = moneyImpact(assumptions, 0.01, 0.04);
    findings.push(
      finding(
        {
          category: "Local SEO & Market Positioning",
          severity: "Low",
          title: "Meta Description Is Missing",
          whatWeFound: "No meta description / og:description was found on the homepage.",
          whyItMatters:
            "The meta description is the snippet under the title in Google. A weak/missing snippet earns fewer clicks.",
          evidence: "meta name=description / og:description not detected.",
          estimatedRevenueImpactLow: impact.low,
          estimatedRevenueImpactHigh: impact.high,
          leakRateLow: impact.leakRateLow,
          leakRateHigh: impact.leakRateHigh,
          recommendedFix:
            "Write a 140–160 character description that names the service, the city, the differentiator, and a CTA.",
          priorityScore: 55,
        },
        i++
      )
    );
  }

  if (
    websiteAudit.available &&
    websiteAudit.title &&
    business.address &&
    !titleMentionsLocale(websiteAudit.title, business)
  ) {
    const impact = moneyImpact(assumptions, 0.01, 0.04);
    findings.push(
      finding(
        {
          category: "Local SEO & Market Positioning",
          severity: "Low",
          title: "Homepage Title Does Not Mention the Service Area",
          whatWeFound: `Title: "${websiteAudit.title}". The business is based in ${business.address}.`,
          whyItMatters:
            "Local intent searches reward titles that name the city. Missing geography costs ranking for the highest-value queries.",
          evidence: "Title contains no token from the business address.",
          estimatedRevenueImpactLow: impact.low,
          estimatedRevenueImpactHigh: impact.high,
          leakRateLow: impact.leakRateLow,
          leakRateHigh: impact.leakRateHigh,
          recommendedFix:
            "Update the homepage title to include the primary service + city (e.g., `Roofing in Houston | Brand`).",
          priorityScore: 58,
        },
        i++
      )
    );
  }

  if (findings.length === 0) {
    const impact = moneyImpact(assumptions, 0.01, 0.04);
    findings.push(
      finding(
        {
          category: "Local SEO & Market Positioning",
          severity: "Low",
          title: "No Critical Revenue Leaks Detected",
          whatWeFound:
            "The first-pass audit did not find a major issue, but ongoing tracking can still reveal optimization opportunities.",
          whyItMatters:
            "Even healthy local businesses can improve visibility, follow-up, reviews, and conversion tracking.",
          evidence: "Initial heuristics returned healthy signals.",
          estimatedRevenueImpactLow: impact.low,
          estimatedRevenueImpactHigh: impact.high,
          leakRateLow: impact.leakRateLow,
          leakRateHigh: impact.leakRateHigh,
          recommendedFix:
            "Install lead-to-revenue tracking and monitor GBP, website, ads, reviews, and referrals monthly.",
          priorityScore: 40,
        },
        i++
      )
    );
  }

  return findings.sort((a, b) => b.priorityScore - a.priorityScore);
}

function computeScores(input: BuildInput): AuditScores {
  const {
    business,
    competitors,
    websiteAudit,
    reviewSentiment,
    photoAnalysis,
    rankingSnapshot,
    competitorStrengths,
  } = input;
  const comp = competitorAverages(competitors);
  let gbp = 100;
  if (!business.website) gbp -= 25;
  if (!business.phone) gbp -= 20;
  if (business.hours.length === 0) gbp -= 10;
  if ((business.reviewCount ?? 0) < 20) gbp -= 15;
  if ((business.photoCount ?? 0) < 10) gbp -= 10;

  let reviews = reviewSentiment.sentimentScore;
  if (comp.reviews > (business.reviewCount ?? 0) * 2) reviews -= 20;
  if ((business.rating ?? 5) < comp.rating) reviews -= 8;

  const conversionPenalties: number[] = [];
  if (!websiteAudit.https) conversionPenalties.push(15);
  if (!websiteAudit.hasPrimaryCta) conversionPenalties.push(25);
  if (!websiteAudit.hasPhoneLink) conversionPenalties.push(18);
  if (!websiteAudit.hasContactForm) conversionPenalties.push(18);
  if (!websiteAudit.hasQuoteCta) conversionPenalties.push(12);
  if (websiteAudit.pageSpeedMobileScore !== null && websiteAudit.pageSpeedMobileScore < 55) {
    conversionPenalties.push(15);
  }
  if (!websiteAudit.mobileFriendly) conversionPenalties.push(12);
  if (websiteAudit.available && !websiteAudit.hasWebChat) conversionPenalties.push(8);
  if (
    websiteAudit.available &&
    websiteAudit.cmsPlatformId &&
    websiteAudit.cmsPlatformId !== "wordpress"
  ) {
    conversionPenalties.push(6);
  }

  let websiteConversion = websiteAudit.available
    ? scoreAfterPenalties(100, conversionPenalties, 68)
    : scoreAfterPenalties(32, conversionPenalties, 22);

  const trustPenalties: number[] = [];
  if (!websiteAudit.hasTestimonials) trustPenalties.push(25);
  if (!websiteAudit.hasProjectPhotos) trustPenalties.push(20);
  if (!websiteAudit.hasClientPhotos) trustPenalties.push(15);
  if (!websiteAudit.hasBeforeAfter) trustPenalties.push(10);
  if (!websiteAudit.hasBeforeAfter) trustPenalties.push(10);
  if (
    websiteAudit.available &&
    (websiteAudit.hasPhoneLink || websiteAudit.hasPhoneText) &&
    !websiteAudit.hasTextEnabledPhone
  ) {
    trustPenalties.push(10);
  }

  let websiteTrust = websiteAudit.available
    ? scoreAfterPenalties(100, trustPenalties, 72)
    : scoreAfterPenalties(30, trustPenalties, 22);

  let localSeo = 100;
  if (!websiteAudit.hasLocalBusinessSchema) localSeo -= 20;
  if (!websiteAudit.hasServicePages) localSeo -= 20;
  if (!websiteAudit.hasLocationPages) localSeo -= 20;
  if (rankingSnapshot.selectedBusinessPosition && rankingSnapshot.selectedBusinessPosition > 5) {
    localSeo -= 20;
  }

  let competitorGap = 100;
  if (rankingSnapshot.selectedBusinessPosition && rankingSnapshot.selectedBusinessPosition > 5) {
    competitorGap -= Math.min(40, rankingSnapshot.selectedBusinessPosition * 2);
  }
  if (comp.reviews > (business.reviewCount ?? 0) * 2) competitorGap -= 25;
  if (comp.rating > (business.rating ?? 0) + 0.2) competitorGap -= 15;

  /** When reviewers praise competitors on a theme far more than you, we surface a Medium finding — score must reflect that gap (never a perfect 100). */
  if (competitorStrengths.topGap) {
    const g = competitorStrengths.topGap;
    let penalty = 0;
    if (g.ownMentions === 0) {
      if (g.competitorMentions >= 10) penalty = 38;
      else if (g.competitorMentions >= 6) penalty = 32;
      else if (g.competitorMentions >= 3) penalty = 26;
      else penalty = 20;
    } else {
      const ratio = g.competitorMentions / Math.max(1, g.ownMentions);
      if (ratio >= 6) penalty = 34;
      else if (ratio >= 4) penalty = 28;
      else if (ratio >= 2.5) penalty = 22;
      else penalty = 15;
    }
    competitorGap -= penalty;
  }

  const googleMeasurementCore =
    websiteAudit.hasGoogleAnalytics || websiteAudit.hasGoogleTagManager;
  const nonGooglePixels =
    websiteAudit.hasMetaPixel ||
    websiteAudit.hasTikTokPixel ||
    websiteAudit.hasBingUet ||
    websiteAudit.hasLinkedInInsight ||
    websiteAudit.hasPinterestPixel ||
    websiteAudit.hasTwitterPixel ||
    websiteAudit.hasSnapchatPixel;

  const trackingPenalties: number[] = [];
  if (!googleMeasurementCore) {
    trackingPenalties.push(
      websiteAudit.hasGoogleAdsTag || nonGooglePixels ? 30 : 42
    );
  } else if (websiteAudit.hasGoogleTagManager && !websiteAudit.hasGoogleAnalytics) {
    trackingPenalties.push(10);
  }
  if (!websiteAudit.hasGoogleAdsTag) trackingPenalties.push(18);
  if (!websiteAudit.hasMetaPixel) trackingPenalties.push(9);
  if (!websiteAudit.hasTikTokPixel) trackingPenalties.push(3);
  if (!websiteAudit.hasBingUet) trackingPenalties.push(3);

  let trackingAds = scoreAfterPenalties(100, trackingPenalties, 54);
  if (!googleMeasurementCore && nonGooglePixels) trackingAds += 20;
  if (!googleMeasurementCore && !nonGooglePixels && websiteAudit.hasGoogleAdsTag) trackingAds += 8;

  let photos = 100;
  if (photoAnalysis.hasLowQuantity) photos -= 40;
  if (photoAnalysis.hasLowResolutionSignals) photos -= 20;
  if (photoAnalysis.competitorAveragePhotoCount > photoAnalysis.businessPhotoCount * 2) {
    photos -= 20;
  }
  if (photoAnalysis.hasWebsiteLowResolutionHtmlSignals) photos -= 12;
  if (photoAnalysis.hasWebsiteImageOptimizationGaps) photos -= 14;

  const scores = {
    gbpHealth: clampScore(gbp),
    reviews: clampScore(reviews),
    websiteConversion: clampScore(websiteConversion),
    websiteTrust: clampScore(websiteTrust),
    localSeo: clampScore(localSeo),
    competitorGap: clampScore(competitorGap),
    trackingAds: clampScore(trackingAds),
    photos: clampScore(photos),
  };
  const overall = clampScore(
    scores.gbpHealth * 0.2 +
      scores.reviews * 0.2 +
      ((scores.websiteConversion + scores.websiteTrust) / 2) * 0.2 +
      scores.localSeo * 0.15 +
      scores.competitorGap * 0.1 +
      scores.trackingAds * 0.1 +
      scores.photos * 0.05
  );
  return {
    overall,
    grade: gradeFromScore(overall),
    ...scores,
  };
}

function scoreForCategory(scores: AuditScores, category: AuditCategory): number {
  switch (category) {
    case "My Business vs Google Competitors":
      return scores.competitorGap;
    case "Google Business Profile":
      return scores.gbpHealth;
    case "Reviews & Reputation":
      return scores.reviews;
    case "Website Conversion":
      return scores.websiteConversion;
    case "Website Trust & Visual Proof":
      return scores.websiteTrust;
    case "Tracking & Ads Readiness":
      return scores.trackingAds;
    case "Photo Quality & Quantity":
      return scores.photos;
    case "Local SEO & Market Positioning":
      return scores.localSeo;
  }
}

function sectionSummaryText(_category: AuditCategory, findings: AuditFinding[]): string {
  if (findings.length === 0) return "No major issues found in this section.";
  const highest = findings[0];
  const severityCounts: Record<string, number> = {};
  for (const f of findings) {
    severityCounts[f.severity] = (severityCounts[f.severity] ?? 0) + 1;
  }
  const order = ["Critical", "High", "Medium", "Low"] as const;
  const breakdown = order
    .filter((sev) => severityCounts[sev])
    .map((sev) => `${severityCounts[sev]} ${sev.toLowerCase()}`)
    .join(", ");
  const issueLine = `${findings.length} issue${findings.length === 1 ? "" : "s"} found${breakdown ? ` (${breakdown})` : ""}.`;
  return `${issueLine} Highest priority: ${highest.title}.`;
}

function buildSectionSummaries(
  scores: AuditScores,
  findings: AuditFinding[]
): SectionProblemSummary[] {
  return CATEGORIES.map((category) => {
    const sectionFindings = findings.filter((f) => f.category === category);
    const score = scoreForCategory(scores, category);
    return {
      category,
      score,
      grade: gradeFromScore(score),
      issueCount: sectionFindings.length,
      summary: sectionSummaryText(category, sectionFindings),
      findings: sectionFindings,
    };
  });
}

function aggregateLeak(
  assumptions: AuditAssumptions,
  findings: AuditFinding[]
): {
  combinedLeakLow: number;
  combinedLeakHigh: number;
  monthlyRevenueLow: number;
  monthlyRevenueHigh: number;
  lostLeadsLow: number;
  lostLeadsHigh: number;
  lostJobsLow: number;
  lostJobsHigh: number;
  addressableMonthlyRevenue: number;
} {
  const cap = addressableMonthlyRevenue(assumptions);
  const combinedLeakLow = combineLeakRates(findings.map((f) => f.leakRateLow));
  const combinedLeakHigh = combineLeakRates(findings.map((f) => f.leakRateHigh));
  const lostLeadsLow = assumptions.estimatedMonthlyLeads * combinedLeakLow;
  const lostLeadsHigh = assumptions.estimatedMonthlyLeads * combinedLeakHigh;
  return {
    combinedLeakLow,
    combinedLeakHigh,
    monthlyRevenueLow: Math.round(cap * combinedLeakLow),
    monthlyRevenueHigh: Math.round(cap * combinedLeakHigh),
    lostLeadsLow,
    lostLeadsHigh,
    lostJobsLow: lostLeadsLow * assumptions.closeRate,
    lostJobsHigh: lostLeadsHigh * assumptions.closeRate,
    addressableMonthlyRevenue: cap,
  };
}

/** Single headline $/mo leans toward the low band — reflects “likely” loss, not the upper model bound. */
function headlineLeakUsdMonth(low: number, high: number): number {
  if (high <= low) return Math.round(low);
  return Math.round(low + (high - low) * 0.38);
}

function midpointLeadsJobs(low: number, high: number): number {
  return Math.round(((low + high) / 2) * 10) / 10;
}

function buildRevenueEstimate(
  assumptions: AuditAssumptions,
  findings: AuditFinding[]
): RevenueEstimate {
  const aggregate = aggregateLeak(assumptions, findings);
  const estLeakPct = Math.round(((aggregate.combinedLeakLow + aggregate.combinedLeakHigh) / 2) * 100);
  return {
    averageJobValue: assumptions.averageJobValue,
    closeRate: assumptions.closeRate,
    estimatedMonthlyLeads: assumptions.estimatedMonthlyLeads,
    estimatedLostOpportunitiesLow: Math.round(aggregate.lostLeadsLow),
    estimatedLostOpportunitiesHigh: Math.round(aggregate.lostLeadsHigh),
    potentialRecoveredJobsLow: Math.round(aggregate.lostJobsLow * 10) / 10,
    potentialRecoveredJobsHigh: Math.round(aggregate.lostJobsHigh * 10) / 10,
    estimatedRevenueLow: aggregate.monthlyRevenueLow,
    estimatedRevenueHigh: aggregate.monthlyRevenueHigh,
    assumptions: [
      `Estimated average job value: $${assumptions.averageJobValue.toLocaleString()}`,
      `Estimated close rate: ${Math.round(assumptions.closeRate * 100)}%`,
      `Estimated monthly leads at risk: ${assumptions.estimatedMonthlyLeads}`,
      `Total addressable monthly revenue: $${Math.round(
        aggregate.addressableMonthlyRevenue
      ).toLocaleString()} (leads × close rate × avg job value)`,
      `Combined leak rate across all detected issues: ~${estLeakPct}% of monthly leads (midpoint of the model band).`,
      "Multiple leaks are combined with funnel math (1 − product of survival rates) so issues do not double-count; long lists are overlap-damped and the total is capped at about half of addressable revenue.",
    ],
  };
}

function buildMoneySummary(
  assumptions: AuditAssumptions,
  findings: AuditFinding[]
): FoundIssuesMoneySummary {
  const severityCounts = {
    Critical: 0,
    High: 0,
    Medium: 0,
    Low: 0,
  };
  for (const finding of findings) severityCounts[finding.severity] += 1;
  const topExpensiveLeaks = [...findings]
    .sort((a, b) => b.estimatedRevenueImpactHigh - a.estimatedRevenueImpactHigh)
    .slice(0, 5);
  const aggregate = aggregateLeak(assumptions, findings);
  const fixFirst =
    findings[0]?.recommendedFix ??
    "Review your Google Business Profile and website for conversion and local visibility gaps.";
  const lostLeadsLowR = Math.round(aggregate.lostLeadsLow * 10) / 10;
  const lostLeadsHighR = Math.round(aggregate.lostLeadsHigh * 10) / 10;
  const lostJobsLowR = Math.round(aggregate.lostJobsLow * 10) / 10;
  const lostJobsHighR = Math.round(aggregate.lostJobsHigh * 10) / 10;
  const estimatedMonthlyCost = headlineLeakUsdMonth(
    aggregate.monthlyRevenueLow,
    aggregate.monthlyRevenueHigh
  );
  const estimatedAnnualCost = estimatedMonthlyCost * 12;
  const estimatedCombinedLeakRate = (aggregate.combinedLeakLow + aggregate.combinedLeakHigh) / 2;
  const estimatedLostLeadsPerMonth = midpointLeadsJobs(aggregate.lostLeadsLow, aggregate.lostLeadsHigh);
  const estimatedLostJobsPerMonth = midpointLeadsJobs(aggregate.lostJobsLow, aggregate.lostJobsHigh);
  const estLeakPct = Math.round(estimatedCombinedLeakRate * 100);
  return {
    totalIssues: findings.length,
    severityCounts,
    topExpensiveLeaks,
    estimatedMonthlyCostLow: aggregate.monthlyRevenueLow,
    estimatedMonthlyCostHigh: aggregate.monthlyRevenueHigh,
    estimatedMonthlyCost,
    estimatedAnnualCostLow: aggregate.monthlyRevenueLow * 12,
    estimatedAnnualCostHigh: aggregate.monthlyRevenueHigh * 12,
    estimatedAnnualCost,
    addressableMonthlyRevenue: Math.round(aggregate.addressableMonthlyRevenue),
    combinedLeakRateLow: aggregate.combinedLeakLow,
    combinedLeakRateHigh: aggregate.combinedLeakHigh,
    estimatedCombinedLeakRate,
    lostLeadsPerMonthLow: lostLeadsLowR,
    lostLeadsPerMonthHigh: lostLeadsHighR,
    estimatedLostLeadsPerMonth,
    lostJobsPerMonthLow: lostJobsLowR,
    lostJobsPerMonthHigh: lostJobsHighR,
    estimatedLostJobsPerMonth,
    assumptionsExplanation: `Inputs used: $${assumptions.averageJobValue.toLocaleString()} avg job value, ${Math.round(
      assumptions.closeRate * 100
    )}% close rate, ${assumptions.estimatedMonthlyLeads} monthly leads at risk = $${Math.round(
      aggregate.addressableMonthlyRevenue
    ).toLocaleString()} addressable monthly revenue. With the ${findings.length} detected issue${
      findings.length === 1 ? "" : "s"
    }, the combined leak is ~${estLeakPct}% of monthly leads (~${estimatedLostLeadsPerMonth} leads / ~${estimatedLostJobsPerMonth} jobs per month, midpoint estimates). Issues use funnel math with overlap damping; combined leak is capped at about half of addressable revenue. The headline $/mo tilts toward the lower end of the estimate band.`,
    fixFirstRecommendation: fixFirst,
  };
}

function buildActionPlan(findings: AuditFinding[]): ActionPlanItem[] {
  return findings.map((f, index) => ({
    fix: f.recommendedFix,
    impact:
      f.severity === "Critical" || f.leakRateHigh >= 0.15
        ? "High"
        : f.severity === "High" || f.leakRateHigh >= 0.08
          ? "Medium"
          : "Low",
    difficulty: index < 2 ? "Low" : index < 6 ? "Medium" : "High",
    timeline: index < 2 ? "This week" : index < 6 ? "Next 30 days" : "60-90 days",
    expectedBenefit: f.whyItMatters,
  }));
}

export const COMPETITOR_MAP_LOCAL_RADIUS_MILES = 45;

const WIDENED_COMPETITOR_MAP_RADIUS_MILES = COMPETITOR_MAP_LOCAL_RADIUS_MILES * 2;
/** Keep at least this many competitor pins when possible before widening radius or showing all. */
const MIN_LOCAL_COMPETITOR_MARKERS = 3;

function buildCompetitorMapPointsForRadius(
  business: BusinessProfile,
  competitors: Competitor[],
  maxDistanceMiles: number | null
): CompetitorMapPoint[] {
  const points: CompetitorMapPoint[] = [];
  if (business.coordinates) {
    points.push({
      id: business.placeId,
      name: business.name,
      address: business.address,
      coordinates: business.coordinates,
      rating: business.rating,
      reviewCount: business.reviewCount,
      marketStrengthScore: 100,
      rank: null,
      isSelectedBusiness: true,
      types: business.types,
      iconBackgroundColor: business.iconBackgroundColor,
      iconMaskBaseUri: business.iconMaskBaseUri,
    });
  }
  const hasAnchor = Boolean(business.coordinates);
  for (const c of competitors) {
    if (!c.coordinates) continue;
    if (
      hasAnchor &&
      maxDistanceMiles != null &&
      c.distanceMiles != null &&
      c.distanceMiles > maxDistanceMiles
    ) {
      continue;
    }
    points.push({
      id: c.placeId,
      name: c.name,
      address: c.address,
      coordinates: c.coordinates,
      rating: c.rating,
      reviewCount: c.reviewCount,
      marketStrengthScore: c.marketStrengthScore,
      rank: c.rank,
      isSelectedBusiness: false,
      types: c.types,
      iconBackgroundColor: c.iconBackgroundColor,
      iconMaskBaseUri: c.iconMaskBaseUri,
    });
  }
  return points;
}

export function buildCompetitorMapPoints(
  business: BusinessProfile,
  competitors: Competitor[]
): CompetitorMapPoint[] {
  if (!business.coordinates) {
    return buildCompetitorMapPointsForRadius(business, competitors, null);
  }
  let points = buildCompetitorMapPointsForRadius(
    business,
    competitors,
    COMPETITOR_MAP_LOCAL_RADIUS_MILES
  );
  let competitorCount = points.filter((p) => !p.isSelectedBusiness).length;
  if (competitorCount < MIN_LOCAL_COMPETITOR_MARKERS) {
    points = buildCompetitorMapPointsForRadius(
      business,
      competitors,
      WIDENED_COMPETITOR_MAP_RADIUS_MILES
    );
    competitorCount = points.filter((p) => !p.isSelectedBusiness).length;
  }
  if (competitorCount < MIN_LOCAL_COMPETITOR_MARKERS) {
    points = buildCompetitorMapPointsForRadius(business, competitors, null);
  }
  return points;
}

export function scoreAudit(input: BuildInput) {
  const findings = buildFindings(input);
  const scores = computeScores(input);
  const revenueEstimate = buildRevenueEstimate(input.assumptions, findings);
  const moneySummary = buildMoneySummary(input.assumptions, findings);
  const sectionSummaries = buildSectionSummaries(scores, findings);
  const actionPlan = buildActionPlan(findings);
  return {
    scores,
    findings,
    revenueEstimate,
    moneySummary,
    sectionSummaries,
    actionPlan,
    recommendedNextStep:
      "Install a Lead-to-Revenue System to fix these leaks across tracking, follow-up, reviews, referrals, and reporting.",
  };
}
