import {
  Briefcase,
  DollarSign,
  HandHeart,
  HeartPulse,
  Palette,
  Sparkles,
  Users,
  type LucideIcon,
} from "lucide-react";

export const LIFE_AREAS = [
  { key: "health", label: "Health", icon: HeartPulse, blurb: "Body, energy, sleep, movement" },
  { key: "work", label: "Work", icon: Briefcase, blurb: "Career, craft, momentum" },
  { key: "finances", label: "Finances", icon: DollarSign, blurb: "Runway, savings, debt" },
  { key: "family", label: "Family", icon: Users, blurb: "Partner, kids, parents, siblings" },
  { key: "hobbies", label: "Hobbies", icon: Palette, blurb: "Play, creativity, joy" },
  { key: "community", label: "Community", icon: HandHeart, blurb: "Friends, neighbors, giving" },
  { key: "spiritual", label: "Spiritual", icon: Sparkles, blurb: "Faith, meaning, practice" },
] as const satisfies readonly {
  key: string;
  label: string;
  icon: LucideIcon;
  blurb: string;
}[];

export type LifeAreaKey = (typeof LIFE_AREAS)[number]["key"];
export type LifeStatus = "red" | "yellow" | "green";

export const LIFE_STATUSES: LifeStatus[] = ["green", "yellow", "red"];

export const STATUS_META: Record<
  LifeStatus,
  {
    label: string;
    description: string;
    dotClass: string;
    ringClass: string;
    chipActiveClass: string;
    chipIdleClass: string;
  }
> = {
  green: {
    label: "Green",
    description: "On track",
    dotClass: "bg-emerald-500",
    ringClass: "ring-emerald-500/40",
    chipActiveClass:
      "bg-emerald-500/15 text-emerald-700 ring-2 ring-emerald-500/40 dark:bg-emerald-500/15 dark:text-emerald-300",
    chipIdleClass:
      "bg-surface text-text-secondary hover:bg-emerald-500/10 hover:text-emerald-700 dark:bg-zinc-800/60 dark:text-zinc-400 dark:hover:bg-emerald-500/10 dark:hover:text-emerald-300",
  },
  yellow: {
    label: "Yellow",
    description: "Needs attention",
    dotClass: "bg-amber-500",
    ringClass: "ring-amber-500/40",
    chipActiveClass:
      "bg-amber-500/15 text-amber-700 ring-2 ring-amber-500/40 dark:bg-amber-500/15 dark:text-amber-300",
    chipIdleClass:
      "bg-surface text-text-secondary hover:bg-amber-500/10 hover:text-amber-700 dark:bg-zinc-800/60 dark:text-zinc-400 dark:hover:bg-amber-500/10 dark:hover:text-amber-300",
  },
  red: {
    label: "Red",
    description: "Off track / urgent",
    dotClass: "bg-red-500",
    ringClass: "ring-red-500/40",
    chipActiveClass:
      "bg-red-500/15 text-red-700 ring-2 ring-red-500/40 dark:bg-red-500/15 dark:text-red-300",
    chipIdleClass:
      "bg-surface text-text-secondary hover:bg-red-500/10 hover:text-red-700 dark:bg-zinc-800/60 dark:text-zinc-400 dark:hover:bg-red-500/10 dark:hover:text-red-300",
  },
};

export function isLifeAreaKey(value: unknown): value is LifeAreaKey {
  return (
    typeof value === "string" &&
    LIFE_AREAS.some((a) => a.key === value)
  );
}

export function isLifeStatus(value: unknown): value is LifeStatus {
  return value === "red" || value === "yellow" || value === "green";
}
