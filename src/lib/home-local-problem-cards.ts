import type { LucideIcon } from "lucide-react";
import {
  BadgeDollarSign,
  BarChart3,
  ClipboardList,
  Clock,
  FlaskConical,
  Layers,
  LayoutDashboard,
  LifeBuoy,
  Lightbulb,
  Map,
  Palette,
  Puzzle,
} from "lucide-react";

export type HomeLocalProblemIconKey =
  | "mvpScope"
  | "stuckPlanning"
  | "tooManyFeatures"
  | "weakUx"
  | "unclearQuotes"
  | "noRoadmap"
  | "slowDev"
  | "noPrototype"
  | "noCoreProduct"
  | "integrations"
  | "noAnalytics"
  | "noSupport";

export type HomeLocalProblemCard = {
  text: string;
  iconKey: HomeLocalProblemIconKey;
};

const iconMap: Record<HomeLocalProblemIconKey, LucideIcon> = {
  mvpScope: ClipboardList,
  stuckPlanning: Lightbulb,
  tooManyFeatures: Layers,
  weakUx: Palette,
  unclearQuotes: BadgeDollarSign,
  noRoadmap: Map,
  slowDev: Clock,
  noPrototype: FlaskConical,
  noCoreProduct: LayoutDashboard,
  integrations: Puzzle,
  noAnalytics: BarChart3,
  noSupport: LifeBuoy,
};

export function iconForLocalProblemCard(key: HomeLocalProblemIconKey): LucideIcon {
  return iconMap[key];
}

export const homeLocalProblemCards: HomeLocalProblemCard[] = [
  {
    iconKey: "mvpScope",
    text: "No clear MVP scope",
  },
  {
    iconKey: "stuckPlanning",
    text: "Website or app idea stuck in planning",
  },
  {
    iconKey: "tooManyFeatures",
    text: "Too many features for version one",
  },
  {
    iconKey: "weakUx",
    text: "Poor user experience and weak design",
  },
  {
    iconKey: "unclearQuotes",
    text: "Expensive quotes with unclear deliverables",
  },
  {
    iconKey: "noRoadmap",
    text: "No product roadmap or launch plan",
  },
  {
    iconKey: "slowDev",
    text: "Slow development and missed deadlines",
  },
  {
    iconKey: "noPrototype",
    text: "No working prototype to test with users",
  },
  {
    iconKey: "noCoreProduct",
    text: "No user login, payments, or dashboard setup",
  },
  {
    iconKey: "integrations",
    text: "Disconnected tools and missing integrations",
  },
  {
    iconKey: "noAnalytics",
    text: "No analytics or feedback tracking after launch",
  },
  {
    iconKey: "noSupport",
    text: "No post-launch support for improvements",
  },
];
