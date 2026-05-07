import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  Gauge,
  Megaphone,
  MessageSquareWarning,
  MousePointerClick,
  PhoneMissed,
  Route,
  Share2,
  Star,
  Target,
  Users,
  Workflow,
} from "lucide-react";

export type HomeLocalProblemIconKey =
  | "salesPipeline"
  | "mapVisibility"
  | "reviews"
  | "conversion"
  | "missedCalls"
  | "tracking"
  | "channels"
  | "ads"
  | "reviewSystem"
  | "referrals"
  | "followUp"
  | "dashboard";

export type HomeLocalProblemCard = {
  text: string;
  iconKey: HomeLocalProblemIconKey;
};

const iconMap: Record<HomeLocalProblemIconKey, LucideIcon> = {
  salesPipeline: Workflow,
  mapVisibility: Target,
  reviews: Star,
  conversion: MousePointerClick,
  missedCalls: PhoneMissed,
  tracking: Route,
  channels: Gauge,
  ads: Megaphone,
  reviewSystem: MessageSquareWarning,
  referrals: Share2,
  followUp: Users,
  dashboard: BarChart3,
};

export function iconForLocalProblemCard(key: HomeLocalProblemIconKey): LucideIcon {
  return iconMap[key];
}

export const homeLocalProblemCards: HomeLocalProblemCard[] = [
  {
    iconKey: "mapVisibility",
    text: "No clear MVP scope",
  },
  {
    iconKey: "tracking",
    text: "Website or app idea stuck in planning",
  },
  {
    iconKey: "channels",
    text: "Too many features for version one",
  },
  {
    iconKey: "conversion",
    text: "Poor user experience and weak design",
  },
  {
    iconKey: "reviewSystem",
    text: "Expensive quotes with unclear deliverables",
  },
  {
    iconKey: "salesPipeline",
    text: "No product roadmap or launch plan",
  },
  {
    iconKey: "missedCalls",
    text: "Slow development and missed deadlines",
  },
  {
    iconKey: "reviews",
    text: "No working prototype to test with users",
  },
  {
    iconKey: "followUp",
    text: "No user login, payments, or dashboard setup",
  },
  {
    iconKey: "referrals",
    text: "Disconnected tools and missing integrations",
  },
  {
    iconKey: "dashboard",
    text: "No analytics or feedback tracking after launch",
  },
  {
    iconKey: "ads",
    text: "No post-launch support for improvements",
  },
];
