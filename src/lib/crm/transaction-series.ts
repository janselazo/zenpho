import { createClient } from "@/lib/supabase/server";
import { enumerateDays } from "@/lib/crm/dashboard-range";

export type DailyMoneyPoint = {
  label: string;
  revenue: number;
  expense: number;
};

/** Last 7 calendar days including today, keyed by local date string. */
export async function getLastSevenDaysMoney(): Promise<DailyMoneyPoint[]> {
  const supabase = await createClient();
  const days: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().slice(0, 10));
  }
  const startStr = days[0]!;

  const { data, error } = await supabase
    .from("transaction")
    .select("date, type, amount")
    .gte("date", startStr)
    .order("date", { ascending: true });

  if (error) {
    return [];
  }

  const map: Record<string, { revenue: number; expense: number }> = {};
  for (const d of days) {
    map[d] = { revenue: 0, expense: 0 };
  }
  for (const row of data ?? []) {
    const key = row.date as string;
    if (!map[key]) continue;
    const n = Number(row.amount);
    if (row.type === "revenue") map[key].revenue += n;
    else if (row.type === "expense") map[key].expense += n;
  }

  return days.map((d) => {
    const short = new Date(d + "T12:00:00");
    return {
      label: short.toLocaleDateString(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
      }),
      revenue: map[d].revenue,
      expense: map[d].expense,
    };
  });
}

function parseLocalYmd(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function toLocalYmd(d: Date): string {
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${mo}-${day}`;
}

/** Sunday-start week containing `d` (local). */
function startOfWeekSunday(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  x.setDate(x.getDate() - x.getDay());
  return x;
}

function dayKeyFromTimestamptz(iso: string): string {
  return toLocalYmd(new Date(iso));
}

type RangeBucketPlan = {
  bucketKeys: string[];
  bucketLabel: Record<string, string>;
  useMonthly: boolean;
  useWeekly: boolean;
};

/** Daily / weekly / monthly buckets for dashboard charts (same span as `enumerateDays`). */
function planRangeBuckets(from: string, to: string): RangeBucketPlan | null {
  const days = enumerateDays(from, to);
  if (days.length === 0) return null;

  const useMonthly = days.length > 120;
  const useWeekly = !useMonthly && days.length > 45;
  const bucketKeys: string[] = [];
  const bucketLabel: Record<string, string> = {};

  if (!useWeekly && !useMonthly) {
    for (const d of days) {
      bucketKeys.push(d);
      const dt = parseLocalYmd(d);
      bucketLabel[d] = dt.toLocaleDateString(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
      });
    }
  } else if (useMonthly) {
    const seen = new Set<string>();
    for (const d of days) {
      const ym = d.slice(0, 7);
      if (!seen.has(ym)) {
        seen.add(ym);
        bucketKeys.push(ym);
        const dt = parseLocalYmd(`${ym}-01`);
        bucketLabel[ym] = dt.toLocaleDateString(undefined, {
          month: "short",
          year: "numeric",
        });
      }
    }
  } else {
    const seen = new Set<string>();
    for (const d of days) {
      const ws = startOfWeekSunday(parseLocalYmd(d));
      const key = toLocalYmd(ws);
      if (!seen.has(key)) {
        seen.add(key);
        bucketKeys.push(key);
        bucketLabel[key] = ws.toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
        });
      }
    }
  }

  return { bucketKeys, bucketLabel, useMonthly, useWeekly };
}

function bucketForDayKey(
  keyDay: string,
  plan: RangeBucketPlan
): string {
  if (plan.useMonthly) return keyDay.slice(0, 7);
  if (plan.useWeekly)
    return toLocalYmd(startOfWeekSunday(parseLocalYmd(keyDay)));
  return keyDay;
}

/**
 * Revenue & expense per day or per week (if range > 45 days), inclusive `from`–`to`.
 */
export async function getMoneySeriesForRange(
  from: string,
  to: string
): Promise<DailyMoneyPoint[]> {
  const supabase = await createClient();
  const plan = planRangeBuckets(from, to);
  if (!plan) return [];

  const { data, error } = await supabase
    .from("transaction")
    .select("date, type, amount")
    .gte("date", from)
    .lte("date", to);

  if (error) {
    return [];
  }

  const sums: Record<string, { revenue: number; expense: number }> = {};
  for (const k of plan.bucketKeys) {
    sums[k] = { revenue: 0, expense: 0 };
  }

  for (const row of data ?? []) {
    const keyDay = row.date as string;
    if (keyDay < from || keyDay > to) continue;
    const bucket = bucketForDayKey(keyDay, plan);
    if (!sums[bucket]) continue;
    const n = Number(row.amount);
    if (row.type === "revenue") sums[bucket].revenue += n;
    else if (row.type === "expense") sums[bucket].expense += n;
  }

  return plan.bucketKeys.map((k) => ({
    label: plan.bucketLabel[k] ?? k,
    revenue: sums[k].revenue,
    expense: sums[k].expense,
  }));
}

/**
 * Sum of project `budget` per bucket by `created_at` (matches funnel “booked” revenue semantics).
 */
export async function getProjectBudgetSeriesForRange(
  from: string,
  to: string
): Promise<{ label: string; revenue: number }[]> {
  const plan = planRangeBuckets(from, to);
  if (!plan) return [];

  const emptySeries = () =>
    plan.bucketKeys.map((k) => ({
      label: plan.bucketLabel[k] ?? k,
      revenue: 0,
    }));

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("project")
    .select("created_at, budget")
    .is("parent_project_id", null)
    .gte("created_at", `${from}T00:00:00.000Z`)
    .lte("created_at", `${to}T23:59:59.999Z`);

  if (error) {
    return emptySeries();
  }

  const sums: Record<string, number> = {};
  for (const k of plan.bucketKeys) {
    sums[k] = 0;
  }

  for (const row of data ?? []) {
    const keyDay = dayKeyFromTimestamptz(row.created_at as string);
    if (keyDay < from || keyDay > to) continue;
    const bucket = bucketForDayKey(keyDay, plan);
    if (sums[bucket] === undefined) continue;
    sums[bucket] += Number(row.budget ?? 0);
  }

  return plan.bucketKeys.map((k) => ({
    label: plan.bucketLabel[k] ?? k,
    revenue: sums[k],
  }));
}
