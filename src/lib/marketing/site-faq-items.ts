/**
 * Marketing FAQs — homepage (full list) and routes using `SITE_PRIMARY_FAQS`.
 */

export interface SiteFaqItem {
  q: string;
  a: string;
}

export const SITE_HOME_FULL_FAQS: SiteFaqItem[] = [
  {
    q: "What does Zenpho build?",
    a: "Launch-ready websites and ecommerce storefronts, custom browser experiences when users need sign-in (SaaS, portals, dashboards), and mobile app MVPs—with strategy, UX/UI, engineering, QA, deployment support, and documentation.",
  },
  {
    q: "How fast do you ship?",
    a: "Most focused scopes are built on a sprint rhythm measured in weeks (not quarters). Exact timelines depend on package and scope; see pricing for typical ranges and book a call to confirm dates for your build.",
  },
  {
    q: "Website Launch vs sign-in product vs Mobile—which should I pick?",
    a: "Choose Website Launch when you need credibility and conversion on the web. Choose the Web App MVP package on pricing when people log in, use dashboards, or you need admin tooling (still delivered as a website experience in the browser). Choose Mobile App MVP when the product must be mobile-first with onboarding and core native flows.",
  },
  {
    q: "Do you run paid ads or local SEO retainers?",
    a: "Our launch packages center on product delivery—sites and apps with sensible analytics and SEO foundations for public pages where applicable. Ongoing paid media or deep SEO programs are scoped separately when they make sense after launch.",
  },
  {
    q: "What is a Revenue Leak Audit?",
    a: "An optional tool for local operators who want a structured read on Google Business Profile, web conversion, and revenue signals. It complements—but does not replace—our MVP development engagements.",
  },
  {
    q: "Is this offshore or only templates?",
    a: "No. We work hands-on with your scope: custom UX/UI, production engineering, integrations, and QA on staging before release—not cookie-cutter theme dumps.",
  },
  {
    q: "Who is this for?",
    a: "Founders, small teams, and businesses that need a credible version one—a marketing site, storefront, logged-in website experience, or mobile MVP—without hiring a full in-house product org.",
  },
  {
    q: "How does pricing work?",
    a: "Three discounted launch packages are listed on pricing with a comparison matrix. Larger or more complex work may need a custom quote or follow-on sprint after discovery.",
  },
  {
    q: "What stacks do you use?",
    a: "We choose pragmatic modern stacks—typically Next.js/React for websites and browser-based products, APIs and databases as scoped, plus mobile tooling that fits your MVP goals—discussed transparently before kickoff.",
  },
  {
    q: "What happens after launch?",
    a: "Packages include a defined post-launch support window and handoff materials so your team can operate the product; we can plan additional builds when you are ready for the next milestone.",
  },
];

/** Same list as home — used by `components/services/FAQ` on services routes. */
export const SITE_PRIMARY_FAQS: SiteFaqItem[] = SITE_HOME_FULL_FAQS;

/** Kept empty so imports do not break; home uses `SITE_HOME_FULL_FAQS` only. */
export const SITE_HOME_SUPPLEMENT_FAQS: SiteFaqItem[] = [];
