export type LocalServicePricingPlan = {
  id: string;
  title: string;
  /** Short subtitle under the title in the comparison header */
  planTagline?: string;
  /** Bold price line shown in comparison header */
  priceLead: string;
  /** Optional subdued second line (e.g. recurring + ad spend note) */
  priceNote?: string;
  /** Optional tertiary line (e.g. alternative Launch pricing) */
  priceAlt?: string;
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

/** Core Zenpho workspace capabilities included with Launch (and inherited by Grow/Scale). */
export const platformIncludedInAllPlans = [
  {
    label: "CRM & contact management — capture, stage owners, and notes in one place",
    tooltip:
      "Every plan includes the Zenpho CRM so web forms, ads, and referrals land in a single pipeline—not scattered inboxes.",
  },
  {
    label: "Lead pipeline, conversations inbox, and logged sales activity",
    tooltip:
      "Move deals through stages, collaborate in the shared inbox, and keep a paper trail of outreach without extra tools.",
  },
  {
    label: "Appointment booking & calendar tied back to leads",
    tooltip:
      "Let prospects self-book and automatically attach those meetings to the right contact record.",
  },
  {
    label: "Website form capture, proposals, and automated review requests",
    tooltip:
      "Native form routing, proposal templates, and review-request workflows reduce manual follow-up from day one.",
  },
  {
    label: "Social scheduling, basic automations, monthly performance reporting",
    tooltip:
      "Queue social content, trigger simple automations, and review a monthly dashboard summarizing performance.",
  },
] as const;

export const localServicePricingPlans: LocalServicePricingPlan[] = [
  {
    id: "setup",
    title: "Launch",
    planTagline: "Start & Establish",
    priceLead: "$2,500 setup + $497/mo",
    priceNote: "Hosting, platform access, and Launch deliverables included.",
    priceAlt:
      "Alternate entry: $997 setup + $697/mo on a 6-month agreement (for more price-sensitive markets).",
    headerNote: "Zenpho platform included on every tier.",
    summary: "",
    included: [],
    bestFor: [
      "Owners launching or refreshing their digital presence from zero",
      "Teams that need GBP, site, and CRM working together before heavy ad spend",
    ],
    outcome:
      "You look credible online, collect leads in Zenpho, automate reviews, and operate from one workspace with hosting and monthly support.",
    ctaLabel: "Book a call",
    ctaHref: "/booking",
  },
  {
    id: "growth-engine",
    title: "Grow",
    planTagline: "Lead generation",
    priceLead: "$1,500 setup + $1,997/mo",
    priceNote: "Ad spend is separate (we recommend minimums by market).",
    headerNote: "Includes everything in Launch.",
    summary: "",
    included: [],
    bestFor: [
      "Businesses with a site that need predictable paid lead flow",
      "Teams ready for Google + Meta ads, landing pages, and tight tracking",
    ],
    outcome:
      "You run coordinated paid media with dedicated landing pages, full-funnel tracking, and automated follow-up on top of Launch deliverables.",
    ctaLabel: "Start Grow",
    ctaHref: "/booking",
    featured: true,
  },
  {
    id: "full-partner",
    title: "Scale",
    planTagline: "Full growth system",
    priceLead: "$5,000 setup + $4,997/mo+",
    priceNote: "Ad spend is separate.",
    headerNote: "Includes Launch + Grow foundations.",
    summary: "",
    included: [],
    bestFor: [
      "Operators with proven demand optimizing CAC, conversion, and ops",
      "Brands investing heavily across search, social, content, and automation",
    ],
    outcome:
      "You orchestrate advanced acquisition, SEO, CRO, sales automation, reputation, and quarterly planning with priority support and deeper analytics.",
    ctaLabel: "Talk with us",
    ctaHref: "/booking",
  },
];
