import type { LucideIcon } from "lucide-react";
import {
  Palette,
  Share2,
  BookOpen,
  Megaphone,
  Store,
  LayoutTemplate,
  Handshake,
  Search,
  Gift,
  UserSearch,
  Network,
} from "lucide-react";

export type ProspectingSectionSlug =
  | "playbook"
  | "prospects"
  | "networking"
  | "creatives"
  | "landing-pages"
  | "social-media"
  | "campaigns"
  | "marketplaces"
  | "partnerships"
  | "referrals"
  | "seo";

export interface ProspectingSection {
  slug: ProspectingSectionSlug;
  label: string;
  href: string;
  icon: LucideIcon;
  description: string;
  /** Show “Soon” in sidebar and hub */
  soon?: boolean;
  /** Bullet list for ComingSoonModule */
  comingSoonFeatures?: string[];
}

export const PROSPECTING_SECTIONS: ProspectingSection[] = [
  {
    slug: "playbook",
    label: "Playbook",
    href: "/prospecting/playbook",
    icon: BookOpen,
    description:
      "Daily playbook, agenda, and tasks to book more conversations and appointments.",
  },
  {
    slug: "prospects",
    label: "Prospects",
    href: "/prospecting/prospects",
    icon: UserSearch,
    description:
      "Local Business search (Google Places), website URL research, and tailored ideas for sites, web apps, mobile apps, and AI automations—then add targets as Leads.",
  },
  {
    slug: "creatives",
    label: "Creatives",
    href: "/prospecting/creatives",
    icon: Palette,
    description:
      "Ad creative library, templates, and brand-consistent assets for outbound and paid.",
    soon: true,
    comingSoonFeatures: [
      "Brand kits tied to your offer and ICP segments",
      "Export presets for LinkedIn, Meta, and display placements",
      "Version history and approval before anything goes live",
      "Hooks into Playbook for one-click attach to sequences",
    ],
  },
  {
    slug: "landing-pages",
    label: "Landing Pages",
    href: "/prospecting/landing-pages",
    icon: LayoutTemplate,
    description:
      "High-converting pages for campaigns, webinars, and special offers — no code required.",
    soon: true,
    comingSoonFeatures: [
      "Drag-and-drop builder with agency-grade templates",
      "Lead capture fields mapped to Leads and Appointments",
      "Custom domains and basic conversion analytics",
      "Reuse blocks across Campaigns and Playbook",
    ],
  },
  {
    slug: "social-media",
    label: "Social Media",
    href: "/prospecting/social-media",
    icon: Share2,
    description:
      "Plan and publish B2B content to grow trust and inbound leads from social channels.",
  },
  {
    slug: "campaigns",
    label: "Campaigns",
    href: "/prospecting/campaigns",
    icon: Megaphone,
    description:
      "Coordinate multi-touch campaigns across email, ads, and events for your pipeline.",
  },
  {
    slug: "marketplaces",
    label: "Marketplaces",
    href: "/prospecting/marketplaces",
    icon: Store,
    description:
      "List and manage offerings where your buyers already shop (when relevant to your GTM).",
    soon: true,
    comingSoonFeatures: [
      "Cross-post to channels that match your niche (where applicable)",
      "Sync key fields with your CRM opportunities",
      "Centralized inbox for inbound marketplace messages",
      "Lightweight analytics per listing or channel",
    ],
  },
  {
    slug: "partnerships",
    label: "Partnerships",
    href: "/prospecting/partnerships",
    icon: Handshake,
    description:
      "Track referral partners, co-marketing motions, and shared pipeline.",
  },
  {
    slug: "networking",
    label: "Networking",
    href: "/prospecting/networking",
    icon: Network,
    description:
      "Find networking-style events in a city by date range—venues, organizers, and links (Ticketmaster catalog).",
  },
  {
    slug: "referrals",
    label: "Referrals",
    href: "/referrals",
    icon: Gift,
    description:
      "Public review links, referral touchpoints, and social proof for leads and partners.",
  },
  {
    slug: "seo",
    label: "SEO",
    href: "/prospecting/seo",
    icon: Search,
    description:
      "Keywords, content gaps, and organic opportunities for your agency offer.",
  },
];

const SLUG_SET = new Set<string>(PROSPECTING_SECTIONS.map((s) => s.slug));

export function isProspectingSectionSlug(
  value: string
): value is ProspectingSectionSlug {
  return SLUG_SET.has(value);
}

export function getProspectingSection(
  slug: string
): ProspectingSection | undefined {
  return PROSPECTING_SECTIONS.find((s) => s.slug === slug);
}
