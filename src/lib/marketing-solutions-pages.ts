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
    title: "Lead-to-Revenue Setup",
    description:
      "We configure capture, booking, tracking, and dashboards so your funnel works on day one.",
    icon: Wrench,
    iconClassName: "bg-indigo-500/15 text-indigo-600",
    metaDescription:
      "Done-with-you setup of Zenpho for local service businesses—leads, appointments, reviews, and revenue tracking configured end to end.",
    heroLead:
      "Go live with a complete lead-to-revenue stack—without becoming your own IT department.",
    body: [
      "Most teams don’t need another login; they need the plumbing connected. We implement capture points, source tracking, scheduling, and reporting aligned to how you actually sell.",
      "You’ll finish setup with documented workflows, naming conventions, and a dashboard your whole team can read.",
    ],
    bullets: [
      "Audit of current funnel and quick-win prioritization",
      "Implementation of capture, routing, and booking",
      "Attribution and review-request wiring",
      "Owner-friendly training session",
    ],
  },
  {
    slug: "growth-engine-management",
    title: "Growth Engine Management",
    description:
      "Ongoing optimization: campaigns, follow-ups, and reporting managed for you.",
    icon: Rocket,
    iconClassName: "bg-rose-500/15 text-rose-600",
    metaDescription:
      "Managed growth for local service businesses—ongoing funnel tuning, follow-up performance, and revenue reporting with Zenpho.",
    heroLead:
      "Keep the machine running while you run the business—we monitor, test, and tighten the system monthly.",
    body: [
      "Markets shift; creative fatigues; competitors copy. Managed services keep experiments moving: new hooks, landing tweaks, automation tuning, and spend guardrails.",
      "Reporting becomes a rhythm: what changed, what improved, and what we’re testing next—so you always know why numbers moved.",
    ],
    bullets: [
      "Monthly funnel and campaign review",
      "Automation and messaging iteration",
      "Review velocity and referral program coaching",
      "Clear readouts tied to bookings and revenue",
    ],
  },
  {
    slug: "full-growth-partner",
    title: "Full Growth Partner",
    description:
      "Strategy plus execution across acquisition, conversion, reputation, and retention.",
    icon: Handshake,
    iconClassName: "bg-emerald-500/15 text-emerald-700",
    metaDescription:
      "A senior growth partner for local service brands—strategy, creative direction, and hands-on execution with Zenpho as the operating system.",
    heroLead:
      "When you want a fractional growth lead embedded with your team—not a menu of disconnected tactics.",
    body: [
      "This tier pairs Zenpho’s product depth with senior oversight: positioning, offer design, channel strategy, and ruthless prioritization of what moves revenue.",
      "Ideal for owners ready to scale multi-location presence or step out of founder-led sales without losing quality.",
    ],
    bullets: [
      "Quarterly growth roadmap aligned to revenue targets",
      "Cross-channel execution with unified reporting",
      "Priority access for launches and promos",
      "Executive-level narrative you can take to partners or lenders",
    ],
  },
];

export const marketingSolutionSlugs = marketingSolutionPages.map((s) => s.slug);

export function getMarketingSolutionPage(
  slug: string,
): MarketingSolutionPage | undefined {
  return marketingSolutionPages.find((s) => s.slug === slug);
}
