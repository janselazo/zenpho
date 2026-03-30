export type IndustryId =
  | "tech"
  | "automotive"
  | "healthcare"
  | "real_estate"
  | "professional_services"
  | "ecommerce";

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
] as const;

const INDUSTRY_IDS = new Set<string>(INDUSTRIES.map((i) => i.id));

export function isIndustryId(value: string): value is IndustryId {
  return INDUSTRY_IDS.has(value);
}

export function getIndustry(id: IndustryId): Industry | undefined {
  return INDUSTRIES.find((i) => i.id === id);
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
};
