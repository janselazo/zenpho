import type { LeadMagnetFormat } from "@/lib/crm/lead-magnet-industries";

export function formatBadgeClass(format: LeadMagnetFormat | string): string {
  switch (format) {
    case "Calculator":
      return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400";
    case "Template":
      return "bg-blue-500/15 text-blue-700 dark:text-blue-400";
    case "Assessment":
      return "bg-violet-500/15 text-violet-700 dark:text-violet-400";
    case "Toolkit":
      return "bg-amber-500/15 text-amber-800 dark:text-amber-400";
    default:
      return "bg-zinc-500/15 text-zinc-700 dark:text-zinc-400";
  }
}
