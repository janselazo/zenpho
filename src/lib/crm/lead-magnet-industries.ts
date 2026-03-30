export type IndustryId =
  | "tech"
  | "automotive"
  | "healthcare"
  | "real_estate"
  | "professional_services"
  | "ecommerce"
  | "hospitality"
  | "education"
  | "fintech"
  | "manufacturing"
  | "construction"
  | "insurance"
  | "nonprofit"
  | "media_marketing";

/** Allowlisted niches (globally unique ids). */
export type NicheId =
  | "vertical_broad"
  | "entertainment_music"
  | "entertainment_film"
  | "entertainment_gaming"
  | "tech_ai_saas"
  | "tech_devtools"
  | "healthcare_dental"
  | "fintech_payments"
  | "ecommerce_subscription"
  | "hospitality_hotels"
  | "education_k12_higher"
  | "construction_residential"
  | "nonprofit_fundraising";

export type NicheDefinition = {
  id: NicheId;
  label: string;
  /** Appended to Serper queries when non-empty */
  searchTerms: string;
  industries: readonly IndustryId[];
};

export type LeadMagnetFormat =
  | "Calculator"
  | "Template"
  | "Assessment"
  | "Toolkit"
  | "Other";

export type LeadMagnetIdea = {
  title: string;
  description: string;
  format: LeadMagnetFormat;
  angle?: string;
};

export type Industry = {
  id: IndustryId;
  label: string;
  /** Extra keywords for search queries */
  synonyms: string[];
};

export const INDUSTRIES: readonly Industry[] = [
  {
    id: "tech",
    label: "Technology / SaaS",
    synonyms: ["SaaS", "software", "startup", "product"],
  },
  {
    id: "automotive",
    label: "Automotive",
    synonyms: ["car dealer", "auto", "fleet", "dealership"],
  },
  {
    id: "healthcare",
    label: "Healthcare",
    synonyms: ["clinic", "medical", "dental", "wellness"],
  },
  {
    id: "real_estate",
    label: "Real estate",
    synonyms: ["realtor", "property", "broker", "mortgage"],
  },
  {
    id: "professional_services",
    label: "Professional services",
    synonyms: ["consulting", "legal", "accounting", "agency"],
  },
  {
    id: "ecommerce",
    label: "E‑commerce / DTC",
    synonyms: ["DTC", "retail", "Shopify", "online store"],
  },
  {
    id: "hospitality",
    label: "Hospitality & restaurants",
    synonyms: ["hotel", "restaurant", "catering", "venue"],
  },
  {
    id: "education",
    label: "Education & training",
    synonyms: ["edtech", "LMS", "online courses", "corporate training"],
  },
  {
    id: "fintech",
    label: "Fintech & banking",
    synonyms: ["payments", "lending", "wealth", "neobank"],
  },
  {
    id: "manufacturing",
    label: "Manufacturing & supply chain",
    synonyms: ["industrial", "factory", "logistics", "B2B parts"],
  },
  {
    id: "construction",
    label: "Construction & trades",
    synonyms: ["contractor", "home builder", "HVAC", "electrical"],
  },
  {
    id: "insurance",
    label: "Insurance",
    synonyms: ["broker", "carrier", "claims", "agency"],
  },
  {
    id: "nonprofit",
    label: "Nonprofit & associations",
    synonyms: ["NGO", "foundation", "501c3", "membership org"],
  },
  {
    id: "media_marketing",
    label: "Media & performance marketing",
    synonyms: ["publisher", "ad agency", "creator economy", "performance ads"],
  },
] as const;

export const ALL_INDUSTRY_IDS: readonly IndustryId[] = INDUSTRIES.map(
  (i) => i.id
);

export const DEFAULT_NICHE_ID: NicheId = "vertical_broad";

export const LEAD_MAGNET_NICHES: readonly NicheDefinition[] = [
  {
    id: "vertical_broad",
    label: "Full vertical (broad)",
    searchTerms: "",
    industries: ALL_INDUSTRY_IDS,
  },
  {
    id: "entertainment_music",
    label: "Music",
    searchTerms:
      "music industry labels streaming touring artists rights B2B lead magnet",
    industries: ["media_marketing"],
  },
  {
    id: "entertainment_film",
    label: "Film & TV",
    searchTerms:
      "film TV production studio distribution streaming B2B marketing tool",
    industries: ["media_marketing"],
  },
  {
    id: "entertainment_gaming",
    label: "Gaming & esports",
    searchTerms:
      "gaming esports publisher studio UA creator economy B2B",
    industries: ["media_marketing"],
  },
  {
    id: "tech_ai_saas",
    label: "AI & SaaS",
    searchTerms:
      "AI SaaS PLG enterprise sales automation B2B software",
    industries: ["tech"],
  },
  {
    id: "tech_devtools",
    label: "Devtools & infra",
    searchTerms:
      "developer tools API infrastructure observability DX B2B",
    industries: ["tech"],
  },
  {
    id: "healthcare_dental",
    label: "Dental",
    searchTerms:
      "dental practice DSO patient acquisition scheduling B2B",
    industries: ["healthcare"],
  },
  {
    id: "fintech_payments",
    label: "Payments & cards",
    searchTerms:
      "payments card issuing acquiring SMB merchant B2B fintech",
    industries: ["fintech"],
  },
  {
    id: "ecommerce_subscription",
    label: "Subscription & retention",
    searchTerms:
      "subscription box DTC retention churn LTV email B2B",
    industries: ["ecommerce"],
  },
  {
    id: "hospitality_hotels",
    label: "Hotels & lodging",
    searchTerms:
      "hotel lodging RevPAR direct booking OTA B2B hospitality",
    industries: ["hospitality"],
  },
  {
    id: "education_k12_higher",
    label: "K‑12 & higher ed",
    searchTerms:
      "K-12 higher education LMS admissions enrollment B2B edtech",
    industries: ["education"],
  },
  {
    id: "construction_residential",
    label: "Residential & remodel",
    searchTerms:
      "residential remodel home builder contractor lead gen B2B",
    industries: ["construction"],
  },
  {
    id: "nonprofit_fundraising",
    label: "Fundraising & grants",
    searchTerms:
      "nonprofit fundraising grant writing donor CRM B2B",
    industries: ["nonprofit"],
  },
];

const INDUSTRY_IDS = new Set<string>(INDUSTRIES.map((i) => i.id));
const NICHE_IDS = new Set<string>(LEAD_MAGNET_NICHES.map((n) => n.id));

export function isIndustryId(value: string): value is IndustryId {
  return INDUSTRY_IDS.has(value);
}

export function getIndustry(id: IndustryId): Industry | undefined {
  return INDUSTRIES.find((i) => i.id === id);
}

export function isNicheId(value: string): value is NicheId {
  return NICHE_IDS.has(value);
}

export function getNiche(id: NicheId): NicheDefinition | undefined {
  return LEAD_MAGNET_NICHES.find((n) => n.id === id);
}

export function nicheAllowedForIndustry(
  nicheId: NicheId,
  industryId: IndustryId
): boolean {
  const n = getNiche(nicheId);
  return Boolean(n?.industries.includes(industryId));
}

export function getNichesForIndustry(
  industryId: IndustryId
): readonly NicheDefinition[] {
  return LEAD_MAGNET_NICHES.filter((n) => n.industries.includes(industryId));
}

/** Parallel Serper queries: Reddit, broad web, niche long-tail */
export function searchQueriesForIndustry(id: IndustryId): string[] {
  const ind = getIndustry(id);
  if (!ind) return [];
  const core = ind.label.replace(/\s*\/\s*/g, " ");
  const syn = ind.synonyms[0] ?? core;

  return [
    `site:reddit.com lead magnet OR gated content OR free tool ${core} B2B`,
    `${core} ${syn} lead magnet calculator template interactive tool`,
    `${syn} niche B2B marketing tool audit scorecard checklist template calculator`,
  ];
}

/** Same three query shapes; appends niche `searchTerms` when not broad */
export function searchQueriesForIndustryAndNiche(
  industryId: IndustryId,
  nicheId: NicheId
): string[] {
  const base = searchQueriesForIndustry(industryId);
  const niche = getNiche(nicheId);
  const extra = niche?.searchTerms.trim() ?? "";
  if (!extra) return base;
  return base.map((q) => `${q} ${extra}`.trim());
}

/** When APIs are unavailable — minimal dev / degraded UX */
export const FALLBACK_IDEAS_BY_INDUSTRY: Record<IndustryId, LeadMagnetIdea[]> = {
  tech: [
    {
      title: "MVP build vs buy calculator",
      description:
        "Interactive estimator for founders comparing internal build cost, timeline, and agency partnership.",
      format: "Calculator",
      angle: "Qualifies technical buyers early.",
    },
    {
      title: "Product roadmap template (Notion / Sheets)",
      description:
        "Downloadable template with phases, milestones, and stakeholder views — gated behind email.",
      format: "Template",
    },
  ],
  automotive: [
    {
      title: "Lease vs finance comparison calculator",
      description:
        "Dealer-branded calculator with taxes, mileage, and residual assumptions for showroom and web.",
      format: "Calculator",
    },
    {
      title: "Trade-in value estimator",
      description:
        "Lightweight estimator tied to your acquisition ranges; captures lead for appraisal follow-up.",
      format: "Assessment",
    },
  ],
  healthcare: [
    {
      title: "Patient no-show cost calculator",
      description:
        "Shows revenue lost from missed appointments — positions scheduling or reminder solutions.",
      format: "Calculator",
    },
    {
      title: "HIPAA-ready vendor checklist",
      description:
        "PDF or interactive checklist for practices evaluating new software vendors.",
      format: "Toolkit",
    },
  ],
  real_estate: [
    {
      title: "Buyer affordability snapshot",
      description:
        "Simple calculator: income, debts, down payment → rough buying power + lender CTA.",
      format: "Calculator",
    },
    {
      title: "Listing prep scorecard",
      description:
        "Sellers rate staging, photos, pricing — score + tips; captures listing intent.",
      format: "Assessment",
    },
  ],
  professional_services: [
    {
      title: "Engagement scoping worksheet",
      description:
        "Structured worksheet for prospects to define goals, budget band, and timeline before a discovery call.",
      format: "Template",
    },
    {
      title: "ROI of outsourcing calculator",
      description:
        "Compare in-house loaded cost vs. agency engagement for a typical initiative.",
      format: "Calculator",
    },
  ],
  ecommerce: [
    {
      title: "Shipping & margin impact calculator",
      description:
        "Model carrier changes, free-shipping thresholds, and net margin — DTC lead magnet.",
      format: "Calculator",
    },
    {
      title: "Email capture pop-up copy + A/B planner",
      description:
        "Template pack for headline/offer tests with simple scoring rubric.",
      format: "Toolkit",
    },
  ],
  hospitality: [
    {
      title: "Labor cost vs. covers calculator",
      description:
        "Operators plug in shifts, wages, and average check to stress-test staffing and menu pricing.",
      format: "Calculator",
    },
    {
      title: "Private events & catering intake template",
      description:
        "Structured form for headcount, dietary needs, and budget — routes to your sales inbox.",
      format: "Template",
    },
  ],
  education: [
    {
      title: "Course launch readiness scorecard",
      description:
        "Creators and L&D teams rate curriculum, tech stack, and distribution — surfaces gaps before go-live.",
      format: "Assessment",
    },
    {
      title: "Learner completion & cohort ROI worksheet",
      description:
        "Spreadsheet template tying enrollment, completion, and outcomes to program investment.",
      format: "Template",
    },
  ],
  fintech: [
    {
      title: "Payment stack total cost of ownership calculator",
      description:
        "Compare processors, interchange, and SaaS fees for a given monthly volume — great for SMB outreach.",
      format: "Calculator",
    },
    {
      title: "Vendor security & SOC2 readiness checklist",
      description:
        "Gated checklist for startups evaluating what buyers ask in enterprise sales.",
      format: "Toolkit",
    },
  ],
  manufacturing: [
    {
      title: "Downtime cost estimator",
      description:
        "Rough hourly loss from line stoppage — positions maintenance, IoT, or MES conversations.",
      format: "Calculator",
    },
    {
      title: "Supplier scorecard template",
      description:
        "Rate on-time delivery, quality, and responsiveness; export for quarterly business reviews.",
      format: "Template",
    },
  ],
  construction: [
    {
      title: "Change-order impact calculator",
      description:
        "Simple model: extra scope → labor, materials, schedule slip — for GCs and specialty trades.",
      format: "Calculator",
    },
    {
      title: "Job-site safety walkthrough checklist (digital)",
      description:
        "Mobile-friendly checklist with photo prompts; lead capture for compliance or training tools.",
      format: "Toolkit",
    },
  ],
  insurance: [
    {
      title: "Coverage gap self-assessment",
      description:
        "Consumers or SMBs answer a few questions; output highlights common gaps with broker CTA.",
      format: "Assessment",
    },
    {
      title: "Renewal comparison worksheet",
      description:
        "Side-by-side limits, deductibles, and premiums — positions your quoting workflow.",
      format: "Template",
    },
  ],
  nonprofit: [
    {
      title: "Grant readiness scorecard",
      description:
        "Nonprofits rate impact data, board engagement, and financials — surfaces consulting or CRM needs.",
      format: "Assessment",
    },
    {
      title: "Donor stewardship email sequence template",
      description:
        "3–5 email outline for year-end or campaign follow-up; gated content for development directors.",
      format: "Template",
    },
  ],
  media_marketing: [
    {
      title: "Creative fatigue & refresh planner",
      description:
        "Track hook angles, formats, and spend by ad set — when to rotate before CPA spikes.",
      format: "Template",
    },
    {
      title: "Channel mix budget allocator",
      description:
        "Interactive sliders for paid social, search, and creator spend against a monthly cap.",
      format: "Calculator",
    },
  ],
};
