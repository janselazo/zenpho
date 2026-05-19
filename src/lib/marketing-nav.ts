/**
 * Marketing site navigation data — Renaissance/Editorial redesign IA.
 *
 * Mirrors the new `SiteNav` / `SiteFooter` from the design export
 * (see design-handoff/shared.jsx). Routes outside this IA still exist
 * (industries, booking, /services index, /resources, /revenue, etc.)
 * but are intentionally unlinked from nav + footer.
 */

export type MarketingMegaItem = {
  title: string;
  description: string;
  href: string;
};

export type MarketingTopNavItem =
  | { type: "link"; label: string; href: string }
  | {
      type: "mega";
      label: string;
      sectionEyebrow: string;
      items: MarketingMegaItem[];
    };

/** True when the current pathname matches this nav link (strips #hash for /pricing#faq-style links). */
export function isMarketingTopNavLinkActive(pathname: string, href: string): boolean {
  const pathOnly = href.split("#")[0] ?? href;
  if (!pathOnly) return false;
  if (pathOnly === "/") return pathname === "/";
  return pathname === pathOnly || pathname.startsWith(`${pathOnly}/`);
}

/** Services dropdown — the 4 fixed offerings driven by /solutions/[slug]. */
export const marketingServicesMegaItems: MarketingMegaItem[] = [
  {
    title: "Custom Websites",
    description: "Websites and stores built to convert.",
    href: "/solutions/custom-websites",
  },
  {
    title: "Web Apps",
    description: "Dashboards, portals, SaaS MVPs.",
    href: "/solutions/web-apps",
  },
  {
    title: "Mobile Apps",
    description: "iOS / Android MVPs with onboarding.",
    href: "/solutions/mobile-apps",
  },
  {
    title: "Creatives Generation",
    description: "Ad creatives for Meta · IG · TikTok.",
    href: "/solutions/creatives-generation",
  },
];

const resourcesMegaItems: MarketingMegaItem[] = [
  {
    title: "About",
    description: "How Zenpho turns ideas into products.",
    href: "/about",
  },
  {
    title: "Blog",
    description: "MVPs, websites, apps, launches.",
    href: "/blog",
  },
  {
    title: "Business Audit",
    description: "Spot revenue leaks — free preview.",
    href: "/tools/business-audit",
  },
];

export const marketingTopNav: MarketingTopNavItem[] = [
  {
    type: "mega",
    label: "Services",
    sectionEyebrow: "How we help",
    items: marketingServicesMegaItems,
  },
  { type: "link", label: "Studio", href: "/studio" },
  { type: "link", label: "Pricing", href: "/pricing" },
  {
    type: "mega",
    label: "Resources",
    sectionEyebrow: "Learn",
    items: resourcesMegaItems,
  },
  { type: "link", label: "Contact", href: "/contact" },
];

export type MarketingFooterColumn = {
  heading: string;
  links: { label: string; href: string; external?: boolean }[];
};

export const marketingFooterColumns: MarketingFooterColumn[] = [
  {
    heading: "Services",
    links: marketingServicesMegaItems.map((s) => ({
      label: s.title,
      href: s.href,
    })),
  },
  {
    heading: "Studio",
    links: [
      { label: "About", href: "/about" },
      { label: "Pricing", href: "/pricing" },
      { label: "Case studies", href: "/case-studies" },
      { label: "Contact", href: "/contact" },
    ],
  },
  {
    heading: "Resources",
    links: [
      { label: "Blog", href: "/blog" },
      { label: "Business Audit", href: "/tools/business-audit" },
      { label: "Book a call", href: "/contact" },
    ],
  },
  {
    heading: "Connect",
    links: [
      {
        label: "Twitter / X",
        href: "https://x.com/zenpho",
        external: true,
      },
      {
        label: "LinkedIn",
        href: "https://www.linkedin.com/company/zenpho",
        external: true,
      },
      {
        label: "GitHub",
        href: "https://github.com/janselazo",
        external: true,
      },
      {
        label: "+1 (786) 623-5157",
        href: "tel:+17866235157",
      },
    ],
  },
];
