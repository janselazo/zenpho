import type { MonthlyGoal } from "@/lib/crm/mock-data";
import { userScopedStorageKey } from "@/lib/crm/user-scoped-storage";

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

export function loadNorthStarGoalIds(userId?: string | null): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(
      userScopedStorageKey(MONTHLY_GOAL_NORTH_STAR_IDS_KEY, userId)
    );
    if (!raw) return [];
    return parseGoalIdsJson(JSON.parse(raw) as unknown) ?? [];
  } catch {
    return [];
  }
}

export function saveNorthStarGoalIds(ids: string[], userId?: string | null) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(
      userScopedStorageKey(MONTHLY_GOAL_NORTH_STAR_IDS_KEY, userId),
      JSON.stringify(ids)
    );
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

export function loadCustomMonthlyGoals(
  ym: string,
  userId?: string | null
): MonthlyGoal[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(
      userScopedStorageKey(CUSTOM_MONTHLY_GOALS_KEY, userId)
    );
    if (!raw) return [];
    const all = JSON.parse(raw) as Record<string, unknown>;
    return parseMonthlyGoalsJson(all[ym]) ?? [];
  } catch {
    return [];
  }
}

export function saveCustomMonthlyGoals(
  ym: string,
  goals: MonthlyGoal[],
  userId?: string | null
) {
  if (typeof window === "undefined") return;
  try {
    const key = userScopedStorageKey(CUSTOM_MONTHLY_GOALS_KEY, userId);
    const raw = localStorage.getItem(key);
    const all = raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
    all[ym] = goals;
    localStorage.setItem(key, JSON.stringify(all));
  } catch {
    // ignore quota / private mode
  }
}

export function loadMonthlyGoalDeadlines(
  ym: string,
  userId?: string | null
): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(
      userScopedStorageKey(MONTHLY_GOAL_DEADLINES_KEY, userId)
    );
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

export function saveMonthlyGoalDeadlines(
  ym: string,
  goals: MonthlyGoal[],
  userId?: string | null
) {
  if (typeof window === "undefined") return;
  try {
    const key = userScopedStorageKey(MONTHLY_GOAL_DEADLINES_KEY, userId);
    const raw = localStorage.getItem(key);
    const all: Record<string, Record<string, string>> = raw
      ? (JSON.parse(raw) as Record<string, Record<string, string>>)
      : {};
    const row: Record<string, string> = {};
    for (const goal of goals) {
      if (isYmd(goal.dueDate)) row[goal.id] = goal.dueDate;
    }
    all[ym] = row;
    localStorage.setItem(key, JSON.stringify(all));
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
export function loadGoalsSectionCollapsed(
  userId?: string | null
): Record<string, boolean> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(
      userScopedStorageKey(GOALS_SECTIONS_COLLAPSED_KEY, userId)
    );
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

export function saveGoalsSectionCollapsed(
  collapsed: Record<string, boolean>,
  userId?: string | null
) {
  if (typeof window === "undefined") return;
  try {
    const stripped: Record<string, boolean> = {};
    for (const [k, v] of Object.entries(collapsed)) {
      if (v) stripped[k] = true;
    }
    localStorage.setItem(
      userScopedStorageKey(GOALS_SECTIONS_COLLAPSED_KEY, userId),
      JSON.stringify(stripped)
    );
  } catch {
    // ignore quota / private mode
  }
}
