import type { ChildProjectPriority } from "@/lib/crm/product-project-metadata";
import { Flag } from "lucide-react";

export type PriorityFlagLevel = ChildProjectPriority | "" | undefined;

type Props = {
  level: PriorityFlagLevel;
  className?: string;
};

/**
 * Priority flags: urgent red, high orange, medium yellow, low white with stroke
 * for contrast on light backgrounds.
 */
export function PriorityFlagIcon({ level, className }: Props) {
  const base = className?.trim()
    ? `shrink-0 ${className}`
    : "h-3.5 w-3.5 shrink-0";

  if (!level) {
    return (
      <Flag
        className={`${base} text-zinc-400 dark:text-zinc-500`}
        strokeWidth={2}
        aria-hidden
      />
    );
  }

  if (level === "urgent") {
    return (
      <Flag
        className={base}
        fill="#ef4444"
        stroke="#ef4444"
        strokeWidth={1.5}
        aria-hidden
      />
    );
  }
  if (level === "high") {
    return (
      <Flag
        className={base}
        fill="#f97316"
        stroke="#f97316"
        strokeWidth={1.5}
        aria-hidden
      />
    );
  }
  if (level === "medium") {
    return (
      <Flag
        className={base}
        fill="#eab308"
        stroke="#eab308"
        strokeWidth={1.5}
        aria-hidden
      />
    );
  }
  return (
    <Flag
      className={base}
      fill="#ffffff"
      stroke="#a1a1aa"
      strokeWidth={1.5}
      aria-hidden
    />
  );
}
