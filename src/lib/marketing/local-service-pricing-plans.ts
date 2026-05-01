export type LocalServicePricingPlan = {
  id: string;
  title: string;
  price: string;
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

export const localServicePricingIntro = {
  eyebrow: "Pricing",
  headline: "Development, Growth & Scale",
  subtitle:
    "Growth and Scale are monthly management retainers. Advertising budgets are paid directly to Meta and Google and are billed separately.",
};

/** Zenpho web app & workflows — same foundation on every plan. */
export const platformIncludedInAllPlans = [
  "Lead management — capture, stage, and follow up in one workspace",
  "Appointments — pipeline visibility and booking tied to your leads",
  "Reviews — request, monitor, and grow your reputation",
  "Referrals — track sources and grow referral revenue",
] as const;

export const localServicePricingPlans: LocalServicePricingPlan[] = [
  {
    id: "setup",
    title: "Development",
    price: "$1,000 one-time",
    headerNote: "Zenpho platform included on every plan.",
    summary:
      "Credibility and discoverability: website development, Google Business Profile setup, business email, foundational SEO, hosting and support, and optional branding.",
    included: [],
    bestFor: [
      "Businesses establishing or refreshing their digital presence",
      "Owners who want GBP, email, and hosting handled before scaling paid media",
      "Teams prioritizing a solid base over multi-channel ads",
    ],
    outcome:
      "You launch with a professional site and local footprint, email on your domain, foundational SEO, reliable hosting, and the Zenpho workspace for leads through referrals.",
    ctaLabel: "Book development call",
    ctaHref: "/booking",
  },
  {
    id: "growth-engine",
    title: "Growth",
    price: "$2,000/month + ad spend",
    featured: true,
    headerNote: "Includes everything in Development.",
    summary:
      "Everything in Development, plus Meta (Facebook & Instagram) ads, Performance Creatives, and ongoing SEO services—managed with clear attribution in Zenpho.",
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
    price: "$3,000/month + ad spend",
    headerNote: "Includes everything in Growth (and Development).",
    summary:
      "Everything in Growth, plus Google Ads (Search and Performance Max) for full-funnel demand—ideal when you are ready to compete on search and social together.",
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
