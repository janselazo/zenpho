import type { LucideIcon } from "lucide-react";
import {
  FileText,
  Mail,
  Newspaper,
  Palette,
  User,
} from "lucide-react";
import { marketingIndustryPages } from "./marketing-industries-pages";
import { marketingProductPages } from "./marketing-product-pages";
import { marketingSolutionPages } from "./marketing-solutions-pages";

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

export const marketingProductMegaItems: MarketingMegaItem[] =
  marketingProductPages.map((p) => ({
    title: p.title,
    description: p.description,
    href: `/product/${p.slug}`,
    icon: p.icon,
    iconClassName: p.iconClassName,
  }));

export const marketingSolutionsMegaItems: MarketingMegaItem[] =
  marketingSolutionPages.map((s) => ({
    title: s.title,
    description: s.description,
    href: `/solutions/${s.slug}`,
    icon: s.icon,
    iconClassName: s.iconClassName,
  }));

export const marketingIndustriesMegaItems: MarketingMegaItem[] =
  marketingIndustryPages.map((i) => ({
    title: i.title,
    description: i.description,
    href: `/industries/${i.slug}`,
    icon: i.icon,
    iconClassName: i.iconClassName,
  }));

const resourcesMegaItems: MarketingMegaItem[] = [
  {
    title: "About us",
    description: "Who we are and how we help local service businesses grow.",
    href: "/about",
    icon: User,
    iconClassName: "bg-accent/15 text-accent",
  },
  {
    title: "Blog",
    description: "Ideas on leads, bookings, reviews, referrals, and revenue.",
    href: "/blog",
    icon: Newspaper,
    iconClassName: "bg-sky-500/15 text-sky-600",
  },
  {
    title: "Resources",
    description: "Guides, links, and tools we think founders and owners will reuse.",
    href: "/resources",
    icon: FileText,
    iconClassName: "bg-emerald-500/15 text-emerald-600",
  },
  {
    title: "Brand kit + funnel",
    description: "Generate a brand guidelines PDF and sales funnel playbook from your Google listing.",
    href: "/branding",
    icon: Palette,
    iconClassName: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  },
  {
    title: "Contact",
    description: "Reach the team for questions or partnerships.",
    href: "/contact",
    icon: Mail,
    iconClassName: "bg-violet-500/15 text-violet-600",
  },
];

export const marketingTopNav: MarketingTopNavItem[] = [
  {
    type: "mega",
    label: "Product",
    sectionEyebrow: "Features",
    items: marketingProductMegaItems,
  },
  {
    type: "mega",
    label: "Solutions",
    sectionEyebrow: "How we help",
    items: marketingSolutionsMegaItems,
  },
  {
    type: "mega",
    label: "Industries",
    sectionEyebrow: "Verticals",
    items: marketingIndustriesMegaItems,
  },
  { type: "link", label: "Pricing", href: "/pricing" },
  {
    type: "mega",
    label: "Resources",
    sectionEyebrow: "Learn",
    items: resourcesMegaItems,
  },
];

export type MarketingFooterColumn = {
  heading: string;
  links: { label: string; href: string }[];
};

export const marketingFooterColumns: MarketingFooterColumn[] = [
  {
    heading: "Product",
    links: marketingProductPages.map((p) => ({
      label: p.title,
      href: `/product/${p.slug}`,
    })),
  },
  {
    heading: "Solutions",
    links: marketingSolutionPages.map((s) => ({
      label: s.title,
      href: `/solutions/${s.slug}`,
    })),
  },
  {
    heading: "Industries",
    links: marketingIndustryPages.map((i) => ({
      label: i.title,
      href: `/industries/${i.slug}`,
    })),
  },
  {
    heading: "Resources",
    links: [
      { label: "About", href: "/about" },
      { label: "Blog", href: "/blog" },
      { label: "Brand kit", href: "/branding" },
      { label: "Contact", href: "/contact" },
      { label: "Pricing", href: "/pricing" },
      { label: "Case studies", href: "/case-studies" },
      { label: "Book a call", href: "/booking" },
    ],
  },
];
