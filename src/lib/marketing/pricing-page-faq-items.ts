import type { SiteFaqItem } from "@/lib/marketing/site-faq-items";

/** FAQs shown only on /pricing (launch MVP packages). */
export const PRICING_PAGE_FAQS: SiteFaqItem[] = [
  {
    q: "What is Website Launch?",
    a: "Website Launch is a one-time build focused on a professional marketing site or ecommerce storefront: strategy and planning, custom UX/UI, responsive layouts, core pages, forms and integrations as scoped, analytics and SEO foundation for public pages, QA, deployment, documentation, and 30 days of post-launch support. Priced at $2,497 during the limited launch offer (50% off the standard $4,994).",
  },
  {
    q: "What is Web App MVP?",
    a: "Web App MVP ships a functional authenticated web product—login, user and admin dashboards, database setup, forms and actions, payments or booking flows as scoped, API integrations, plus launch setup (analytics, SEO for public pages, performance checks, QA, deployment, handoff) and 90 days of support. Priced at $4,997 during the limited launch offer (50% off $9,994). Typical timeline is about two weeks.",
  },
  {
    q: "What is Mobile App MVP?",
    a: "Mobile App MVP is for iOS and Android–oriented MVPs: mobile-first UX/UI, user accounts and onboarding, core screens, integrations, database setup, launch support, and 90 days of post-launch support. Public-page SEO is scoped to landing surfaces where applicable. Priced at $5,997 during the limited launch offer (50% off $11,994). Typical timeline is two to four weeks.",
  },
  {
    q: "How does payment work?",
    a: "Each package uses the same structure: 50% upfront when we kick off, 50% on delivery. Third-party subscriptions or tooling and major scope additions outside the comparison matrix are quoted separately after discovery.",
  },
  {
    q: "What does the limited 50% launch offer mean?",
    a: "We’re offering three discounted launch packages for the next two client spots. After those spots fill, pricing returns to the listed “was” amounts or we’ll quote custom engagements—especially for larger or more complex work that needs an extra sprint.",
  },
  {
    q: "Can we customize scope or combine ideas from multiple columns?",
    a: "Yes. The table reflects standard bundles; discovery may surface add-ons (extra integrations, more screens, multi-tenant complexity, etc.). We’ll map those to a clear quote or a follow-on sprint so expectations stay explicit.",
  },
  {
    q: "How do we choose which package to start with?",
    a: "If you primarily need a credible site or storefront, start with Website Launch. If your roadmap centers on logged-in users, dashboards, or portals, Web App MVP fits. If the experience must live as a native-feeling mobile MVP first, choose Mobile App MVP—or book a call and we’ll align the smallest coherent slice to prove value.",
  },
];
