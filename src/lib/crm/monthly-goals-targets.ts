/**
 * Persist monthly goal *targets* (clients to win, revenue goal) per calendar month.
 */

const STORAGE_KEY = "crm-monthly-goals-targets-v1";

export type MonthlyGoalTargets = {
  clients: number;
  revenue: number;
};

export function monthKeyFromDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function loadMonthlyGoalTargets(
  ym: string,
  defaults: MonthlyGoalTargets
): MonthlyGoalTargets {
  if (typeof window === "undefined") return defaults;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaults;
    const all = JSON.parse(raw) as Record<string, Partial<MonthlyGoalTargets>>;
    const row = all[ym];
    return {
      clients:
        typeof row?.clients === "number" && row.clients >= 1
          ? Math.floor(row.clients)
          : defaults.clients,
      revenue:
        typeof row?.revenue === "number" && row.revenue >= 1
          ? row.revenue
          : defaults.revenue,
    };
  } catch {
    return defaults;
  }
}

export function saveMonthlyGoalTargets(ym: string, targets: MonthlyGoalTargets) {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const all: Record<string, MonthlyGoalTargets> = raw
      ? (JSON.parse(raw) as Record<string, MonthlyGoalTargets>)
      : {};
    all[ym] = {
      clients: Math.max(1, Math.floor(targets.clients)),
      revenue: Math.max(1, targets.revenue),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch {
    // ignore quota / private mode
  }
}
