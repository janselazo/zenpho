"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getMoneyJournalTimerSnapshot } from "@/lib/crm/money-journal-timer-snapshot";

const R = 5;
const C = 2 * Math.PI * R;

function timerRingPath(progress: number) {
  const p = Math.min(1, Math.max(0, progress));
  return C * (1 - p);
}

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

  const dashOffset = timerRingPath(live.progress);
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
        <circle
          cx="8"
          cy="8"
          r={R}
          className="stroke-zinc-200/90 dark:stroke-zinc-600/90"
          strokeWidth="1.4"
        />
        <circle
          cx="8"
          cy="8"
          r={R}
          className="stroke-current"
          strokeWidth="1.4"
          strokeLinecap="round"
          transform="rotate(-90 8 8)"
          strokeDasharray={C}
          strokeDashoffset={dashOffset}
          style={{ transition: "stroke-dashoffset 0.35s ease" }}
        />
      </svg>
    </Link>
  );
}
