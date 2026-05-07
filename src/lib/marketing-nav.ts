import type { LucideIcon } from "lucide-react";
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

export const marketingTopNav: MarketingTopNavItem[] = [
  {
    type: "mega",
    label: "Services",
    sectionEyebrow: "HOW WE HELP",
    items: marketingSolutionsMegaItems,
  },
  { type: "link", label: "Studio", href: "/studio" },
  { type: "link", label: "Pricing", href: "/pricing" },
  { type: "link", label: "FAQ", href: "/pricing#faq" },
  { type: "link", label: "Contact", href: "/contact" },
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
      { label: "Resources", href: "/resources" },
      { label: "Pricing", href: "/pricing" },
      { label: "Case studies", href: "/case-studies" },
      { label: BOOKING_NAV_COMPACT_BUTTON_LABEL, href: "/booking" },
    ],
  },
];
