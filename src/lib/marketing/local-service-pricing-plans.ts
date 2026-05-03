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
    label: "Social media post scheduling, basic automations, monthly performance reporting",
    tooltip:
      "Schedule social posts, trigger simple automations, and review a monthly dashboard summarizing performance.",
  },
] as const;

export const localServicePricingPlans: LocalServicePricingPlan[] = [
  {
    id: "setup",
    title: "Launch",
    planTagline: "Start & Establish",
    priceLead: "$1,500/mo",
    headerNote: "Zenpho platform included on every tier.",
    summary: "",
    included: [],
    bestFor: [
      "Business owners starting out who need a correct digital foundation",
      "Teams that need site, GBP, and CRM wired together before scaled ad spend",
    ],
    outcome:
      "You look professional online, capture leads into Zenpho, and run reviews, bookings, hosting, and monthly support from one system.",
    ctaLabel: "Book a call",
    ctaHref: "/booking",
  },
  {
    id: "growth-engine",
    title: "Grow",
    planTagline: "Lead generation",
    priceLead: "$2,000/mo",
    priceNote: "Ad spend is separate.",
    headerNote: "Includes everything in Launch.",
    summary: "",
    included: [],
    bestFor: [
      "Businesses with a site that need more leads, calls, and appointments",
      "Teams ready for Google & Meta ads, landing pages, tracking, and automation",
    ],
    outcome:
      "You gain a predictable acquisition engine: paid campaigns, landing page, tagging and conversion tracking, and lead follow-up on top of everything in Launch.",
    ctaLabel: "Start Grow",
    ctaHref: "/booking",
    featured: true,
  },
  {
    id: "full-partner",
    title: "Scale",
    planTagline: "Full growth system",
    priceLead: "$3,000/mo",
    priceNote: "Ad spend is separate.",
    headerNote: "Includes Launch + Grow foundations.",
    summary: "",
    included: [],
    bestFor: [
      "Established businesses with proven demand accelerating growth and conversion",
      "Teams ready for coordinated SEO, CRO, sales automation, reputation, and reporting beyond Grow",
    ],
    outcome:
      "You unify paid acquisition, local SEO growth, experimentation, CRM and sales workflows, referral and review programs, and strategic reporting—with advanced Zenpho workflows and priority support.",
    ctaLabel: "Talk with us",
    ctaHref: "/booking",
  },
];
