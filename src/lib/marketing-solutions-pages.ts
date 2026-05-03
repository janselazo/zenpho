import type { LucideIcon } from "lucide-react";
import { Handshake, Rocket, Wrench } from "lucide-react";
import type { PricingComparisonPlanId } from "@/lib/marketing/pricing-comparison-matrix";

export type MarketingSolutionSlug =
  | "lead-to-revenue-setup"
  | "growth-engine-management"
  | "full-growth-partner";

/** Maps pillar URLs to Launch / Grow / Scale plan ids (`localServicePricingPlans`). */
export const marketingSolutionToPlanId: Record<
  MarketingSolutionSlug,
  PricingComparisonPlanId
> = {
  "lead-to-revenue-setup": "setup",
  "growth-engine-management": "growth-engine",
  "full-growth-partner": "full-partner",
};

export type MarketingSolutionPage = {
  slug: MarketingSolutionSlug;
  title: string;
  description: string;
  icon: LucideIcon;
  iconClassName: string;
  metaDescription: string;
  heroLead: string;
  body: string[];
  bullets: string[];
};

export const marketingSolutionPages: MarketingSolutionPage[] = [
  {
    slug: "lead-to-revenue-setup",
    title: "Launch",
    description:
      "Brand, site, Google Business Profile, SEO foundations, social starter kit, and Zenpho as your operating system before you scale spend.",
    icon: Wrench,
    iconClassName: "bg-indigo-500/15 text-indigo-600",
    metaDescription:
      "Zenpho Launch for local service businesses: strategy, 3 to 5 page site, GBP, SEO starter work, social foundation, hosting, and full Zenpho CRM access.",
    heroLead:
      "Launch gives new or rebooting operators a trustworthy digital foundation—website, maps presence, SEO basics, and Zenpho CRM—so leads and reviews flow into one workspace.",
    body: [
      "Launch packages business strategy onboarding, brand direction, copy structure, a mobile-friendly website with booking/lead capture, Google Business Profile configuration, local SEO fundamentals, and a social starter library executed through Zenpho.",
      "Every client also receives core Zenpho modules—CRM, pipeline, inbox, forms, booking, proposals, social scheduling, automations, review requests, and monthly reporting—plus hosting, cadence posts, and performance reviews so the system stays fresh.",
    ],
    bullets: [
      "Guided setup for site, GBP, citations, and analytics without duct-taped tools",
      "Monthly content, monitoring, and reporting baked into the retainer",
      "Optional alternate pricing for price-sensitive markets on a six-month agreement",
    ],
  },
  {
    slug: "growth-engine-management",
    title: "Grow",
    description:
      "Everything in Launch plus Google & Meta ads, dedicated landing pages, instrumentation, and automated follow-up for predictable pipeline.",
    icon: Rocket,
    iconClassName: "bg-rose-500/15 text-rose-600",
    metaDescription:
      "Zenpho Grow: inherits Launch foundations, adds paid search/social, landing pages, conversion tracking, and CRM automations—with ad spend billed separately.",
    heroLead:
      "Grow is for teams already online who need repeatable demand—paid placements, tighter landing experiences, truthful attribution, and automated nurture layered on Launch.",
    body: [
      "Grow inherits website, GBP, SEO baseline, Zenpho workflows, hosting, and support from Launch. We activate Google Ads, Meta placements, retargeting, localized service strategies, creative refreshes, and weekly optimizations while media budgets settle directly with the platforms.",
      "Dedicated landing builds, tagging, call/form conversion tracking, and CPL reporting anchor each sprint. Automated missed-call replies, confirmations, nurturing, and pipeline automations feed every lead straight back into Zenpho.",
    ],
    bullets: [
      "Managed Google + Meta programs with ongoing creative and testing",
      "Landing + tracking stack purpose-built for booked appointments, not vanity clicks",
      "Monthly strategy + optimization cadence with clear spend-to-lead visibility",
    ],
  },
  {
    slug: "full-growth-partner",
    title: "Scale",
    description:
      "Full-funnel growth system on Zenpho—advanced paid programs, SEO expansion, CRO, sales automation, reputation, referrals, and executive-ready reporting.",
    icon: Handshake,
    iconClassName: "bg-emerald-500/15 text-emerald-700",
    metaDescription:
      "Zenpho Scale extends Launch + Grow with advanced acquisition, local SEO growth, experimentation, sales operations, reputation programs, multi-seat Zenpho, priority support, and optional add-on services.",
    heroLead:
      "Scale is for proven operators ready to optimize every stage—media, SEO, conversion, CRM, reputation, and revenue reporting—without bolting on more vendors.",
    body: [
      "Scale keeps every Launch and Grow deliverable, then widens paid programs (video, LSAs, multi-offer testing), advances local SEO and review growth, runs structured CRO tests, hardens CRM and sales automation, and layers referral plus reactivation plays inside Zenpho.",
      "Advanced dashboards surface lead source attribution, CPL, cost per booked appointment, and pipeline revenue when stages stay current. Quarterly planning and priority support keep leadership aligned, with optional add-ons such as appointment setting, call handling, custom integrations, creative production, AI chat, and newsletter management quoted separately.",
    ],
    bullets: [
      "Coordinated acquisition + SEO + experimentation roadmap",
      "Sales, reputation, and referral programs automated inside Zenpho",
      "Executive reporting, multi-seat access, and optional operational add-ons",
    ],
  },
];

export const marketingSolutionSlugs = marketingSolutionPages.map((s) => s.slug);

export function getMarketingSolutionPage(
  slug: string,
): MarketingSolutionPage | undefined {
  return marketingSolutionPages.find((s) => s.slug === slug);
}
