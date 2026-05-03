import type { LucideIcon } from "lucide-react";
import {
  Building2,
  BookOpen,
  Calculator,
  Calendar,
  Compass,
  DollarSign,
  FileBarChart,
  FileText,
  FolderKanban,
  Gift,
  Handshake,
  LayoutDashboard,
  Magnet,
  Megaphone,
  MailPlus,
  MessageCircle,
  MessageSquare,
  Package,
  Receipt,
  SearchCheck,
  Star,
  Timer,
  Users,
  UsersRound,
  Workflow,
  Wrench,
} from "lucide-react";
import { PROSPECTING_SECTIONS } from "@/lib/crm/prospecting-nav";

function section(slug: (typeof PROSPECTING_SECTIONS)[number]["slug"]) {
  const s = PROSPECTING_SECTIONS.find((x) => x.slug === slug);
  if (!s) throw new Error(`Missing prospecting section: ${slug}`);
  return s;
}

export type AppSidebarItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  soon?: boolean;
  badge?: "conversations";
};

export type AppSidebarCollapsibleSection = {
  storageKey: string;
  label: string;
  items: AppSidebarItem[];
};

const playbook = section("playbook");
const prospects = section("prospects");
const seo = section("seo");
const socialMedia = section("social-media");
const paidAds = section("paid-ads");
const campaigns = section("campaigns");
const networking = section("networking");
const marketplaces = section("marketplaces");
const partnerships = section("partnerships");
const creatives = section("creatives");
const landingPages = section("landing-pages");

export const SIDEBAR_MARKETING: AppSidebarItem[] = [
  { href: playbook.href, label: playbook.label, icon: playbook.icon },
  { href: "/audit", label: "Audit", icon: SearchCheck },
  {
    href: prospects.href,
    label: "Google Opportunities",
    icon: prospects.icon,
  },
  {
    href: seo.href,
    label: "SEO Optimizations",
    icon: seo.icon,
    soon: !!seo.soon,
  },
  {
    href: socialMedia.href,
    label: socialMedia.label,
    icon: socialMedia.icon,
    soon: !!socialMedia.soon,
  },
  {
    href: paidAds.href,
    label: paidAds.label,
    icon: paidAds.icon,
    soon: !!paidAds.soon,
  },
  {
    href: campaigns.href,
    label: campaigns.label,
    icon: campaigns.icon,
    soon: !!campaigns.soon,
  },
  {
    href: networking.href,
    label: networking.label,
    icon: networking.icon,
    soon: !!networking.soon,
  },
  {
    href: marketplaces.href,
    label: marketplaces.label,
    icon: marketplaces.icon,
    soon: !!marketplaces.soon,
  },
  {
    href: partnerships.href,
    label: partnerships.label,
    icon: partnerships.icon,
    soon: !!partnerships.soon,
  },
];

export const SIDEBAR_CREATIVE_STUDIO: AppSidebarItem[] = [
  {
    href: creatives.href,
    label: "Images & Videos",
    icon: creatives.icon,
    soon: !!creatives.soon,
  },
  {
    href: landingPages.href,
    label: landingPages.label,
    icon: landingPages.icon,
    soon: !!landingPages.soon,
  },
  {
    href: "/prospecting/product-led/lead-magnets",
    label: "Lead Magnets",
    icon: Magnet,
  },
  {
    href: "/prospecting/product-led/tools",
    label: "Tools",
    icon: Wrench,
  },
];

export const SIDEBAR_CRM: AppSidebarItem[] = [
  { href: "/leads", label: "Leads", icon: UsersRound },
  { href: "/calendar", label: "Appointments", icon: Calendar },
  {
    href: "/conversations",
    label: "Conversations",
    icon: MessageSquare,
    badge: "conversations",
  },
];

export const SIDEBAR_SALES: AppSidebarItem[] = [
  {
    href: "/products-services",
    label: "Products & Services",
    icon: Package,
    soon: true,
  },
  { href: "/proposals", label: "Proposals", icon: FileText },
  { href: "/estimates", label: "Estimates", icon: Calculator, soon: true },
  { href: "/invoices", label: "Invoices", icon: Receipt, soon: true },
];

export const SIDEBAR_REVIEWS: AppSidebarItem[] = [
  {
    href: "/reviews/review-requests",
    label: "Review Requests",
    icon: MailPlus,
    soon: true,
  },
  { href: "/reviews/google-reviews", label: "Google Reviews", icon: Star },
  {
    href: "/reviews/feedback",
    label: "Feedback",
    icon: MessageCircle,
    soon: true,
  },
];

export const SIDEBAR_REFERRALS: AppSidebarItem[] = [
  { href: "/referrals", label: "Campaigns", icon: Megaphone },
  {
    href: "/referrals/partners",
    label: "Referral Partners",
    icon: Handshake,
    soon: true,
  },
  {
    href: "/referrals/rewards",
    label: "Rewards",
    icon: Gift,
    soon: true,
  },
];

export const SIDEBAR_REPORTING: AppSidebarItem[] = [
  {
    href: "/reports",
    label: "Marketing Performance",
    icon: FileBarChart,
  },
  {
    href: "/reporting/sales-performance",
    label: "Sales Performance",
    icon: FileBarChart,
    soon: true,
  },
  {
    href: "/reporting/revenue-attribution",
    label: "Revenue Attribution",
    icon: FileBarChart,
    soon: true,
  },
  {
    href: "/reporting/reviews-referrals",
    label: "Reviews & referrals",
    icon: FileBarChart,
    soon: true,
  },
];

export const SIDEBAR_WORK: AppSidebarItem[] = [
  { href: "/products", label: "Products", icon: FolderKanban },
  { href: "/time-tracking", label: "Time Tracking", icon: Timer },
];

export const SIDEBAR_AGENCY: AppSidebarItem[] = [
  { href: "/my-life", label: "My Life", icon: Compass },
  { href: "/finances", label: "Finances", icon: DollarSign },
  { href: "/team", label: "Team", icon: Users },
  { href: "/automations", label: "Automations", icon: Workflow },
  { href: "/docs", label: "Documents", icon: BookOpen },
  { href: "/agency/industries", label: "Industries", icon: Building2 },
];

export const SIDEBAR_COLLAPSIBLE_SECTIONS: AppSidebarCollapsibleSection[] = [
  { storageKey: "crm", label: "CRM", items: SIDEBAR_CRM },
  {
    storageKey: "studio",
    label: "Studio",
    items: SIDEBAR_CREATIVE_STUDIO,
  },
  { storageKey: "marketing", label: "Marketing", items: SIDEBAR_MARKETING },
  { storageKey: "sales", label: "Sales", items: SIDEBAR_SALES },
  { storageKey: "reviews", label: "Reviews", items: SIDEBAR_REVIEWS },
  { storageKey: "referrals", label: "Referrals", items: SIDEBAR_REFERRALS },
  { storageKey: "reports", label: "Reports", items: SIDEBAR_REPORTING },
  { storageKey: "work", label: "Work", items: SIDEBAR_WORK },
  { storageKey: "agency", label: "Agency", items: SIDEBAR_AGENCY },
];

export const SIDEBAR_DASHBOARD_ITEM: AppSidebarItem = {
  href: "/dashboard",
  label: "Dashboard",
  icon: LayoutDashboard,
};
