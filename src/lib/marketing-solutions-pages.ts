import type { LucideIcon } from "lucide-react";
import { Handshake, Rocket, Wrench } from "lucide-react";

export type MarketingSolutionSlug =
  | "lead-to-revenue-setup"
  | "growth-engine-management"
  | "full-growth-partner";

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
    title: "Development",
    description:
      "Website, Google Business Profile, email, foundational SEO, hosting, optional branding—and Zenpho as your operating system.",
    icon: Wrench,
    iconClassName: "bg-indigo-500/15 text-indigo-600",
    metaDescription:
      "Zenpho Development package for local businesses: site and GBP setup, email, SEO foundations, hosting, and the Zenpho platform for leads through referrals.",
    heroLead:
      "Establish credibility and discoverability before you scale paid media—built on Zenpho from day one.",
    body: [
      "Development scopes website work, Google Business Profile and business email setup, foundational SEO with hosting and support, plus optional branding—all alongside full Zenpho platform access.",
      "You finish with a professional local presence your team can run, with pipelines and reporting ready when you graduate into Growth or Scale.",
    ],
    bullets: [
      "Website development and GBP aligned to how buyers search",
      "Business email and hosting with ongoing support",
      "Foundational SEO and optimization during build-out",
      "Zenpho workspace for lead management through referrals",
    ],
  },
  {
    slug: "growth-engine-management",
    title: "Growth",
    description:
      "Everything in Development, plus Meta ads, Performance Creatives, and ongoing SEO—in one monthly rhythm.",
    icon: Rocket,
    iconClassName: "bg-rose-500/15 text-rose-600",
    metaDescription:
      "Zenpho Growth: Meta and Instagram ads, Performance Creatives, ongoing SEO, plus every Development deliverable and the Zenpho platform.",
    heroLead:
      "Predictable demand from Meta and SEO while Development foundations and Zenpho keep follow-up and attribution honest.",
    body: [
      "Growth inherits your entire Development scope, then layers Meta (Facebook & Instagram) campaigns, Performance Creatives, and an ongoing SEO program—not just the foundational work from setup.",
      "Monthly cadence focuses on creative iteration, search visibility, and clear reporting on pipeline—not vanity metrics.",
    ],
    bullets: [
      "Meta ads management with guardrails and testing",
      "Performance Creatives tuned to local proof and offers",
      "Ongoing SEO beyond foundational optimization",
      "Zenpho dashboards tying spend to leads and bookings",
    ],
  },
  {
    slug: "full-growth-partner",
    title: "Scale",
    description:
      "Everything in Growth—plus Google Ads for coordinated search and social at higher ambition.",
    icon: Handshake,
    iconClassName: "bg-emerald-500/15 text-emerald-700",
    metaDescription:
      "Zenpho Scale: Google Ads plus Meta, creatives, ongoing SEO, Development bundle, and Zenpho—full-funnel management for competitive markets.",
    heroLead:
      "When search intent and social prospecting both matter, Scale coordinates channels with one operating system.",
    body: [
      "Scale includes Growth (therefore Development): Meta ads, Performance Creatives, ongoing SEO, and your site/GBP foundations.",
      "We add Google Ads—Search and Performance Max—so budgets, messaging, and landing experiences stay aligned instead of siloed.",
    ],
    bullets: [
      "Coordinated Meta + Google Ads strategy and execution",
      "Shared creative and landing insights across channels",
      "Reporting that shows channel overlap and true incremental lift",
      "Room for aggressive expansion without losing operational clarity",
    ],
  },
];

export const marketingSolutionSlugs = marketingSolutionPages.map((s) => s.slug);

export function getMarketingSolutionPage(
  slug: string,
): MarketingSolutionPage | undefined {
  return marketingSolutionPages.find((s) => s.slug === slug);
}
