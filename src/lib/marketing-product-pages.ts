import type { LucideIcon } from "lucide-react";
import {
  CalendarClock,
  Lightbulb,
  Share2,
  Star,
  Target,
  Users,
} from "lucide-react";

export type MarketingProductSlug =
  | "lead-generation"
  | "lead-management"
  | "appointments"
  | "reviews"
  | "referrals"
  | "growth-intelligence";

export type MarketingProductPage = {
  slug: MarketingProductSlug;
  title: string;
  /** Mega menu + card copy */
  description: string;
  icon: LucideIcon;
  iconClassName: string;
  metaDescription: string;
  heroLead: string;
  body: string[];
  bullets: string[];
};

export const marketingProductPages: MarketingProductPage[] = [
  {
    slug: "lead-generation",
    title: "Lead Generation",
    description:
      "Fill your pipeline with local prospects who are actively looking for what you offer.",
    icon: Target,
    iconClassName: "bg-violet-500/15 text-violet-600",
    metaDescription:
      "Generate qualified local leads with Zenpho—capture demand from search, ads, and your website in one growth system.",
    heroLead:
      "Turn local search intent and inbound interest into conversations you can book—not just clicks.",
    body: [
      "Local service businesses lose money when marketing stops at impressions. Lead generation in Zenpho is built around intent: the calls, form fills, and chats that signal someone is ready to talk.",
      "We help you align offers, landing experiences, and tracking so you know which channels produce real conversations—not vanity metrics.",
    ],
    bullets: [
      "Capture demand from the channels that matter in your market",
      "Qualify faster with consistent capture fields and source attribution",
      "See which campaigns create booked calls and revenue",
    ],
  },
  {
    slug: "lead-management",
    title: "Lead Management",
    description:
      "Capture every call, form, and message with full attribution—then organize, prioritize, and follow up so nothing slips through the cracks.",
    icon: Users,
    iconClassName: "bg-emerald-500/15 text-emerald-600",
    metaDescription:
      "Capture leads from calls, forms, and messages with source tracking; prioritize and follow up with CRM-style workflows built for local service businesses.",
    heroLead:
      "One system of record from first touch to booked job—capture, attribute, and prioritize without enterprise CRM complexity.",
    body: [
      "Missed calls and orphaned form fills quietly drain revenue. Lead capture connects your website, ads, and phone into a single timeline with source and campaign metadata.",
      "Tracking ties each lead back to the creative, keyword, or referral that created it—so you can double down on what works.",
      "Spreadsheets and generic CRMs weren’t built for booked estimates and recurring service routes. Lead management keeps status, notes, and next steps visible for the whole team.",
      "Prioritization helps you focus on high-value jobs, urgent follow-ups, and opportunities most likely to close this week.",
    ],
    bullets: [
      "Normalize leads from web, phone, and third-party sources",
      "Attribute leads to campaigns and landing pages automatically",
      "Alert your team when high-intent leads arrive",
      "Stages tailored to quotes, appointments, and won jobs",
      "Team visibility into history and commitments",
      "Less admin time, more time on-site with customers",
    ],
  },
  {
    slug: "appointments",
    title: "Appointments",
    description:
      "Turn interest into booked time on your calendar—automatically and professionally.",
    icon: CalendarClock,
    iconClassName: "bg-amber-500/15 text-amber-700",
    metaDescription:
      "Convert more local leads into booked appointments with scheduling flows and reminders that reduce no-shows.",
    heroLead:
      "Speed wins in local services. Booking should feel effortless for the customer and predictable for your crew.",
    body: [
      "When scheduling is clunky, leads choose the competitor who answered faster. Appointments connect availability, confirmations, and reminders in one flow.",
      "Reduce back-and-forth, protect drive time, and keep your day structured—without losing the human touch.",
    ],
    bullets: [
      "Self-serve booking aligned to your real availability",
      "Automatic reminders that cut no-shows",
      "Handoff notes so technicians arrive informed",
    ],
  },
  {
    slug: "reviews",
    title: "Reviews",
    description:
      "Collect more Google reviews—the social proof that drives clicks and calls.",
    icon: Star,
    iconClassName: "bg-yellow-500/20 text-yellow-700",
    metaDescription:
      "Systematically request Google reviews after great experiences so your local reputation compounds.",
    heroLead:
      "Reviews are the currency of local search. Make asking systematic, polite, and easy.",
    body: [
      "Happy customers will leave reviews—if you give them a one-tap path at the right moment. Zenpho helps you time requests after jobs that went well.",
      "Monitor what’s being said, respond faster, and watch how review velocity impacts inbound calls.",
    ],
    bullets: [
      "SMS and email review requests after completed visits",
      "Templates that stay compliant with platform policies",
      "Visibility into rating trends by location or team",
    ],
  },
  {
    slug: "referrals",
    title: "Referrals",
    description: "Turn happy clients into a repeatable referral engine.",
    icon: Share2,
    iconClassName: "bg-orange-500/15 text-orange-600",
    metaDescription:
      "Encourage referrals and track word-of-mouth alongside paid channels—built for local service businesses.",
    heroLead:
      "Referrals close faster and cost less—when you make it easy to share you.",
    body: [
      "Referral programs fail when they’re buried in fine print. Zenpho makes sharing frictionless: simple links, clear offers, and tracking so you can thank the right people.",
      "See referral-sourced revenue alongside paid media so you invest with a full picture.",
    ],
    bullets: [
      "Shareable referral links tied to customers or campaigns",
      "Track referred leads through booking and payment",
      "Messaging that reinforces trust—not gimmicks",
    ],
  },
  {
    iconClassName: "bg-sky-500/15 text-sky-700 dark:bg-sky-500/12 dark:text-sky-400",
    metaDescription:
      "Get clarity on funnel bottlenecks, competitor gaps, and where to invest next—tailored to local service growth.",
    heroLead:
      "Insight isn’t more charts—it’s the next move that adds revenue this month.",
    body: [
      "Growth intelligence synthesizes capture, scheduling, reviews, and revenue signals into priorities: where leads stall, which offers convert, and what to fix on your site.",
      "Use it to steer weekly standups, marketing spend, and hiring—grounded in your own data.",
    ],
    bullets: [
      "Funnel diagnostics without enterprise BI overhead",
      "Alerts when conversion or booking rates slip",
      "Benchmark-style guidance grounded in your vertical",
    ],
  },
];

export const marketingProductSlugs = marketingProductPages.map((p) => p.slug);

export function getMarketingProductPage(
  slug: string,
): MarketingProductPage | undefined {
  return marketingProductPages.find((p) => p.slug === slug);
}
