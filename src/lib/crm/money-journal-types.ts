/**
 * Playbook → Money Journal: goal persistence (localStorage) + per-entry shape (Supabase `journal_data`).
 */

export const MONEY_JOURNAL_STORAGE_PREFIX = "zenpho-money-journal:" as const;
export const MONEY_JOURNAL_TIMER_KEY = "zenpho-money-journal:timer" as const;

/**
 * "Money Journal" is tagged in `time_entry.tags` for filtering and UI.
 * Keep stable; changing breaks queries.
 */
export const MONEY_JOURNAL_TAG = "money-journal" as const;

export type MoneyJournalGoals = {
  majorDefinitePurpose: string;
  northGoalAmount: string;
  northGoalProject: string;
  northGoalDate: string;
  quarterGoalAmount: string;
  dayGoal: string;
  progressDone: string;
  progressTotal: string;
  makeToday: string;
  moneyMadeToday: string;
  hoursWorkedToday: string;
};

export const EMPTY_MONEY_JOURNAL_GOALS: MoneyJournalGoals = {
  majorDefinitePurpose: "",
  northGoalAmount: "",
  northGoalProject: "",
  northGoalDate: "",
  quarterGoalAmount: "",
  dayGoal: "",
  progressDone: "",
  progressTotal: "",
  makeToday: "",
  moneyMadeToday: "",
  hoursWorkedToday: "",
};

export type MoneyJournalEntryPayload = {
  hourNumber: number;
  prospectingDone: string;
  /** When the user pressed Start timer (first time in the block), ISO-8601. */
  timerStartedAtIso?: string;
  /** When the user pressed Stop, the hour hit 0:00, or you logged; ISO-8601. */
  timerStoppedAtIso?: string;
  startTimeLabel: string;
  stopTimeLabel: string;
  moneyPurpose: string;
  workDetail60m: string;
  focusEffortRating: string;
  improveNextHour: string;
  promiseKeepGoing: string;
  billable: boolean;
  projectId: string | null;
  taskId: string | null;
  goalsSnapshot: MoneyJournalGoals;
};

export function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function yearKey(d: Date): string {
  return String(d.getFullYear());
}

export function quarterKey(d: Date): string {
  const y = d.getFullYear();
  const q = Math.floor(d.getMonth() / 3) + 1;
  return `${y}-Q${q}`;
}

export function dayKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function lsKeyYear(y: string): string {
  return `${MONEY_JOURNAL_STORAGE_PREFIX}goals:year:${y}`;
}
function lsKeyQuarter(q: string): string {
  return `${MONEY_JOURNAL_STORAGE_PREFIX}goals:quarter:${q}`;
}
function lsKeyDay(day: string): string {
  return `${MONEY_JOURNAL_STORAGE_PREFIX}goals:day:${day}`;
}

type YearSlice = Pick<
  MoneyJournalGoals,
  "majorDefinitePurpose" | "northGoalAmount" | "northGoalProject" | "northGoalDate"
>;
type QuarterSlice = Pick<MoneyJournalGoals, "quarterGoalAmount">;
type DaySlice = Pick<
  MoneyJournalGoals,
  | "dayGoal"
  | "progressDone"
  | "progressTotal"
  | "makeToday"
  | "moneyMadeToday"
  | "hoursWorkedToday"
>;

function parseJson<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function loadMoneyJournalGoalsForDate(d: Date): MoneyJournalGoals {
  if (!isBrowser()) return { ...EMPTY_MONEY_JOURNAL_GOALS };
  const y = yearKey(d);
  const qk = quarterKey(d);
  const dk = dayKey(d);
  const year = parseJson<YearSlice>(localStorage.getItem(lsKeyYear(y)), {
    majorDefinitePurpose: "",
    northGoalAmount: "",
    northGoalProject: "",
    northGoalDate: "",
  });
  const quarter = parseJson<QuarterSlice>(localStorage.getItem(lsKeyQuarter(qk)), {
    quarterGoalAmount: "",
  });
  const day = parseJson<DaySlice>(localStorage.getItem(lsKeyDay(dk)), {
    dayGoal: "",
    progressDone: "",
    progressTotal: "",
    makeToday: "",
    moneyMadeToday: "",
    hoursWorkedToday: "",
  });
  return { ...year, ...quarter, ...day };
}

export function saveMoneyJournalGoalsFull(goals: MoneyJournalGoals, d: Date): void {
  if (!isBrowser()) return;
  const y = yearKey(d);
  const qk = quarterKey(d);
  const dk = dayKey(d);
  const yearSlice: YearSlice = {
    majorDefinitePurpose: goals.majorDefinitePurpose,
    northGoalAmount: goals.northGoalAmount,
    northGoalProject: goals.northGoalProject,
    northGoalDate: goals.northGoalDate,
  };
  const quarterSlice: QuarterSlice = { quarterGoalAmount: goals.quarterGoalAmount };
  const daySlice: DaySlice = {
    dayGoal: goals.dayGoal,
    progressDone: goals.progressDone,
    progressTotal: goals.progressTotal,
    makeToday: goals.makeToday,
    moneyMadeToday: goals.moneyMadeToday,
    hoursWorkedToday: goals.hoursWorkedToday,
  };
  try {
    localStorage.setItem(lsKeyYear(y), JSON.stringify(yearSlice));
    localStorage.setItem(lsKeyQuarter(qk), JSON.stringify(quarterSlice));
    localStorage.setItem(lsKeyDay(dk), JSON.stringify(daySlice));
  } catch {
    // quota / private mode
  }
}

export function hasHourSpecificContent(values: {
  prospectingDone: boolean;
  moneyPurpose: string;
  workDetail60m: string;
  focusEffortRating: string;
  improveNextHour: string;
  promiseKeepGoing: string;
}): boolean {
  if (values.prospectingDone) return true;
  return Object.entries(values)
    .filter(([k]) => k !== "prospectingDone")
    .some(([, v]) => String(v).trim().length > 0);
}
