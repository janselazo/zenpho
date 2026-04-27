"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getMoneyJournalTimerSnapshot } from "@/lib/crm/money-journal-timer-snapshot";

/**
 * Same geometry as the outline: bottom triangle = base at y=14.5, apex at waist (8, 6.2).
 * Sand “fills” upward as progress → 1 (hour completes).
 */
function sandPath(progress: number): string {
  const p = Math.min(1, Math.max(0, progress));
  const yBase = 14.5;
  const yApex = 6.2;
  const h = yBase - yApex;
  const yTop = yBase - p * h;
  const xL = 3 + 5 * p;
  const xR = 13 - 5 * p;
  return `M 3 ${yBase} L 13 ${yBase} L ${xR} ${yTop} L ${xL} ${yTop} Z`;
}

/** Hourglass outline: matches sand apex so fill aligns with the glass. */
const HOURGLASS_OUTLINE_D =
  "M 3 1.5 L 13 1.5 L 8.2 6.2 L 13 14.5 L 3 14.5 L 7.8 6.2 Z";

export default function MoneyJournalTopBarPip() {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => {
      setTick((n) => n + 1);
    }, 500);
    return () => clearInterval(id);
  }, []);
  const live = getMoneyJournalTimerSnapshot();
  if (!live?.show) {
    return null;
  }
  void tick;

  const label =
    live.status === "complete"
      ? "Money Journal hour complete — add notes and log"
      : `Money Journal: ${live.mmss} left`;

  return (
    <Link
      href="/prospecting/playbook?tab=journal"
      className="relative inline-flex h-7 w-7 items-center justify-center text-text-secondary transition-colors hover:text-text-primary dark:text-zinc-400 dark:hover:text-zinc-100"
      aria-label={label}
      title={label}
    >
      <svg
        className="h-4 w-4 shrink-0"
        viewBox="0 0 16 16"
        fill="none"
        aria-hidden
      >
        {/* Sand (bottom chamber fills until the hour is done) */}
        <path
          d={sandPath(live.progress)}
          className="fill-current text-text-secondary/55 dark:text-zinc-400/50"
          style={{ transition: "d 0.35s ease" }}
        />
        <path
          d={HOURGLASS_OUTLINE_D}
          className="stroke-current"
          strokeWidth="1.1"
          strokeLinejoin="round"
          fill="none"
        />
      </svg>
    </Link>
  );
}
