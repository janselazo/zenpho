import type { LucideIcon } from "lucide-react";
import {
  FileText,
  Mail,
  Newspaper,
  Palette,
  SearchCheck,
  User,
} from "lucide-react";
import { marketingIndustryPages } from "./marketing-industries-pages";
import { marketingProductPages } from "./marketing-product-pages";
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
    description:
      "Who we are, how we work, and how Zenpho helps founders and businesses turn ideas into launch-ready digital products.",
    href: "/about",
    icon: User,
    iconClassName: "bg-accent/15 text-accent",
  },
  {
    title: "Blog",
    description:
      "Insights on MVP development, product strategy, websites, web apps, mobile apps, ecommerce, and launching faster.",
    href: "/blog",
    icon: Newspaper,
    iconClassName: "bg-sky-500/15 text-sky-600",
  },
  {
    title: "Resources",
    description:
      "Guides, tools, checklists, and frameworks to help you plan, build, launch, and improve your digital product.",
    href: "/resources",
    icon: FileText,
    iconClassName: "bg-emerald-500/15 text-emerald-600",
  },
  {
    title: "Contact",
    description: "Have a website, app, or MVP idea? Reach out and we’ll help you map the next step.",
    href: "/contact",
    icon: Mail,
    iconClassName: "bg-violet-500/15 text-violet-600",
  },
];

export const marketingTopNav: MarketingTopNavItem[] = [
  {
    type: "mega",
    label: "Platform",
    sectionEyebrow: "Features",
    items: marketingProductMegaItems,
  },
  {
    type: "mega",
    label: "Solutions",
    sectionEyebrow: "HOW WE HELP",
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
    heading: "Platform",
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
    heading: "Tools",
    links: [
      { label: "Business Audit", href: "/tools/business-audit" },
      { label: "Brand Kit", href: "/branding" },
    ],
  },
  {
    heading: "Resources",
    links: [
      { label: "About", href: "/about" },
      { label: "Blog", href: "/blog" },
      { label: "Contact", href: "/contact" },
      { label: "Pricing", href: "/pricing" },
      { label: "Case studies", href: "/case-studies" },
      { label: BOOKING_NAV_COMPACT_BUTTON_LABEL, href: "/booking" },
    ],
  },
];
