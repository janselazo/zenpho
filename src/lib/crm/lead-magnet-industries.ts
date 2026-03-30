export type IndustryId = "tech" | "ecommerce" | "automotive";

/** Allowlisted niches (globally unique ids). */
export type NicheId =
  | "tech_vertical_ai_saas_agents"
  | "tech_fintech"
  | "tech_blockchain"
  | "tech_cybersecurity"
  | "tech_edutech"
  | "ecom_pet_supplies"
  | "ecom_home_goods"
  | "ecom_apparel_accessories"
  | "ecom_hobby_craft"
  | "ecom_home_fitness"
  | "ecom_beauty_personal_care"
  | "auto_dealerships_retail"
  | "auto_fleet_commercial"
  | "auto_parts_aftermarket"
  | "auto_service_repair"
  | "auto_ev_charging";

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
    label: "Technology",
    synonyms: ["SaaS", "software", "startup", "B2B tech"],
  },
  {
    id: "ecommerce",
    label: "Ecommerce",
    synonyms: ["DTC", "retail", "Shopify", "online store"],
  },
  {
    id: "automotive",
    label: "Automotive",
    synonyms: ["car dealer", "auto", "fleet", "dealership"],
  },
] as const;

export const LEAD_MAGNET_NICHES: readonly NicheDefinition[] = [
  {
    id: "tech_vertical_ai_saas_agents",
    label: "Vertical AI SaaS & Agents",
    searchTerms:
      "vertical AI SaaS AI agents B2B software PLG enterprise automation lead magnet",
    industries: ["tech"],
  },
  {
    id: "tech_fintech",
    label: "Fintech",
    searchTerms:
      "fintech B2B payments banking lending wealth neobank lead magnet calculator",
    industries: ["tech"],
  },
  {
    id: "tech_blockchain",
    label: "Blockchain",
    searchTerms:
      "blockchain enterprise crypto web3 infrastructure B2B lead magnet",
    industries: ["tech"],
  },
  {
    id: "tech_cybersecurity",
    label: "Cybersecurity",
    searchTerms:
      "cybersecurity B2B security software SOC2 compliance risk assessment lead magnet",
    industries: ["tech"],
  },
  {
    id: "tech_edutech",
    label: "EduTech",
    searchTerms:
      "EdTech education technology LMS K-12 higher ed corporate training B2B lead magnet",
    industries: ["tech"],
  },
  {
    id: "ecom_pet_supplies",
    label: "Pet Supplies",
    searchTerms:
      "pet supplies DTC ecommerce pet food accessories subscription lead magnet",
    industries: ["ecommerce"],
  },
  {
    id: "ecom_home_goods",
    label: "Home & Goods",
    searchTerms:
      "home goods decor furniture DTC ecommerce lead magnet calculator",
    industries: ["ecommerce"],
  },
  {
    id: "ecom_apparel_accessories",
    label: "Apparel & Accessories",
    searchTerms:
      "apparel fashion accessories DTC ecommerce clothing lead magnet",
    industries: ["ecommerce"],
  },
  {
    id: "ecom_hobby_craft",
    label: "Hobby & Craft",
    searchTerms:
      "hobby craft maker supplies DTC ecommerce lead magnet",
    industries: ["ecommerce"],
  },
  {
    id: "ecom_home_fitness",
    label: "Home Fitness",
    searchTerms:
      "home fitness equipment workout DTC ecommerce wellness lead magnet",
    industries: ["ecommerce"],
  },
  {
    id: "ecom_beauty_personal_care",
    label: "Beauty & Personal Care",
    searchTerms:
      "beauty skincare personal care cosmetics DTC ecommerce lead magnet",
    industries: ["ecommerce"],
  },
  {
    id: "auto_dealerships_retail",
    label: "Dealerships & retail",
    searchTerms:
      "car dealership new used vehicle retail showroom digital retail lead magnet",
    industries: ["automotive"],
  },
  {
    id: "auto_fleet_commercial",
    label: "Fleet & commercial",
    searchTerms:
      "commercial fleet vehicle management leasing telematics B2B lead magnet",
    industries: ["automotive"],
  },
  {
    id: "auto_parts_aftermarket",
    label: "Parts & aftermarket",
    searchTerms:
      "auto parts aftermarket wholesale distribution B2B lead magnet",
    industries: ["automotive"],
  },
  {
    id: "auto_service_repair",
    label: "Service & repair",
    searchTerms:
      "auto repair shop service center fixed ops scheduling B2B lead magnet",
    industries: ["automotive"],
  },
  {
    id: "auto_ev_charging",
    label: "EV & charging",
    searchTerms:
      "electric vehicle EV charging infrastructure dealership fleet B2B lead magnet",
    industries: ["automotive"],
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

/** First niche for an industry (used when switching industry or omitting niche in API). */
export function defaultNicheForIndustry(industryId: IndustryId): NicheId {
  const list = getNichesForIndustry(industryId);
  const first = list[0]?.id;
  if (!first) {
    throw new Error(`No niches configured for industry: ${industryId}`);
  }
  return first;
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

/** Same three query shapes; appends niche `searchTerms` for long-tail context */
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

/** When APIs are unavailable — minimal dev / degraded UX (per industry only). */
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
};
