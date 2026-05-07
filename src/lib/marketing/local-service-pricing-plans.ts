export type LocalServicePricingPlan = {
  id: string;
  title: string;
  /** Short subtitle under the title in the comparison header */
  planTagline?: string;
  /** Bold price line shown in comparison header */
  priceLead: string;
  /** Prior price shown struck-through */
  priceWas?: string;
  /** Optional subdued second line under prices */
  priceNote?: string;
  /** Optional tertiary line */
  priceAlt?: string;
  summary: string;
  /** Legacy field — comparison matrix is primary UI; keep empty or short notes for exports. */
  included: string[];
  bestFor: string[];
  outcome: string;
  ctaLabel: string;
  ctaHref: string;
  /** Multiline description under tagline */
  headerNote?: string;
  /** Emphasize as recommended tier */
  featured?: boolean;
};

export const localServicePricingPlans: LocalServicePricingPlan[] = [
  {
    id: "setup",
    title: "Custom Websites",
    planTagline: "WEBSITES & STORES",
    headerNote:
      "A clean website or ecommerce store built to explain your offer, build trust, and convert visitors.",
    priceLead: "$1,000",
    priceWas: "$2,000",
    summary: "",
    included: [],
    bestFor: ["Websites", "landing pages", "ecommerce"],
    outcome: "Ship a credible marketing or storefront presence customers can trust.",
    ctaLabel: "Start Website",
    ctaHref: "/booking",
  },
  {
    id: "growth-engine",
    title: "Web Apps",
    planTagline: "WEB APPS & DASHBOARDS",
    headerNote:
      "A working MVP with login, dashboards, database, admin tools, integrations, and launch support.",
    priceLead: "$2,500",
    priceWas: "$5,000",
    summary: "",
    included: [],
    bestFor: ["SaaS", "portals", "dashboards", "internal tools"],
    outcome: "Ship an authenticated web product stakeholders can click through on staging—and launch safely.",
    ctaLabel: "Start Web App",
    ctaHref: "/booking",
    featured: true,
  },
  {
    id: "full-partner",
    title: "Mobile Apps",
    planTagline: "IOS & ANDROID APPS",
    headerNote:
      "A focused mobile app with onboarding, user accounts, core screens, integrations, and launch support.",
    priceLead: "$3,000",
    priceWas: "$6,000",
    summary: "",
    included: [],
    bestFor: ["Mobile app ideas", "customer apps", "mobile MVPs"],
    outcome: "Ship a mobile MVP ready for early adopters with onboarding and integrations wired.",
    ctaLabel: "Start Mobile App",
    ctaHref: "/booking",
  },
];
