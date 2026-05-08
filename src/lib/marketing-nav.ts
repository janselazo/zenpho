import type { LucideIcon } from "lucide-react";
import { FileText, Mail, Newspaper, Palette, SearchCheck, User } from "lucide-react";
import { marketingSolutionPages } from "./marketing-solutions-pages";
import { BOOKING_NAV_COMPACT_BUTTON_LABEL } from "@/lib/marketing/booking-cta";

export type MarketingMegaItem = {
  title: string;
  description: string;
  href: string;
  icon: LucideIcon;
  iconClassName: string;
};

export type MarketingTopNavItem =
  | {
      type: "mega";
      label: string;
      sectionEyebrow: string;
      items: MarketingMegaItem[];
    }
  | { type: "link"; label: string; href: string };

/** True when the current pathname matches this nav link (strips #hash for /pricing#faq-style links). */
export function isMarketingTopNavLinkActive(pathname: string, href: string): boolean {
  const pathOnly = href.split("#")[0] ?? href;
  if (!pathOnly) return false;
  if (pathOnly === "/") return pathname === "/";
  return pathname === pathOnly || pathname.startsWith(`${pathOnly}/`);
}

export const marketingSolutionsMegaItems: MarketingMegaItem[] =
  marketingSolutionPages.map((s) => ({
    title: s.title,
    description: s.description,
    href: `/solutions/${s.slug}`,
    icon: s.icon,
    iconClassName: s.iconClassName,
  }));

const toolsMegaItems: MarketingMegaItem[] = [
  {
    title: "Business Audit",
    description:
      "Scan your Google profile, reviews, and local presence to spot revenue leaks—free instant preview.",
    href: "/tools/business-audit",
    icon: SearchCheck,
    iconClassName: "bg-accent/15 text-accent",
  },
  {
    title: "Brand Kit",
    description: "Generate a brand guidelines PDF and sales funnel playbook from your Google listing.",
    href: "/branding",
    icon: Palette,
    iconClassName: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  },
];

const resourcesMegaItems: MarketingMegaItem[] = [
  {
    title: "About us",
    description: "How Zenpho helps turn ideas into launch-ready products.",
    href: "/about",
    icon: User,
    iconClassName: "bg-accent/15 text-accent",
  },
  {
    title: "Blog",
    description: "Insights on MVPs, websites, apps, and product launches.",
    href: "/blog",
    icon: Newspaper,
    iconClassName: "bg-sky-500/15 text-sky-600",
  },
  {
    title: "Resources",
    description: "Guides and tools to help you plan, build, and launch.",
    href: "/resources",
    icon: FileText,
    iconClassName: "bg-emerald-500/15 text-emerald-600",
  },
  {
    title: "Contact",
    description: "Tell us what you want to build next.",
    href: "/contact",
    icon: Mail,
    iconClassName: "bg-violet-500/15 text-violet-600",
  },
];

export const marketingTopNav: MarketingTopNavItem[] = [
  {
    type: "mega",
    label: "Services",
    sectionEyebrow: "HOW WE HELP",
    items: marketingSolutionsMegaItems,
  },
  { type: "link", label: "Studio", href: "/studio" },
  { type: "link", label: "Pricing", href: "/pricing" },
  {
    type: "mega",
    label: "Tools",
    sectionEyebrow: "Utilities",
    items: toolsMegaItems,
  },
  {
    type: "mega",
    label: "Resources",
    sectionEyebrow: "LEARN",
    items: resourcesMegaItems,
  },
];

export type MarketingFooterColumn = {
  heading: string;
  links: { label: string; href: string }[];
};

export const marketingFooterColumns: MarketingFooterColumn[] = [
  {
    heading: "Company",
    links: [
      { label: "Studio", href: "/studio" },
      { label: "About", href: "/about" },
      { label: "Contact", href: "/contact" },
    ],
  },
  {
    heading: "Services",
    links: marketingSolutionPages.map((s) => ({
      label: s.title,
      href: `/solutions/${s.slug}`,
    })),
  },
  {
    heading: "Tools",
    links: [
      { label: "Business Audit", href: "/tools/business-audit" },
      { label: "Brand Kit", href: "/branding" },
    ],
  },
  {
    heading: "Resources",
    links: [
      { label: "Blog", href: "/blog" },
      { label: "Pricing", href: "/pricing" },
      { label: "Case studies", href: "/case-studies" },
      { label: BOOKING_NAV_COMPACT_BUTTON_LABEL, href: "/booking" },
    ],
  },
];
