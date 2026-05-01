import type { LucideIcon } from "lucide-react";
import {
  Briefcase,
  Car,
  HeartPulse,
  Home,
} from "lucide-react";

export type MarketingIndustrySlug =
  | "home-services"
  | "health-wellness"
  | "professional-services"
  | "automotive-services";

export type MarketingIndustryPage = {
  slug: MarketingIndustrySlug;
  title: string;
  description: string;
  icon: LucideIcon;
  iconClassName: string;
  metaDescription: string;
  heroLead: string;
  body: string[];
  bullets: string[];
};

export const marketingIndustryPages: MarketingIndustryPage[] = [
  {
    slug: "home-services",
    title: "Home Services",
    description:
      "HVAC, plumbing, electrical, cleaning, landscaping—win the neighborhoods you serve.",
    icon: Home,
    iconClassName: "bg-slate-500/15 text-slate-700",
    metaDescription:
      "Growth software and services for home service businesses: more leads, booked jobs, reviews, and clear marketing ROI.",
    heroLead:
      "Route density, seasonality, and emergency calls—your funnel should match how homeowners actually buy.",
    body: [
      "Homeowners search in panic and in planning mode. You need capture that works from mobile at 10pm, booking that respects drive time, and reviews that compound trust block by block.",
      "Zenpho helps home service owners see which ads, neighborhoods, and offers produce booked revenue—not just form fills.",
    ],
    bullets: [
      "After-hours lead capture with clear urgency routing",
      "Scheduling built around tech routes and dispatch reality",
      "Review programs tuned to one-time fixes and membership renewals",
      "ROI views by service line and trade area",
    ],
  },
  {
    slug: "health-wellness",
    title: "Health & Wellness",
    description:
      "Clinics, medspa, dental, fitness—fill your calendar with qualified appointments.",
    icon: HeartPulse,
    iconClassName: "bg-red-500/15 text-red-600",
    metaDescription:
      "Patient and client growth for local health and wellness brands—HIPAA-aware workflows, booking, reviews, and referrals.",
    heroLead:
      "Compliance and care come first—so growth systems must be precise, private, and predictable.",
    body: [
      "Health and wellness buyers compare credentials, proximity, and availability. Your experience should answer those questions fast while keeping PHI where it belongs.",
      "Zenpho focuses on compliant capture, reminder flows that cut no-shows, and referral loops that respect patient trust.",
    ],
    bullets: [
      "Appointment-first journeys for consults and memberships",
      "Reminder cadences tailored to procedures and packages",
      "Reputation growth without aggressive or non-compliant prompts",
      "Clear attribution for provider, location, and campaign",
    ],
  },
  {
    slug: "professional-services",
    title: "Professional Services",
    description:
      "Legal, accounting, consulting, agencies—turn expertise into a pipeline you control.",
    icon: Briefcase,
    iconClassName: "bg-indigo-500/15 text-indigo-700",
    metaDescription:
      "Lead-to-revenue systems for local professional firms: consult booking, nurture, referrals, and revenue visibility.",
    heroLead:
      "Complex offers need consultative follow-up—not a one-click ecommerce checkout.",
    body: [
      "Professional buyers move slower, ask harder questions, and compare multiple firms. Your system should nurture thoughtfully and prove ROI on seminars, content, and partner channels.",
      "Zenpho supports longer cycles with structured follow-up, while still surfacing which activities create retained clients.",
    ],
    bullets: [
      "Intake that qualifies without slowing serious prospects",
      "Automation that feels partner-grade, not spammy",
      "Referral tracking for client introductions and COIs",
      "Dashboards that show pipeline value, not vanity traffic",
    ],
  },
  {
    slug: "automotive-services",
    title: "Automotive Services",
    description:
      "Dealers, detailers, repair, fleets—more ROs, referrals, and repeat visits.",
    icon: Car,
    iconClassName: "bg-zinc-500/15 text-zinc-700",
    metaDescription:
      "Automotive local growth: capture and book service appointments, grow reviews, and trace revenue to campaigns.",
    heroLead:
      "Cars are high-ticket and trust-driven—your growth stack should reflect the showroom and the service lane.",
    body: [
      "Whether you move metal or wrench full-time, customers call, compare, and show up with questions. Zenpho ties marketing to repair orders and front-gross opportunities your team can act on.",
      "Built on patterns from real-world automotive retail—not generic B2B playbooks.",
    ],
    bullets: [
      "Multi-channel capture for phone, chat, and service schedulers",
      "Post-visit review asks timed after successful ROs",
      "Referral hooks for sales and service customer bases",
      "Reporting that follows a vehicle or household across touches",
    ],
  },
];

export const marketingIndustrySlugs = marketingIndustryPages.map((p) => p.slug);

export function getMarketingIndustryPage(
  slug: string,
): MarketingIndustryPage | undefined {
  return marketingIndustryPages.find((p) => p.slug === slug);
}
