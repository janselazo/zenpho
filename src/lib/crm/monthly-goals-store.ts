import type { MonthlyGoal } from "@/lib/crm/mock-data";

const MONTHLY_GOAL_NORTH_STAR_IDS_KEY = "monthly-goal-north-star-ids";
const CUSTOM_MONTHLY_GOALS_KEY = "custom-monthly-goals-v1";

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
