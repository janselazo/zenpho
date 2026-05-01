export type AuditGrade = "Poor" | "Average" | "Good" | "Excellent";

export type AuditSeverity = "Critical" | "High" | "Medium" | "Low";

export type AuditCategory =
  | "My Business vs Google Competitors"
  | "Google Business Profile"
  | "Reviews & Reputation"
  | "Website Conversion"
  | "Website Trust & Visual Proof"
  | "Tracking & Ads Readiness"
  | "Photo Quality & Quantity"
  | "Local SEO & Market Positioning";

export type Coordinates = {
  lat: number;
  lng: number;
};

export type BusinessReview = {
  authorName: string | null;
  rating: number | null;
  text: string | null;
  publishTime: string | null;
  relativePublishTime: string | null;
  /**
   * Whether a merchant/owner reply exists on this review row when Places returns it.
   * Often omitted by the API.
   */
  hasOwnerReply?: boolean;
};

export type BusinessPhoto = {
  name: string | null;
  widthPx: number | null;
  heightPx: number | null;
  authorAttributions?: string[];
};

export type BusinessIdentityAttribute = {
  id: "latino_owned";
  label: "Identifies as Latino-owned";
  detected: boolean;
  source: "google" | "website" | "mock";
};

export type BusinessProfile = {
  placeId: string;
  name: string;
  address: string | null;
  phone: string | null;
  website: string | null;
  category: string | null;
  /** Google Places category disk color (hex), when returned by the API. */
  iconBackgroundColor: string | null;
  /** Google Places mask base URI (append .png for the mask asset). */
  iconMaskBaseUri: string | null;
  types: string[];
  rating: number | null;
  reviewCount: number | null;
  reviews: BusinessReview[];
  photos: BusinessPhoto[];
  photoCount: number | null;
  coordinates: Coordinates | null;
  hours: string[];
  googleMapsUri: string | null;
  businessStatus: string | null;
  identityAttributes: BusinessIdentityAttribute[];
};

export type BusinessSearchResult = Pick<
  BusinessProfile,
  | "placeId"
  | "name"
  | "address"
  | "category"
  | "rating"
  | "reviewCount"
  | "website"
  | "coordinates"
  | "googleMapsUri"
>;

export type AuditAssumptions = {
  industry: string;
  averageJobValue: number;
  closeRate: number;
  estimatedMonthlyLeads: number;
  serviceArea: string;
  monthlyAdSpend: number | null;
  usingDefaults: string[];
};

export type Competitor = {
  placeId: string;
  name: string;
  address: string | null;
  website: string | null;
  rating: number | null;
  reviewCount: number | null;
  photoCount: number | null;
  category: string | null;
  types: string[];
  iconBackgroundColor: string | null;
  iconMaskBaseUri: string | null;
  coordinates: Coordinates | null;
  marketStrengthScore: number;
  distanceMiles: number | null;
  rank: number | null;
  reviews?: BusinessReview[];
};

export type CompetitorStrengthTheme = {
  theme: string;
  label: string;
  competitorMentions: number;
  ownMentions: number;
  praisedCompetitors: string[];
  exampleQuote: string | null;
};

export type CompetitorStrengthsInsight = {
  themes: CompetitorStrengthTheme[];
  topGap: CompetitorStrengthTheme | null;
  summary: string;
  /**
   * When set with `summaryCompetitorNames` and `summarySuffix`, the UI renders the opening
   * fragment, bold competitor names (comma-separated), then the suffix (should start with `)`).
   */
  summaryPrefix?: string;
  summaryCompetitorNames?: string[];
  summarySuffix?: string;
  recommendation: string;
  warnings: string[];
};

export type CompetitorMapPoint = {
  id: string;
  name: string;
  address: string | null;
  coordinates: Coordinates;
  rating: number | null;
  reviewCount: number | null;
  marketStrengthScore: number;
  rank: number | null;
  isSelectedBusiness: boolean;
  types: string[];
  iconBackgroundColor: string | null;
  iconMaskBaseUri: string | null;
};

export type GoogleLocalRankItem = {
  position: number;
  placeId: string;
  name: string;
  address: string | null;
  rating: number | null;
  reviewCount: number | null;
  category: string | null;
  website: string | null;
  isSelectedBusiness: boolean;
};

export type GoogleLocalRankingSnapshot = {
  query: string;
  location: string;
  topFive: GoogleLocalRankItem[];
  /**
   * Rank within the audited sample by rating, review volume, proximity, and light trust
   * signals — not Google's live local pack ordering.
   */
  selectedBusinessPosition: number | null;
  selectedBusinessRankItem: GoogleLocalRankItem | null;
  /**
   * 1-based index in Google's text-search result order (paginated), when this listing
   * appeared in the fetched pages — otherwise null.
   */
  googleTextSearchPosition: number | null;
  totalResultsChecked: number;
  warnings: string[];
};

export type BrandIdentitySummary = {
  logoUrl: string | null;
  palette: string[];
  primaryColor: string | null;
  accentColor: string | null;
  typographyNotes: string[];
  sourceUrl: string | null;
  brandPresenceSummary: string;
  warnings: string[];
};

/** Heuristic image SEO signals from homepage HTML (<img> scan). */
export type WebsiteImageSeoSummary = {
  /** `<img>` tags with no `alt` attribute at all. */
  missingAltAttribute: number;
  /** Missing, empty, or whitespace-only `alt` unless flagged decorative (role=presentation / aria-hidden). */
  weakOrMissingAlt: number;
  /** No `title` attribute. */
  missingTitle: number;
  /** `src` filename looks generic (short token, hash-like, etc.). */
  genericFilename: number;
  /** Both width and height attributes ≥ 1920 (heavy display hints). */
  largeDeclaredDimensions: number;
  /** Example basenames for evidence strings (capped). */
  genericFilenameSamples: string[];
};

export type WebsiteAudit = {
  url: string | null;
  normalizedUrl: string | null;
  available: boolean;
  status: string;
  screenshotUrl: string | null;
  https: boolean;
  mobileFriendly: boolean | null;
  pageSpeedMobileScore: number | null;
  title: string | null;
  metaDescription: string | null;
  h1: string | null;
  hasViewport: boolean;
  hasPhoneLink: boolean;
  hasPhoneText: boolean;
  /** SMS / WhatsApp / click-to-text style paths detected in homepage HTML. */
  hasTextEnabledPhone: boolean;
  hasPrimaryCta: boolean;
  hasContactForm: boolean;
  hasQuoteCta: boolean;
  hasTestimonials: boolean;
  /** Homepage HTML appears to feature reviews, ratings, or testimonial widgets (social proof on site). */
  homepageFeaturesReviews: boolean;
  hasClientPhotos: boolean;
  hasProjectPhotos: boolean;
  hasBeforeAfter: boolean;
  hasServicePages: boolean;
  hasLocationPages: boolean;
  hasLocalBusinessSchema: boolean;
  hasGoogleAnalytics: boolean;
  hasGoogleTagManager: boolean;
  hasGoogleAdsTag: boolean;
  hasMetaPixel: boolean;
  /** TikTok for Business / TikTok Pixel */
  hasTikTokPixel: boolean;
  /** Microsoft Advertising (Bing) Universal Event Tracking */
  hasBingUet: boolean;
  /** LinkedIn Insight Tag */
  hasLinkedInInsight: boolean;
  /** Pinterest base code / tag */
  hasPinterestPixel: boolean;
  /** X (Twitter) / X Ads pixel */
  hasTwitterPixel: boolean;
  /** Snapchat Pixel */
  hasSnapchatPixel: boolean;
  hasWebChat: boolean;
  webChatProvider: string | null;
  /**
   * Inferred homepage CMS / builder (HTML heuristics). Null when unknown or site not crawled.
   */
  cmsPlatformId: string | null;
  cmsPlatformLabel: string | null;
  socialLinks: {
    facebook: string | null;
    instagram: string | null;
    tiktok: string | null;
    youtube: string | null;
    linkedin: string | null;
    whatsapp: string | null;
  };
  contactLinks: {
    phone: string | null;
    email: string | null;
  };
  identityAttributes: BusinessIdentityAttribute[];
  imageCount: number;
  blurryImageSignals: number;
  /** Null when website HTML was not analyzed. */
  imageSeo: WebsiteImageSeoSummary | null;
  /**
   * Sum of Lighthouse “wasted bytes” from image-related audits (mobile performance run), when available.
   */
  pageSpeedImageWasteBytes: number | null;
  warnings: string[];
};

export type AuditScores = {
  overall: number;
  grade: AuditGrade;
  gbpHealth: number;
  reviews: number;
  websiteConversion: number;
  websiteTrust: number;
  localSeo: number;
  competitorGap: number;
  trackingAds: number;
  photos: number;
};

export type AuditFinding = {
  id: string;
  category: AuditCategory;
  severity: AuditSeverity;
  title: string;
  whatWeFound: string;
  whyItMatters: string;
  evidence: string;
  /**
   * Stand-alone monthly revenue at risk if this single issue was the
   * only leak (low/high band of expected leakRate * addressable revenue).
   */
  estimatedRevenueImpactLow: number;
  estimatedRevenueImpactHigh: number;
  /**
   * Share of monthly leads (0..1) that this issue is expected to leak
   * away. Used to combine multiple findings with funnel math.
   */
  leakRateLow: number;
  leakRateHigh: number;
  recommendedFix: string;
  priorityScore: number;
};

export type RevenueEstimate = {
  averageJobValue: number;
  closeRate: number;
  estimatedMonthlyLeads: number;
  estimatedLostOpportunitiesLow: number;
  estimatedLostOpportunitiesHigh: number;
  potentialRecoveredJobsLow: number;
  potentialRecoveredJobsHigh: number;
  estimatedRevenueLow: number;
  estimatedRevenueHigh: number;
  assumptions: string[];
};

export type FoundIssuesMoneySummary = {
  totalIssues: number;
  severityCounts: Record<AuditSeverity, number>;
  topExpensiveLeaks: AuditFinding[];
  estimatedMonthlyCostLow: number;
  estimatedMonthlyCostHigh: number;
  /** Midpoint of monthly low/high — single headline estimate. */
  estimatedMonthlyCost: number;
  estimatedAnnualCostLow: number;
  estimatedAnnualCostHigh: number;
  /** Midpoint of annual low/high (`estimatedMonthlyCost` × 12). */
  estimatedAnnualCost: number;
  /**
   * Total addressable monthly revenue (estimatedMonthlyLeads * closeRate * averageJobValue).
   * Used as the ceiling for combined leak math.
   */
  addressableMonthlyRevenue: number;
  /** Combined share of monthly leads currently being lost (0..1). */
  combinedLeakRateLow: number;
  combinedLeakRateHigh: number;
  /** Midpoint of combined leak rate (0..1). */
  estimatedCombinedLeakRate: number;
  /** Lost leads per month at low/high band (after combining all findings). */
  lostLeadsPerMonthLow: number;
  lostLeadsPerMonthHigh: number;
  /** Midpoint of lost leads / month. */
  estimatedLostLeadsPerMonth: number;
  /** Lost closed jobs per month at low/high band. */
  lostJobsPerMonthLow: number;
  lostJobsPerMonthHigh: number;
  /** Midpoint of lost jobs / month. */
  estimatedLostJobsPerMonth: number;
  assumptionsExplanation: string;
  fixFirstRecommendation: string;
};

export type SectionProblemSummary = {
  category: AuditCategory;
  score: number;
  grade: AuditGrade;
  issueCount: number;
  summary: string;
  findings: AuditFinding[];
};

export type ActionPlanItem = {
  fix: string;
  impact: "High" | "Medium" | "Low";
  difficulty: "Low" | "Medium" | "High";
  timeline: string;
  expectedBenefit: string;
};

export type RevenueLeakAudit = {
  id: string;
  business: BusinessProfile;
  assumptions: AuditAssumptions;
  competitors: Competitor[];
  competitorMapPoints: CompetitorMapPoint[];
  rankingSnapshot: GoogleLocalRankingSnapshot;
  brandIdentity: BrandIdentitySummary;
  competitorStrengths: CompetitorStrengthsInsight;
  websiteAudit: WebsiteAudit;
  scores: AuditScores;
  findings: AuditFinding[];
  revenueEstimate: RevenueEstimate;
  moneySummary: FoundIssuesMoneySummary;
  sectionSummaries: SectionProblemSummary[];
  actionPlan: ActionPlanItem[];
  recommendedNextStep: string;
  warnings: string[];
  /** ISO-8601 timestamp when this audit snapshot was generated; shown as "Last updated" in the UI and PDF. */
  createdAt: string;
};

export type ServiceResult<T> = {
  data: T;
  warnings: string[];
};
