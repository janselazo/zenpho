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
  return Math.max(0, Math.min(100, Math.round(score)));
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
 * Combine independent leak rates with funnel math:
 *   combinedLeak = 1 - product(1 - r_i)
 * Capped at 0.85 so the model never claims the business is losing
 * effectively all of its addressable revenue.
 */
function combineLeakRates(rates: readonly number[]): number {
  if (rates.length === 0) return 0;
  const survival = rates.reduce(
    (acc, rate) => acc * (1 - clampRate(rate)),
    1
  );
  return Math.min(0.85, 1 - survival);
}

function competitorAverages(competitors: Competitor[]) {
  return {
    rating: avg(competitors.map((c) => c.rating ?? 0).filter(Boolean)),
    reviews: Math.round(avg(competitors.map((c) => c.reviewCount ?? 0))),
    photos: Math.round(avg(competitors.map((c) => c.photoCount ?? 0))),
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
    findings.push(
      finding(
        {
          category: "My Business vs Google Competitors",
          severity:
            rankingSnapshot.selectedBusinessPosition > 15 ? "Critical" : "High",
          title: "Your Business Is Not Showing in the Top Google Positions",
          whatWeFound: `${business.name} appears around position #${rankingSnapshot.selectedBusinessPosition} for "${rankingSnapshot.query}".`,
          whyItMatters:
            "Local buyers often choose from the first few Google Map results, so lower visibility can reduce calls and quote requests.",
          evidence: `Top 5 results are competitors; selected business position: #${rankingSnapshot.selectedBusinessPosition}.`,
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

  if ((business.rating ?? 5) < 4.5 || reviewSentiment.negativeThemes.length > 0) {
    const impact = moneyImpact(assumptions, 0.04, 0.12);
    findings.push(
      finding(
        {
          category: "Reviews & Reputation",
          severity: (business.rating ?? 5) < 4.0 ? "Critical" : "High",
          title: "Review Trust Is Below a Strong Local Standard",
          whatWeFound: `Rating: ${business.rating ?? "not available"}. Negative themes: ${
            reviewSentiment.negativeThemes.join(", ") || "limited sample"
          }.`,
          whyItMatters:
            "Lower rating or repeated complaints can reduce calls from buyers comparing multiple providers.",
          evidence: `Sentiment score: ${reviewSentiment.sentimentScore}/100 from ${reviewSentiment.sampleSize} review samples.`,
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

  if (websiteAudit.blurryImageSignals > 0) {
    const impact = moneyImpact(assumptions, 0.02, 0.06);
    findings.push(
      finding(
        {
          category: "Website Trust & Visual Proof",
          severity: "Medium",
          title: "Website Images May Look Low Quality",
          whatWeFound: `${websiteAudit.blurryImageSignals} image signals look low-resolution or undersized.`,
          whyItMatters:
            "Blurry imagery makes a business feel less premium and can weaken buyer trust.",
          evidence: `${websiteAudit.blurryImageSignals} image tags had small width/height attributes.`,
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

  if (!websiteAudit.hasGoogleAnalytics && !websiteAudit.hasGoogleTagManager) {
    const impact = moneyImpact(assumptions, 0.02, 0.08);
    findings.push(
      finding(
        {
          category: "Tracking & Ads Readiness",
          severity: "Medium",
          title: "No Analytics or Tag Manager Detected",
          whatWeFound: "GA4/GTM tracking was not detected on the homepage.",
          whyItMatters:
            "Without tracking, it is hard to know which channels are producing calls, forms, and jobs.",
          evidence: "No GA4 or GTM script signals detected.",
          estimatedRevenueImpactLow: impact.low,
          estimatedRevenueImpactHigh: impact.high,
          leakRateLow: impact.leakRateLow,
          leakRateHigh: impact.leakRateHigh,
          recommendedFix:
            "Install GTM/GA4 and configure call, form, and quote request conversion events.",
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
          evidence: `GTM detected: yes. GA detected: no.`,
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

  if (websiteAudit.available && !websiteAudit.hasMetaPixel) {
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
          evidence: "fbq()/connect.facebook.net pixel signature not present.",
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
          title: "Some Google Photos Look Low Resolution",
          whatWeFound: "At least one published Google photo was below 500×350 pixels.",
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
  const { business, competitors, websiteAudit, reviewSentiment, photoAnalysis, rankingSnapshot } =
    input;
  const comp = competitorAverages(competitors);
  let gbp = 100;
  if (!business.website) gbp -= 25;
  if (!business.phone) gbp -= 20;
  if (business.hours.length === 0) gbp -= 10;
  if ((business.reviewCount ?? 0) < 20) gbp -= 15;
  if ((business.photoCount ?? 0) < 10) gbp -= 10;
  if ((business.rating ?? 5) < 4.3) gbp -= 15;

  let reviews = reviewSentiment.sentimentScore;
  if (comp.reviews > (business.reviewCount ?? 0) * 2) reviews -= 20;
  if ((business.rating ?? 5) < comp.rating) reviews -= 8;

  let websiteConversion = websiteAudit.available ? 100 : 25;
  if (!websiteAudit.https) websiteConversion -= 15;
  if (!websiteAudit.hasPrimaryCta) websiteConversion -= 25;
  if (!websiteAudit.hasPhoneLink) websiteConversion -= 18;
  if (!websiteAudit.hasContactForm) websiteConversion -= 18;
  if (!websiteAudit.hasQuoteCta) websiteConversion -= 12;
  if (websiteAudit.pageSpeedMobileScore !== null && websiteAudit.pageSpeedMobileScore < 55) {
    websiteConversion -= 15;
  }
  if (!websiteAudit.mobileFriendly) websiteConversion -= 12;
  if (websiteAudit.available && !websiteAudit.hasWebChat) websiteConversion -= 8;

  let websiteTrust = websiteAudit.available ? 100 : 25;
  if (!websiteAudit.hasTestimonials) websiteTrust -= 25;
  if (!websiteAudit.hasProjectPhotos) websiteTrust -= 20;
  if (!websiteAudit.hasClientPhotos) websiteTrust -= 15;
  if (!websiteAudit.hasBeforeAfter) websiteTrust -= 10;
  if (websiteAudit.blurryImageSignals > 0) websiteTrust -= 12;

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

  let trackingAds = 100;
  if (!websiteAudit.hasGoogleAnalytics) trackingAds -= 25;
  if (!websiteAudit.hasGoogleTagManager) trackingAds -= 20;
  if (!websiteAudit.hasGoogleAdsTag) trackingAds -= 20;
  if (!websiteAudit.hasMetaPixel) trackingAds -= 10;

  let photos = 100;
  if (photoAnalysis.hasLowQuantity) photos -= 40;
  if (photoAnalysis.hasLowResolutionSignals) photos -= 20;
  if (photoAnalysis.competitorAveragePhotoCount > photoAnalysis.businessPhotoCount * 2) {
    photos -= 20;
  }

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

function buildRevenueEstimate(
  assumptions: AuditAssumptions,
  findings: AuditFinding[]
): RevenueEstimate {
  const aggregate = aggregateLeak(assumptions, findings);
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
      `Combined leak rate across all detected issues: ${Math.round(
        aggregate.combinedLeakLow * 100
      )}%–${Math.round(aggregate.combinedLeakHigh * 100)}% of monthly leads.`,
      "Multiple leaks are combined with funnel math (1 − product of survival rates) so issues do not double-count and the total is capped at 85% of addressable revenue.",
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
  const fixFirst = findings[0]?.recommendedFix ?? "Install a lead-to-revenue tracking system.";
  const lostLeadsLowR = Math.round(aggregate.lostLeadsLow * 10) / 10;
  const lostLeadsHighR = Math.round(aggregate.lostLeadsHigh * 10) / 10;
  const lostJobsLowR = Math.round(aggregate.lostJobsLow * 10) / 10;
  const lostJobsHighR = Math.round(aggregate.lostJobsHigh * 10) / 10;
  return {
    totalIssues: findings.length,
    severityCounts,
    topExpensiveLeaks,
    estimatedMonthlyCostLow: aggregate.monthlyRevenueLow,
    estimatedMonthlyCostHigh: aggregate.monthlyRevenueHigh,
    estimatedAnnualCostLow: aggregate.monthlyRevenueLow * 12,
    estimatedAnnualCostHigh: aggregate.monthlyRevenueHigh * 12,
    addressableMonthlyRevenue: Math.round(aggregate.addressableMonthlyRevenue),
    combinedLeakRateLow: aggregate.combinedLeakLow,
    combinedLeakRateHigh: aggregate.combinedLeakHigh,
    lostLeadsPerMonthLow: lostLeadsLowR,
    lostLeadsPerMonthHigh: lostLeadsHighR,
    lostJobsPerMonthLow: lostJobsLowR,
    lostJobsPerMonthHigh: lostJobsHighR,
    assumptionsExplanation: `Inputs used: $${assumptions.averageJobValue.toLocaleString()} avg job value, ${Math.round(
      assumptions.closeRate * 100
    )}% close rate, ${assumptions.estimatedMonthlyLeads} monthly leads at risk = $${Math.round(
      aggregate.addressableMonthlyRevenue
    ).toLocaleString()} addressable monthly revenue. With the ${findings.length} detected issue${
      findings.length === 1 ? "" : "s"
    }, the combined leak is ${Math.round(aggregate.combinedLeakLow * 100)}%–${Math.round(
      aggregate.combinedLeakHigh * 100
    )}% of monthly leads (~${lostLeadsLowR}–${lostLeadsHighR} leads / ~${lostJobsLowR}–${lostJobsHighR} jobs per month). Issues are combined with funnel math so they don't double-count, and the total is capped at 85% of addressable revenue.`,
    fixFirstRecommendation: fixFirst,
  };
}

function buildActionPlan(findings: AuditFinding[]): ActionPlanItem[] {
  return findings.slice(0, 6).map((f, index) => ({
    fix: f.recommendedFix,
    impact:
      f.severity === "Critical" || f.leakRateHigh >= 0.15
        ? "High"
        : f.severity === "High" || f.leakRateHigh >= 0.08
          ? "Medium"
          : "Low",
    difficulty: index < 2 ? "Low" : index < 4 ? "Medium" : "High",
    timeline: index < 2 ? "This week" : index < 4 ? "Next 30 days" : "60-90 days",
    expectedBenefit: f.whyItMatters,
  }));
}

export function buildCompetitorMapPoints(
  business: BusinessProfile,
  competitors: Competitor[]
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
    });
  }
  for (const c of competitors) {
    if (!c.coordinates) continue;
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
    });
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
