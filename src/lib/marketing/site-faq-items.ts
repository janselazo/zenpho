/**
 * Shared FAQs for Pricing and Home — keep answers aligned so founders don’t see
 * conflicting numbers or promises across routes.
 */

export interface SiteFaqItem {
  q: string;
  a: string;
}

/** Core pricing / scope FAQs (homepage + pricing page). */
export const SITE_PRIMARY_FAQS: SiteFaqItem[] = [
  {
    q: "How much does MVP Development cost?",
    a: "MVP Development starts at $5,000. Most projects are scoped from that baseline, depending on the scope, complexity, integrations, and product requirements.",
  },
  {
    q: "How much does MVP Growth cost?",
    a: "MVP Growth starts at $2,500. Most projects range from $2,500 to $25,000+, depending on the launch scope, acquisition campaigns, landing page work, and growth support needed.",
  },
  {
    q: "Can you really build an MVP in 2 weeks?",
    a: "Yes, if the MVP is focused. Our 2-week sprint is designed for products with one core workflow, essential features, and a clear launch goal.",
  },
  {
    q: "Can you build any product in 2 weeks?",
    a: "No. We can move fast, but not every product fits a 2-week timeline. Complex platforms, advanced mobile apps, enterprise systems, and compliance-heavy products may require a larger scope.",
  },
  {
    q: "Do you build websites?",
    a: "Yes. MVP Development can include a launch landing page. MVP Growth can include landing page creation or optimization.",
  },
  {
    q: "Do you build mobile apps?",
    a: "Yes, when the scope fits. For most early-stage founders, we recommend starting with a mobile-first web app or PWA before investing in full native iOS/Android development.",
  },
  {
    q: "Do I need both MVP Development and MVP Growth?",
    a: "Not always. If you need the product built, start with MVP Development. If you already have a product and need users, start with MVP Growth. Many founders use both: first build the MVP, then launch and grow it.",
  },
];

/** Extra FAQs for homepage only — process, breadth, geography, ownership (not duplicated on Pricing). */
export const SITE_HOME_SUPPLEMENT_FAQS: SiteFaqItem[] = [
  {
    q: "What exactly does Zenpho build?",
    a: "Focused AI-assisted MVPs: SaaS surfaces, dashboards, PWAs and mobile-first apps, prototypes, marketplace slices, lightweight internal tooling, and MVP Growth after launch.",
  },
  {
    q: "Do I need to be technical?",
    a: "No. We partner with both technical and non-technical founders — you own the problem and users; we own stack choices, delivery, and instrumentation.",
  },
  {
    q: "Will I own the code?",
    a: "Yes. You own the product, repository, and assets once delivered per agreement.",
  },
];

export const SITE_HOME_FULL_FAQS: SiteFaqItem[] = [
  ...SITE_PRIMARY_FAQS,
  ...SITE_HOME_SUPPLEMENT_FAQS,
];
