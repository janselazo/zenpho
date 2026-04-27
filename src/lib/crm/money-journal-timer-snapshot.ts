import { MONEY_JOURNAL_TIMER_KEY } from "@/lib/crm/money-journal-types";

const DURATION_MS = 60 * 60 * 1000;

type PersistedTimerV1 = {
  v: 1;
  status: "idle" | "running" | "paused" | "complete";
  firstStartMs: number | null;
  targetEndAt: number | null;
  pausedRemainingMs: number | null;
  userSessionStopAtMs: number | null;
  completeLogRange: { startMs: number; endMs: number } | null;
  completedChime: boolean;
};

export type MoneyJournalTimerTopBarSnapshot = {
  show: boolean;
  /** 0..1 of the 60m block. */
  progress: number;
  /** ms left in the 60m block. */
  remainingMs: number;
  status: PersistedTimerV1["status"];
  /** e.g. "45:00" for aria-label. */
  mmss: string;
};

function fmtMmss(remainingMs: number): string {
  const m = Math.max(0, Math.floor(remainingMs / 60000));
  const s = Math.max(0, Math.floor((remainingMs % 60000) / 1000));
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/**
 * Read Money Journal timer state from session storage (must match
 * `MoneyJournalTimer` persist shape). Works with no Playbook view mounted: uses
 * `targetEndAt - Date.now()` for running.
 */
export function getMoneyJournalTimerSnapshot(): MoneyJournalTimerTopBarSnapshot | null {
  if (typeof window === "undefined" || !window.sessionStorage) return null;
  try {
    const raw = window.sessionStorage.getItem(MONEY_JOURNAL_TIMER_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as PersistedTimerV1;
    if (p.v !== 1) return null;
    if (p.userSessionStopAtMs === undefined) p.userSessionStopAtMs = null;

    if (p.status === "complete" && p.completeLogRange) {
      return {
        show: true,
        progress: 1,
        remainingMs: 0,
        status: "complete",
        mmss: "00:00",
      };
    }

    if (p.status === "running" && p.targetEndAt) {
      const remainingMs = Math.max(0, p.targetEndAt - Date.now());
      const progress = Math.min(1, Math.max(0, 1 - remainingMs / DURATION_MS));
      return {
        show: true,
        progress,
        remainingMs,
        status: "running",
        mmss: fmtMmss(remainingMs),
      };
    }

    if (p.status === "paused" && p.pausedRemainingMs != null) {
      const remainingMs = Math.max(0, p.pausedRemainingMs);
      const progress = Math.min(1, Math.max(0, 1 - remainingMs / DURATION_MS));
      return {
        show: true,
        progress,
        remainingMs,
        status: "paused",
        mmss: fmtMmss(remainingMs),
      };
    }
  } catch {
    return null;
  }
  return null;
}
