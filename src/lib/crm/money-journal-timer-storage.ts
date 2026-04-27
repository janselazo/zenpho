import { MONEY_JOURNAL_TIMER_KEY } from "@/lib/crm/money-journal-types";

/**
 * Money Journal timer state is stored in `localStorage` (not `sessionStorage`) so
 * the running 60:00 block is visible in every same-origin tab. `sessionStorage` is
 * per-tab and cannot sync.
 */

export function readMoneyJournalTimerRaw(): string | null {
  if (typeof window === "undefined" || !window.localStorage) return null;
  try {
    const fromLocal = localStorage.getItem(MONEY_JOURNAL_TIMER_KEY);
    if (fromLocal) return fromLocal;
    if (typeof window.sessionStorage !== "undefined") {
      const legacy = sessionStorage.getItem(MONEY_JOURNAL_TIMER_KEY);
      if (legacy) {
        localStorage.setItem(MONEY_JOURNAL_TIMER_KEY, legacy);
        try {
          sessionStorage.removeItem(MONEY_JOURNAL_TIMER_KEY);
        } catch {
          /* ignore */
        }
        return legacy;
      }
    }
  } catch {
    /* private mode, quota, etc. */
  }
  return null;
}

export function writeMoneyJournalTimerRaw(json: string): void {
  if (typeof window === "undefined" || !window.localStorage) return;
  try {
    localStorage.setItem(MONEY_JOURNAL_TIMER_KEY, json);
  } catch {
    /* ignore */
  }
}

export function clearMoneyJournalTimerStorage(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(MONEY_JOURNAL_TIMER_KEY);
  } catch {
    /* ignore */
  }
  try {
    sessionStorage.removeItem(MONEY_JOURNAL_TIMER_KEY);
  } catch {
    /* ignore */
  }
}
