import type { PricingComparisonPlanId } from "@/lib/marketing/pricing-comparison-matrix";

export type PackageIncludeGroup = {
  heading: string;
  items: string[];
};

export type PackageNarrativeContent = {
  id: PricingComparisonPlanId;
  tagline: string;
  bestFor: string;
  mainGoal: string;
  priceSummary: string;
  priceFootnote?: string;
  priceAlternative?: string;
  includeGroups: PackageIncludeGroup[];
  platformAndMonthly?: string[];
  positioning: string;
};

export const localServicePackageNarratives: PackageNarrativeContent[] = [
  {
    id: "setup",
    tagline: "BUSINESS & ECOMMERCE WEBSITES",
    bestFor:
      "Teams launching or upgrading a professional marketing site, brochure presence, or ecommerce storefront.",
    mainGoal:
      "Explain your offer clearly, build trust, capture inquiries or orders, and ship with analytics plus foundational SEO.",
    priceSummary: "$1,000",
    priceFootnote: "one-time · 50% off (was $2,000)",
    includeGroups: [
      {
        heading: "STRATEGY & PLANNING",
        items: [
          "Discovery and strategy session",
          "Feature prioritization",
          "Launch scope & roadmap",
          "Sitemap and flow planning",
          "Version-one product planning",
        ],
      },
      {
        heading: "DESIGN",
        items: [
          "Custom UX/UI design",
          "Responsive layouts",
          "Landing/home coverage plus core pages/screens",
          "Basic reusable components where scoped",
        ],
      },
      {
        heading: "DEVELOPMENT",
        items: [
          "Website or ecommerce storefront build",
          "Forms and submissions aligned to goals",
          "Basic integrations plus optional payment/booking flows when scoped",
        ],
      },
      {
        heading: "LAUNCH SETUP",
        items: [
          "Analytics tracking",
          "SEO foundation for public pages",
          "Performance checks, QA, deployment support, documentation & handoff",
        ],
      },
      {
        heading: "SUPPORT & TIMELINE",
        items: ["30 days post-launch support", "Typical timeline 1–2 weeks", "50% upfront / 50% on delivery"],
      },
    ],
    positioning:
      "Website Launch keeps focus on credibility and conversion—fast to ship, easy to extend when you’re ready for more product depth.",
  },
  {
    id: "growth-engine",
    tagline: "SAAS, PORTALS & DASHBOARDS",
    bestFor: "Founders shipping authenticated web apps, internal tools, or customer portals with dashboard workflows.",
    mainGoal:
      "Deliver a functional MVP with login, core user/admin surfaces, data layer, integrations, and launch-ready QA.",
    priceSummary: "$2,000",
    priceFootnote: "one-time · 50% off (was $4,000)",
    includeGroups: [
      {
        heading: "STRATEGY & PLANNING",
        items: [
          "Discovery and strategy session",
          "Feature prioritization & roadmap",
          "Flow planning for authenticated experiences",
        ],
      },
      {
        heading: "DESIGN",
        items: [
          "Custom UX/UI for web app surfaces",
          "Responsive layouts & reusable components",
          "Dashboard and core screen coverage",
        ],
      },
      {
        heading: "DEVELOPMENT",
        items: [
          "Functional web app development",
          "Authentication & login flows",
          "User dashboard/account areas",
          "Admin dashboard/panel",
          "Database setup, forms/actions, payments/booking as scoped",
          "API integrations",
        ],
      },
      {
        heading: "LAUNCH SETUP",
        items: [
          "Analytics tracking",
          "SEO foundation for public pages",
          "Performance checks, QA, deployment support, documentation & handoff",
        ],
      },
      {
        heading: "SUPPORT & TIMELINE",
        items: ["90 days post-launch support", "Typical timeline ~2 weeks", "50% upfront / 50% on delivery"],
      },
    ],
    positioning:
      "Web App MVP packages everything needed to move from prototype conversations to a staging-backed product your team can review and launch.",
  },
  {
    id: "full-partner",
    tagline: "IOS & ANDROID APP MVPS",
    bestFor:
      "Teams that need a mobile-first experience with accounts, onboarding, core screens, integrations, and store-ready launch support.",
    mainGoal:
      "Ship a focused mobile MVP that demonstrates value to early adopters with disciplined UX, integrations, and go-live coverage.",
    priceSummary: "$3,000",
    priceFootnote: "one-time · 50% off (was $6,000)",
    includeGroups: [
      {
        heading: "STRATEGY & PLANNING",
        items: [
          "Discovery and strategy session",
          "Feature prioritization & roadmap",
          "App flow planning and screen inventory",
        ],
      },
      {
        heading: "DESIGN",
        items: [
          "Custom UX/UI for mobile surfaces",
          "Responsive/mobile-first layouts",
          "Onboarding + core screens designed",
        ],
      },
      {
        heading: "DEVELOPMENT",
        items: [
          "Mobile app MVP development",
          "Authentication & login",
          "User dashboard/account experiences",
          "Admin tooling when scoped",
          "Database setup, payments/booking, API integrations",
        ],
      },
      {
        heading: "LAUNCH SETUP",
        items: [
          "Analytics tracking",
          "SEO coverage for landing/public surfaces (landing page scope)",
          "Performance checks, QA, deployment support, documentation & handoff",
        ],
      },
      {
        heading: "SUPPORT & TIMELINE",
        items: ["90 days post-launch support", "Typical timeline 2–4 weeks", "50% upfront / 50% on delivery"],
      },
    ],
    positioning:
      "Mobile App MVP is built for founders who need something tangible in-market—accounts, onboarding, core journeys, and support through stabilization.",
  },
];
