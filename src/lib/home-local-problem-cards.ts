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
    iconKey: "salesPipeline",
    text: "Version-one scope keeps expanding",
  },
  {
    iconKey: "mapVisibility",
    text: "No shared map of core user journeys",
  },
  {
    iconKey: "reviews",
    text: "Pretty visuals without product logic underneath",
  },
  {
    iconKey: "conversion",
    text: "Landing or onboarding doesn’t explain the offer",
  },
  {
    iconKey: "missedCalls",
    text: "Slow stakeholder feedback delaying decisions",
  },
  {
    iconKey: "tracking",
    text: "Success metrics undefined before build starts",
  },
  {
    iconKey: "channels",
    text: "Too many priorities, no single hero workflow",
  },
  {
    iconKey: "ads",
    text: "Integrations or dependencies blocking the critical path",
  },
  {
    iconKey: "reviewSystem",
    text: "No predictable staging demo rhythm",
  },
  {
    iconKey: "referrals",
    text: "Post-launch iteration plan is fuzzy",
  },
  {
    iconKey: "followUp",
    text: "Handoff and docs won’t support your team",
  },
  {
    iconKey: "dashboard",
    text: "Hard to see what’s shipped vs still blocked",
  },
];
