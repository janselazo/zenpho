import {
  MONEY_JOURNAL_HOUR_COMPLETE_BADGE_KEY,
  MONEY_JOURNAL_HOUR_COMPLETE_EVENT,
} from "@/lib/crm/money-journal-types";

type BadgeStateV2 = {
  day: string;
  count: number;
  dismissed: boolean;
};

function localDayKey(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function isLegacyTimestampRaw(raw: string): boolean {
  const t = raw.trim();
  if (!/^\d+$/.test(t)) return false;
  const n = Number(t);
  return Number.isFinite(n) && n > 1e12;
}

function parseState(): BadgeStateV2 | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(MONEY_JOURNAL_HOUR_COMPLETE_BADGE_KEY);
    if (raw == null || raw === "") return null;
    if (isLegacyTimestampRaw(raw)) {
      localStorage.removeItem(MONEY_JOURNAL_HOUR_COMPLETE_BADGE_KEY);
      return null;
    }
    const o = JSON.parse(raw) as unknown;
    if (!o || typeof o !== "object") return null;
    const day = typeof (o as BadgeStateV2).day === "string" ? (o as BadgeStateV2).day : "";
    const count = typeof (o as BadgeStateV2).count === "number" ? (o as BadgeStateV2).count : 0;
    const dismissed = Boolean((o as BadgeStateV2).dismissed);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return null;
    return { day, count: Math.max(0, Math.floor(count)), dismissed };
  } catch {
    try {
      localStorage.removeItem(MONEY_JOURNAL_HOUR_COMPLETE_BADGE_KEY);
    } catch {
      /* ignore */
    }
    return null;
  }
}

function writeState(s: BadgeStateV2): void {
  localStorage.setItem(MONEY_JOURNAL_HOUR_COMPLETE_BADGE_KEY, JSON.stringify(s));
}

/** @deprecated Use {@link readMoneyJournalHourBellDisplay} — kept for callers expecting a boolean. */
export function readMoneyJournalHourCompleteBadge(): boolean {
  return readMoneyJournalHourBellDisplay().show;
}

export function readMoneyJournalHourBellDisplay(): { show: boolean; label: string } {
  if (typeof window === "undefined") return { show: false, label: "" };
  const today = localDayKey();
  const s = parseState();
  if (!s) return { show: false, label: "" };
  if (s.day !== today) {
    try {
      localStorage.removeItem(MONEY_JOURNAL_HOUR_COMPLETE_BADGE_KEY);
    } catch {
      /* ignore */
    }
    return { show: false, label: "" };
  }
  if (s.dismissed || s.count < 1) return { show: false, label: "" };
  return {
    show: true,
    label: s.count === 1 ? "1 Hour" : `${s.count} Hours`,
  };
}

/** Fire after the work block reaches 0:00 (chime + top-bar message). Increments today's completion count. */
export function signalMoneyJournalHourComplete(): void {
  if (typeof window === "undefined") return;
  try {
    const today = localDayKey();
    let s = parseState();
    if (!s || s.day !== today) {
      s = { day: today, count: 0, dismissed: false };
    }
    s.count += 1;
    s.dismissed = false;
    writeState(s);
  } catch {
    return;
  }
  window.dispatchEvent(new CustomEvent(MONEY_JOURNAL_HOUR_COMPLETE_EVENT));
}

export function clearMoneyJournalHourCompleteBadge(): void {
  if (typeof window === "undefined") return;
  try {
    const today = localDayKey();
    const s = parseState();
    if (s && s.day === today) {
      writeState({ ...s, dismissed: true });
    } else {
      localStorage.removeItem(MONEY_JOURNAL_HOUR_COMPLETE_BADGE_KEY);
    }
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new CustomEvent(MONEY_JOURNAL_HOUR_COMPLETE_EVENT));
}
