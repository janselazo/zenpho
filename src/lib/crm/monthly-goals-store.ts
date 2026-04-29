import type { MonthlyGoal } from "@/lib/crm/mock-data";

const MONTHLY_GOAL_NORTH_STAR_IDS_KEY = "monthly-goal-north-star-ids";
const CUSTOM_MONTHLY_GOALS_KEY = "custom-monthly-goals-v1";
const MONTHLY_GOAL_DEADLINES_KEY = "crm-monthly-goal-deadlines-v1";

function parseGoalIdsJson(parsed: unknown): string[] | null {
  if (!Array.isArray(parsed)) return null;
  const out: string[] = [];
  const seen = new Set<string>();
  for (const item of parsed) {
    if (typeof item !== "string" || !item) continue;
    if (seen.has(item)) continue;
    seen.add(item);
    out.push(item);
  }
  return out;
}

export function loadNorthStarGoalIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(MONTHLY_GOAL_NORTH_STAR_IDS_KEY);
    if (!raw) return [];
    return parseGoalIdsJson(JSON.parse(raw) as unknown) ?? [];
  } catch {
    return [];
  }
}

export function saveNorthStarGoalIds(ids: string[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(MONTHLY_GOAL_NORTH_STAR_IDS_KEY, JSON.stringify(ids));
  } catch {
    // ignore quota / private mode
  }
}

export function pruneNorthStarGoalIds(
  goalIds: string[],
  existingGoalIds: readonly string[]
): string[] {
  const valid = new Set(existingGoalIds);
  return goalIds.filter((id) => valid.has(id));
}

function isMonthlyGoal(v: unknown): v is MonthlyGoal {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  return (
    typeof o.id === "string" &&
    typeof o.title === "string" &&
    typeof o.current === "number" &&
    typeof o.target === "number" &&
    (o.unit === "count" || o.unit === "currency") &&
    typeof o.icon === "string"
  );
}

function parseMonthlyGoalsJson(parsed: unknown): MonthlyGoal[] | null {
  if (!Array.isArray(parsed)) return null;
  return parsed.filter(isMonthlyGoal);
}

function isYmd(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export function loadCustomMonthlyGoals(ym: string): MonthlyGoal[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(CUSTOM_MONTHLY_GOALS_KEY);
    if (!raw) return [];
    const all = JSON.parse(raw) as Record<string, unknown>;
    return parseMonthlyGoalsJson(all[ym]) ?? [];
  } catch {
    return [];
  }
}

export function saveCustomMonthlyGoals(ym: string, goals: MonthlyGoal[]) {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(CUSTOM_MONTHLY_GOALS_KEY);
    const all = raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
    all[ym] = goals;
    localStorage.setItem(CUSTOM_MONTHLY_GOALS_KEY, JSON.stringify(all));
  } catch {
    // ignore quota / private mode
  }
}

export function loadMonthlyGoalDeadlines(ym: string): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(MONTHLY_GOAL_DEADLINES_KEY);
    if (!raw) return {};
    const all = JSON.parse(raw) as Record<string, unknown>;
    const row = all[ym];
    if (!row || typeof row !== "object") return {};
    const out: Record<string, string> = {};
    for (const [goalId, dueDate] of Object.entries(row)) {
      if (goalId && isYmd(dueDate)) out[goalId] = dueDate;
    }
    return out;
  } catch {
    return {};
  }
}

export function saveMonthlyGoalDeadlines(ym: string, goals: MonthlyGoal[]) {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(MONTHLY_GOAL_DEADLINES_KEY);
    const all: Record<string, Record<string, string>> = raw
      ? (JSON.parse(raw) as Record<string, Record<string, string>>)
      : {};
    const row: Record<string, string> = {};
    for (const goal of goals) {
      if (isYmd(goal.dueDate)) row[goal.id] = goal.dueDate;
    }
    all[ym] = row;
    localStorage.setItem(MONTHLY_GOAL_DEADLINES_KEY, JSON.stringify(all));
  } catch {
    // ignore quota / private mode
  }
}

const GOALS_SECTIONS_COLLAPSED_KEY = "crm-goals-sections-collapsed-v1";

/** Ids for Goals tab section cards (North Star, Monthly Goals). */
export const GOALS_SECTION_IDS = {
  northStar: "goals-north-star",
  monthly: "goals-monthly",
} as const;

/** Collapsed section ids (`true` = collapsed). Unknown keys default to expanded. */
export function loadGoalsSectionCollapsed(): Record<string, boolean> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(GOALS_SECTIONS_COLLAPSED_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return {};
    const out: Record<string, boolean> = {};
    for (const [k, v] of Object.entries(parsed)) {
      if (typeof k === "string" && v === true) out[k] = true;
    }
    return out;
  } catch {
    return {};
  }
}

export function saveGoalsSectionCollapsed(collapsed: Record<string, boolean>) {
  if (typeof window === "undefined") return;
  try {
    const stripped: Record<string, boolean> = {};
    for (const [k, v] of Object.entries(collapsed)) {
      if (v) stripped[k] = true;
    }
    localStorage.setItem(
      GOALS_SECTIONS_COLLAPSED_KEY,
      JSON.stringify(stripped)
    );
  } catch {
    // ignore quota / private mode
  }
}
