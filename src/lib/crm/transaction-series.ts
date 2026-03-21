import { createClient } from "@/lib/supabase/server";

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
