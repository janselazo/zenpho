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
} from "lucide-react";

export type HomeLocalProblemIconKey =
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
    text: "Weak Google Business Profile visibility",
  },
  {
    iconKey: "reviews",
    text: "Low review count compared to competitors",
  },
  {
    iconKey: "conversion",
    text: "Poor website conversion",
  },
  {
    iconKey: "missedCalls",
    text: "Missed calls and slow follow-up",
  },
  {
    iconKey: "tracking",
    text: "No clear lead tracking",
  },
  {
    iconKey: "channels",
    text: "No idea which marketing channels actually produce clients",
  },
  {
    iconKey: "ads",
    text: "Ads sending traffic to weak pages",
  },
  {
    iconKey: "reviewSystem",
    text: "No consistent review request system",
  },
  {
    iconKey: "referrals",
    text: "No referral process",
  },
  {
    iconKey: "followUp",
    text: "No follow-up with old leads or unsold proposals",
  },
  {
    iconKey: "dashboard",
    text: "No dashboard showing the real business numbers",
  },
];
