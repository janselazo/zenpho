import {
  MONEY_JOURNAL_HOUR_COMPLETE_BADGE_KEY,
  MONEY_JOURNAL_HOUR_COMPLETE_EVENT,
} from "@/lib/crm/money-journal-types";

export function readMoneyJournalHourCompleteBadge(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return Boolean(localStorage.getItem(MONEY_JOURNAL_HOUR_COMPLETE_BADGE_KEY));
  } catch {
    return false;
  }
}

/** Fire after the work block reaches 0:00 (chime + top-bar badge). */
export function signalMoneyJournalHourComplete(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(MONEY_JOURNAL_HOUR_COMPLETE_BADGE_KEY, String(Date.now()));
  } catch {
    return;
  }
  window.dispatchEvent(new CustomEvent(MONEY_JOURNAL_HOUR_COMPLETE_EVENT));
}

export function clearMoneyJournalHourCompleteBadge(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(MONEY_JOURNAL_HOUR_COMPLETE_BADGE_KEY);
  } catch {
    return;
  }
  window.dispatchEvent(new CustomEvent(MONEY_JOURNAL_HOUR_COMPLETE_EVENT));
}
