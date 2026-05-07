import type { LucideIcon } from "lucide-react";
import { Handshake, Rocket, Wrench } from "lucide-react";
import type { PricingComparisonPlanId } from "@/lib/marketing/pricing-comparison-matrix";

export type MarketingSolutionSlug =
  | "lead-to-revenue-setup"
  | "growth-engine-management"
  | "full-growth-partner";

/** Maps pillar URLs to Design / Build / Launch plan ids (`localServicePricingPlans`). */
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
    title: "Design",
    description:
      "Clarify your idea, map the user experience, define the key pages or screens, and create a clean interface for your website, web app, mobile app, or MVP.",
    icon: Wrench,
    iconClassName: "bg-indigo-500/15 text-indigo-600",
    metaDescription:
      "Zenpho Design: clarify your product idea, define UX and core screens, and ship interface direction for websites, web apps, mobile apps, and MVPs.",
    heroLead:
      "Design turns ambiguity into a build-ready blueprint—clear journeys, prioritized surfaces, and UI direction your engineering phase can execute without rework.",
    body: [
      "We run structured discovery to capture goals, constraints, users, and scope for your website, web app, mobile app, or MVP. From there we map primary flows, navigation, and information architecture so everyone agrees what “done” means for v1.",
      "You get tangible artifacts—wireframes or annotated flows plus UI guidance tailored to your stack and timeline—so Build can move fast with fewer surprises.",
    ],
    bullets: [
      "Aligned scope and UX narrative before a single production sprint",
      "Screen-level clarity for marketing sites, apps, and dashboard-heavy products",
      "Design outputs formatted for handoff to engineering and stakeholders",
    ],
  },
  {
    slug: "growth-engine-management",
    title: "Build",
    description:
      "Develop the core functionality, connect integrations, set up databases, dashboards, admin tools, payments, and everything needed for a working product.",
    icon: Rocket,
    iconClassName: "bg-rose-500/15 text-rose-600",
    metaDescription:
      "Zenpho Build: ship core product functionality—integrations, data models, admin tools, payments, and QA—for websites, web apps, and mobile MVPs.",
    heroLead:
      "Build is where ideas become working software—production-ready features, integrations, auth, data, and internal tooling validated on staging before launch.",
    body: [
      "Engineering follows the Design blueprint with iterative demos on staging. We implement the workflows that matter most, wire forms and APIs, stand up databases and dashboards, and fold in payments or third-party tools when they’re in scope.",
      "Quality gates stay lightweight but real: regression checks, instrumentation hooks for analytics, and documentation so your team can operate what we ship.",
    ],
    bullets: [
      "Full-stack implementation aligned to an agreed MVP slice",
      "Integrations, admin interfaces, and automation hooks baked in early",
      "Staging-backed demos so stakeholders see progress every week",
    ],
  },
  {
    slug: "full-growth-partner",
    title: "Launch",
    description:
      "Test, deploy, and support your product after launch so you can collect feedback, improve quickly, and plan the next version with confidence.",
    icon: Handshake,
    iconClassName: "bg-emerald-500/15 text-emerald-700",
    metaDescription:
      "Zenpho Launch: testing, deployment, post-launch support, and iteration planning so founders can ship confidently and learn from real usage.",
    heroLead:
      "Launch packages release readiness—hardening, deployment, monitoring, and a calm post-ship rhythm—so you can listen to users and prioritize the next build wave.",
    body: [
      "We coordinate final QA, accessibility and performance passes where scoped, production deployment, DNS/hosting cutovers, and rollback-ready releases.",
      "After go-live we stay close for stabilization: bug triage, minor fixes, analytics checks, and roadmap grooming so version two reflects real feedback—not guesses.",
    ],
    bullets: [
      "Production deployment with observability and contingency planning",
      "Post-launch support window to stabilize and instrument learning",
      "Partner on prioritization for fast follow-on releases",
    ],
  },
];

export const marketingSolutionSlugs = marketingSolutionPages.map((s) => s.slug);

export function getMarketingSolutionPage(
  slug: string,
): MarketingSolutionPage | undefined {
  return marketingSolutionPages.find((s) => s.slug === slug);
}
