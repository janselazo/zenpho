export type LocalServicePricingPlan = {
  id: string;
  title: string;
  /** Bold price line shown in comparison header */
  priceLead: string;
  /** Optional subdued second line (e.g. ad spend note) */
  priceNote?: string;
  summary: string;
  /** Legacy field — comparison matrix is primary UI; keep empty or short notes for exports. */
  included: string[];
  bestFor: string[];
  outcome: string;
  ctaLabel: string;
  ctaHref: string;
  /** Shown under plan title in comparison header (inheritance messaging). */
  headerNote?: string;
  /** Emphasize as recommended tier */
  featured?: boolean;
};

/** Zenpho web app & workflows — same foundation on every plan. */
export const platformIncludedInAllPlans = [
  {
    label: "Lead management — capture, stage, and follow up in one workspace",
    tooltip:
      "One workspace for inbound leads: stages, owners, tasks, and follow-up cadences so opportunities don't stall.",
  },
  {
    label: "Appointments — pipeline visibility and booking tied to your leads",
    tooltip:
      "See what's booked, tie appointments back to leads, and keep your pipeline visible end to end.",
  },
  {
    label: "Reviews — request, monitor, and grow your reputation",
    tooltip:
      "Request reviews on a steady rhythm, monitor new feedback, and use workflows to grow rating and volume.",
  },
  {
    label: "Referrals — track sources and grow referral revenue",
    tooltip:
      "Know who refers work, measure referral revenue, and nurture relationships that compound over time.",
  },
] as const;

export const localServicePricingPlans: LocalServicePricingPlan[] = [
  {
    id: "setup",
    title: "Development",
    priceLead: "$1,000 one-time",
    headerNote: "Zenpho platform on every plan.",
    summary: "",
    included: [],
    bestFor: [
      "Businesses establishing or refreshing their digital presence",
      "Owners who want GBP, email, and hosting handled before scaling paid media",
      "Teams prioritizing a solid base over multi-channel ads",
    ],
    outcome:
      "You launch with a professional site and local footprint, email on your domain, foundational SEO, reliable hosting, and the Zenpho workspace for leads through referrals.",
    ctaLabel: "Book Call",
    ctaHref: "/booking",
  },
  {
    id: "growth-engine",
    title: "Growth",
    priceLead: "$2,000/month",
    priceNote: "Plus ad spend",
    featured: true,
    headerNote: "Includes Development.",
    summary: "",
    included: [],
    bestFor: [
      "Businesses ready to invest consistently in Meta and organic visibility",
      "Teams that want creatives and SEO cadence without Google Search ads yet",
      "Owners who need predictable pipeline beyond referrals alone",
    ],
    outcome:
      "You attract qualified demand through Meta and ongoing SEO while your Development foundation and Zenpho platform keep follow-up, reviews, and referrals measurable.",
    ctaLabel: "Start Growth",
    ctaHref: "/booking",
  },
  {
    id: "full-partner",
    title: "Scale",
    priceLead: "$3,000/month",
    priceNote: "Plus ad spend",
    headerNote: "Everything in Growth.",
    summary: "",
    included: [],
    bestFor: [
      "Businesses scaling spend across Meta and Google with tight coordination",
      "Competitive markets where search intent and social prospecting both matter",
      "Teams that want one operating rhythm across channels and reporting",
    ],
    outcome:
      "You run coordinated Meta and Google programs on top of Development deliverables and Growth services, with Zenpho tying spend to pipeline and revenue.",
    ctaLabel: "Talk to us",
    ctaHref: "/booking",
  },
];
