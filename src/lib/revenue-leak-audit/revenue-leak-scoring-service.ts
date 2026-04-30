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
};

const CATEGORIES: AuditCategory[] = [
  "Business vs Google Competitors",
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

function moneyImpact(
  assumptions: AuditAssumptions,
  lowLift: number,
  highLift: number
): { low: number; high: number; lostLow: number; lostHigh: number; jobsLow: number; jobsHigh: number } {
  const lostLow = assumptions.estimatedMonthlyLeads * lowLift;
  const lostHigh = assumptions.estimatedMonthlyLeads * highLift;
  const jobsLow = lostLow * assumptions.closeRate;
  const jobsHigh = lostHigh * assumptions.closeRate;
  return {
    low: Math.round(jobsLow * assumptions.averageJobValue),
    high: Math.round(jobsHigh * assumptions.averageJobValue),
    lostLow,
    lostHigh,
    jobsLow,
    jobsHigh,
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

function competitorAverages(competitors: Competitor[]) {
  return {
    rating: avg(competitors.map((c) => c.rating ?? 0).filter(Boolean)),
    reviews: Math.round(avg(competitors.map((c) => c.reviewCount ?? 0))),
    photos: Math.round(avg(competitors.map((c) => c.photoCount ?? 0))),
  };
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
  } = input;
  const comp = competitorAverages(competitors);
  const findings: AuditFinding[] = [];
  let i = 1;

  if (comp.reviews > (business.reviewCount ?? 0) * 2 && comp.reviews > 25) {
    const impact = moneyImpact(assumptions, 0.05, 0.15);
    findings.push(
      finding(
        {
          category: "Business vs Google Competitors",
          severity: "High",
          title: "Competitors Have Significantly More Google Reviews",
          whatWeFound: `${business.name} has ${business.reviewCount ?? 0} reviews. Top competitors average ${comp.reviews} reviews.`,
          whyItMatters:
            "More Google reviews usually increase trust and conversion from Google Maps traffic.",
          evidence: `Competitor review average: ${comp.reviews}. Business review count: ${business.reviewCount ?? 0}.`,
          estimatedRevenueImpactLow: impact.low,
          estimatedRevenueImpactHigh: impact.high,
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
          category: "Business vs Google Competitors",
          severity:
            rankingSnapshot.selectedBusinessPosition > 15 ? "Critical" : "High",
          title: "Your Business Is Not Showing in the Top Google Positions",
          whatWeFound: `${business.name} appears around position #${rankingSnapshot.selectedBusinessPosition} for "${rankingSnapshot.query}".`,
          whyItMatters:
            "Local buyers often choose from the first few Google Map results, so lower visibility can reduce calls and quote requests.",
          evidence: `Top 5 results are competitors; selected business position: #${rankingSnapshot.selectedBusinessPosition}.`,
          estimatedRevenueImpactLow: impact.low,
          estimatedRevenueImpactHigh: impact.high,
          recommendedFix:
            "Improve local SEO signals: category relevance, review velocity, photos, service pages, location content, and Google profile completeness.",
          priorityScore: 95,
        },
        i++
      )
    );
  }

  if (!business.website) {
    const impact = moneyImpact(assumptions, 0.06, 0.18);
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
          recommendedFix: "Add and verify the correct primary call number in Google Business Profile.",
          priorityScore: 90,
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
          recommendedFix:
            "Request fresh positive reviews, respond to unhappy customers, and fix recurring complaint patterns.",
          priorityScore: 86,
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
          recommendedFix:
            "Add a short quote request form with name, phone, service needed, and preferred time.",
          priorityScore: 87,
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
          recommendedFix:
            "Add testimonials, Google review highlights, client/project photos, team photos, and before/after examples.",
          priorityScore: 89,
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
          recommendedFix:
            "Install GTM/GA4 and configure call, form, and quote request conversion events.",
          priorityScore: 72,
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
          recommendedFix:
            "Connect Google Ads conversion tracking, call tracking, and landing page events through GTM.",
          priorityScore: 84,
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
          recommendedFix:
            "Create service pages and location/service-area pages tied to the highest-value jobs.",
          priorityScore: 74,
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
    case "Business vs Google Competitors":
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

function sectionSummaryText(category: AuditCategory, findings: AuditFinding[]): string {
  if (findings.length === 0) return "No major issues found in this section.";
  const highest = findings[0];
  return `${findings.length} issue${findings.length === 1 ? "" : "s"} found. Highest priority: ${highest.title}.`;
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

function buildRevenueEstimate(
  assumptions: AuditAssumptions,
  findings: AuditFinding[]
): RevenueEstimate {
  const monthlyLow = Math.max(...findings.map((f) => f.estimatedRevenueImpactLow), 0);
  const monthlyHigh = Math.max(...findings.map((f) => f.estimatedRevenueImpactHigh), 0);
  const estimatedLostOpportunitiesLow =
    assumptions.averageJobValue * assumptions.closeRate > 0
      ? monthlyLow / (assumptions.averageJobValue * assumptions.closeRate)
      : 0;
  const estimatedLostOpportunitiesHigh =
    assumptions.averageJobValue * assumptions.closeRate > 0
      ? monthlyHigh / (assumptions.averageJobValue * assumptions.closeRate)
      : 0;
  return {
    averageJobValue: assumptions.averageJobValue,
    closeRate: assumptions.closeRate,
    estimatedMonthlyLeads: assumptions.estimatedMonthlyLeads,
    estimatedLostOpportunitiesLow: Math.round(estimatedLostOpportunitiesLow),
    estimatedLostOpportunitiesHigh: Math.round(estimatedLostOpportunitiesHigh),
    potentialRecoveredJobsLow: Math.round(estimatedLostOpportunitiesLow * assumptions.closeRate * 10) / 10,
    potentialRecoveredJobsHigh: Math.round(estimatedLostOpportunitiesHigh * assumptions.closeRate * 10) / 10,
    estimatedRevenueLow: monthlyLow,
    estimatedRevenueHigh: monthlyHigh,
    assumptions: [
      `Estimated average job value: $${assumptions.averageJobValue.toLocaleString()}`,
      `Estimated close rate: ${Math.round(assumptions.closeRate * 100)}%`,
      `Estimated monthly leads at risk: ${assumptions.estimatedMonthlyLeads}`,
      "Money-loss estimates use conservative recovery ranges for what the business may keep losing if the issues are not fixed.",
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
  const monthlyLow = Math.max(...topExpensiveLeaks.map((f) => f.estimatedRevenueImpactLow), 0);
  const monthlyHigh = Math.max(...topExpensiveLeaks.map((f) => f.estimatedRevenueImpactHigh), 0);
  const fixFirst = findings[0]?.recommendedFix ?? "Install a lead-to-revenue tracking system.";
  return {
    totalIssues: findings.length,
    severityCounts,
    topExpensiveLeaks,
    estimatedMonthlyCostLow: monthlyLow,
    estimatedMonthlyCostHigh: monthlyHigh,
    estimatedAnnualCostLow: monthlyLow * 12,
    estimatedAnnualCostHigh: monthlyHigh * 12,
    assumptionsExplanation: `Money-loss estimates use an estimated average job value of $${assumptions.averageJobValue.toLocaleString()}, ${Math.round(
      assumptions.closeRate * 100
    )}% close rate, ${assumptions.estimatedMonthlyLeads} monthly leads at risk, and conservative recovery assumptions for what the business may keep losing if these issues are not fixed.`,
    fixFirstRecommendation: fixFirst,
  };
}

function buildActionPlan(findings: AuditFinding[]): ActionPlanItem[] {
  return findings.slice(0, 6).map((f, index) => ({
    fix: f.recommendedFix,
    impact:
      f.estimatedRevenueImpactHigh > 5000 || f.severity === "Critical"
        ? "High"
        : f.severity === "High"
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
