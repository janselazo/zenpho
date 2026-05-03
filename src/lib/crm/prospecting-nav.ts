import type { LucideIcon } from "lucide-react";
import {
  Palette,
  Share2,
  BookOpen,
  Megaphone,
  Mails,
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
  | "paid-ads"
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
    label: "Google Opportunities",
    href: "/prospecting/prospects",
    icon: UserSearch,
    description:
      "Local Business search (Google Places), website URL research, and tailored ideas for sites, web apps, mobile apps, and AI audit signals—then add targets as Leads.",
  },
  {
    slug: "creatives",
    label: "Creatives",
    href: "/prospecting/creatives",
    icon: Palette,
    description:
      "Images and videos for your GTM—libraries, templates, and brand-consistent assets for outbound, social, and paid.",
    soon: true,
    comingSoonFeatures: [
      "Image and video workspaces with brand kits tied to your offer and ICP",
      "Export presets for LinkedIn, Meta, short-form video, and display",
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
    soon: true,
    comingSoonFeatures: [
      "Plan and schedule posts across LinkedIn, X, and Meta from one workspace",
      "Brand voice presets and approval flows before anything goes live",
      "Engagement signals tied to Leads and Playbook touches",
      "OAuth connections — connect accounts in Settings when integrations ship",
    ],
  },
  {
    slug: "campaigns",
    label: "Email Marketing",
    href: "/prospecting/campaigns",
    icon: Mails,
    description:
      "Email marketing and one-to-one outreach — templates, sends, and replies tied to leads and deals.",
    soon: true,
    comingSoonFeatures: [
      "Newsletters, nurture sequences, and one-to-one outreach templates",
      "Sends and replies connected to Leads and Deals",
      "Deliverability and domain health in one place",
      "Hooks into Playbook for one-click attach to sequences",
    ],
  },
  {
    slug: "paid-ads",
    label: "Paid Ads",
    href: "/prospecting/paid-ads",
    icon: Megaphone,
    description:
      "LinkedIn, Meta, and search campaigns — budgets, creatives, and conversion tracking for your pipeline.",
    soon: true,
    comingSoonFeatures: [
      "LinkedIn, Meta, and search campaigns in one view",
      "Budgets, creatives, and conversion tracking for your pipeline",
      "Attribution to Leads and Deals",
      "Ad platform integrations — wiring in a later phase",
    ],
  },
  {
    slug: "seo",
    label: "SEO Optimizations",
    href: "/prospecting/seo",
    icon: Search,
    description:
      "Keywords, content gaps, and organic opportunities for your agency offer.",
    soon: true,
    comingSoonFeatures: [
      "Target keywords, intent, and ranking snapshots for your pages",
      "Content calendar tied to clusters, briefs, and publish status",
      "Blog and newsletter themes tied to organic strategy",
      "Core Web Vitals, indexation, and crawl monitoring — integrations TBD",
    ],
  },
  {
    slug: "referrals",
    label: "Referrals",
    href: "/referrals",
    icon: Gift,
    description:
      "Public review links, referral touchpoints, and social proof for leads and partners.",
    soon: true,
  },
  {
    slug: "partnerships",
    label: "Partnerships",
    href: "/prospecting/partnerships",
    icon: Handshake,
    description:
      "Track referral partners, co-marketing motions, and shared pipeline.",
    soon: true,
    comingSoonFeatures: [
      "Directory of agencies, tech partners, and referrers with status and owner",
      "Co-marketing motions, rev-share agreements, and joint GTM plays",
      "Opportunities sourced or influenced by partners, linked to Deals",
      "Partner pipeline and shared reporting",
    ],
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
    slug: "networking",
    label: "Networking",
    href: "/prospecting/networking",
    icon: Network,
    description:
      "Find networking-style events in a city by date range—venues, organizers, and links (Ticketmaster catalog).",
    soon: true,
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
