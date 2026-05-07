/**
 * Marketing FAQs — homepage (full list) and routes using `SITE_PRIMARY_FAQS`.
 */

export interface SiteFaqItem {
  q: string;
  a: string;
}

export const SITE_HOME_FULL_FAQS: SiteFaqItem[] = [
  {
    q: "What do you do?",
    a: "We help founders, startups, and businesses design, build, and launch websites, ecommerce websites, web apps, mobile apps, and MVPs. We handle strategy, UX/UI design, development, integrations, testing, deployment, and launch support.",
  },
  {
    q: "What is an MVP?",
    a: "An MVP, or minimum viable product, is the first focused version of your product. It includes the core features needed to test your idea with real users, collect feedback, and decide what to build next.",
  },
  {
    q: "Can you really launch in 2 weeks?",
    a: "Yes, if the scope is focused. We help you define the most important version one features so your product can launch quickly without being overbuilt. Larger projects may require additional sprints.",
  },
  {
    q: "What can you build?",
    a: "We build business websites, ecommerce websites, SaaS MVPs, dashboards, client portals, booking platforms, admin panels, internal tools, mobile app MVPs, and custom web apps.",
  },
  {
    q: "Do I need designs ready before starting?",
    a: "No. We can handle the full process from idea to launch, including strategy, user flows, wireframes, UX/UI design, development, testing, and deployment.",
  },
  {
    q: "What is included in a launch package?",
    a: "Depending on the package, your project can include strategy, feature planning, UX/UI design, website or app development, user authentication, dashboards, admin tools, database setup, integrations, analytics, deployment, documentation, and launch support.",
  },
  {
    q: "How does payment work?",
    a: "Most launch packages are split into two payments: 50% upfront and 50% on delivery. Custom projects may have a different payment structure depending on scope and timeline.",
  },
  {
    q: "Can you work on an existing website or app?",
    a: "Yes. We can redesign, rebuild, improve, or add new features to an existing website, web app, ecommerce store, or mobile app.",
  },
  {
    q: "Can I add more features after launch?",
    a: "Yes. After your first version is live, we can continue with additional sprints to add features, improve the user experience, connect more integrations, or build version two.",
  },
  {
    q: "Do you handle integrations?",
    a: "Yes. We can connect your product to payment processors, email tools, CRMs, booking systems, analytics tools, databases, AI tools, and other third-party APIs when needed.",
  },
  {
    q: "How do I get started?",
    a: "Book a free call. We'll discuss your idea, goals, timeline, and budget, then recommend the best path to launch your website, web app, mobile app, or MVP.",
  },
];

/** Same list as home — used by `components/services/FAQ` on services routes. */
export const SITE_PRIMARY_FAQS: SiteFaqItem[] = SITE_HOME_FULL_FAQS;

/** Kept empty so imports do not break; home uses `SITE_HOME_FULL_FAQS` only. */
export const SITE_HOME_SUPPLEMENT_FAQS: SiteFaqItem[] = [];
