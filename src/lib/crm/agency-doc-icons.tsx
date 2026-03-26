import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  BookOpen,
  CalendarDays,
  FileStack,
  FileText,
  Lightbulb,
  ListChecks,
  NotebookPen,
  ScrollText,
  Sparkles,
  Target,
  TrendingUp,
  Users,
} from "lucide-react";

const HUB_ICON_MAP: Record<string, LucideIcon> = {
  "file-text": FileText,
  "file-stack": FileStack,
  lightbulb: Lightbulb,
  "notebook-pen": NotebookPen,
  "scroll-text": ScrollText,
  "calendar-days": CalendarDays,
  "book-open": BookOpen,
  sparkles: Sparkles,
  "trending-up": TrendingUp,
  users: Users,
  "list-checks": ListChecks,
  "bar-chart-3": BarChart3,
  target: Target,
};

export function hubDocIcon(iconKey: string | null | undefined): LucideIcon {
  const key = (iconKey ?? "file-text").toLowerCase();
  return HUB_ICON_MAP[key] ?? FileText;
}
