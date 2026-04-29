import type { ChildProjectPriority } from "@/lib/crm/product-project-metadata";
import { Flag } from "lucide-react";

export type PriorityFlagLevel = ChildProjectPriority | "" | undefined;

type Props = {
  level: PriorityFlagLevel;
  className?: string;
};

/**
 * Priority flags: urgent rose, high amber, normal/medium blue, low muted grey.
 * Empty shows outline flag for “no priority”.
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
        fill="#e11d48"
        stroke="#e11d48"
        strokeWidth={1.5}
        aria-hidden
      />
    );
  }
  if (level === "high") {
    return (
      <Flag
        className={base}
        fill="#d97706"
        stroke="#d97706"
        strokeWidth={1.5}
        aria-hidden
      />
    );
  }
  if (level === "medium") {
    return (
      <Flag
        className={base}
        fill="#2563eb"
        stroke="#2563eb"
        strokeWidth={1.5}
        aria-hidden
      />
    );
  }
  return (
    <Flag
      className={base}
      fill="#71717a"
      stroke="#71717a"
      strokeWidth={1.5}
      aria-hidden
    />
  );
}
