import dynamic from "next/dynamic";
import type { DailyMoneyPoint } from "@/lib/crm/transaction-series";
import { getLastSevenDaysMoney } from "@/lib/crm/transaction-series";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

const DashboardView = dynamic(() => import("@/components/crm/DashboardView"), {
  loading: () => (
    <div className="flex min-h-[50vh] items-center justify-center p-8 text-sm text-text-secondary dark:text-zinc-400">
      Loading dashboard…
    </div>
  ),
});

async function getCounts() {
  const supabase = await createClient();
  const startOfWeek = new Date();
  startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
  startOfWeek.setHours(0, 0, 0, 0);
  const startIso = startOfWeek.toISOString();
  const weekStartDate = startIso.slice(0, 10);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const [leads, appts, revenue, expenses] = await Promise.all([
    supabase
      .from("lead")
      .select("*", { count: "exact", head: true })
      .gte("created_at", startIso),
    supabase
      .from("appointment")
      .select("*", { count: "exact", head: true })
      .gte("starts_at", today.toISOString())
      .lt("starts_at", tomorrow.toISOString()),
    supabase
      .from("transaction")
      .select("amount")
      .eq("type", "revenue")
      .gte("date", weekStartDate),
    supabase
      .from("transaction")
      .select("amount")
      .eq("type", "expense")
      .gte("date", weekStartDate),
  ]);

  const revSum =
    revenue.data?.reduce((s, r) => s + Number(r.amount), 0) ?? 0;
  const expSum =
    expenses.data?.reduce((s, r) => s + Number(r.amount), 0) ?? 0;

  return {
    leadsThisWeek: leads.count ?? 0,
    appointmentsToday: appts.count ?? 0,
    revenueWeek: revSum,
    expensesWeek: expSum,
    errors: [leads.error, appts.error, revenue.error, expenses.error].filter(
      Boolean
    ),
  };
}

export default async function DashboardPage() {
  if (!isSupabaseConfigured()) {
    return (
      <div className="p-8">
        <h1 className="heading-display text-2xl font-bold text-text-primary dark:text-zinc-50">
          Dashboard
        </h1>
        <p className="mt-2 text-text-secondary dark:text-zinc-400">
          Configure Supabase to load live KPIs.
        </p>
      </div>
    );
  }

  let counts = {
    leadsThisWeek: 0,
    appointmentsToday: 0,
    revenueWeek: 0,
    expensesWeek: 0,
    errors: [] as unknown[],
  };
  let chartData: DailyMoneyPoint[] = [];
  try {
    const [countsResult, chartResult] = await Promise.allSettled([
      getCounts(),
      getLastSevenDaysMoney(),
    ]);
    if (countsResult.status === "fulfilled") {
      counts = countsResult.value;
    }
    if (chartResult.status === "fulfilled") {
      chartData = chartResult.value;
    }
  } catch {
    // schema not applied yet
  }

  return (
    <div className="p-8">
      {counts.errors.length > 0 && (
        <p className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-100">
          Run{" "}
          <code className="font-mono text-xs">supabase/migrations/*.sql</code>{" "}
          in the Supabase SQL editor if tables are missing.
        </p>
      )}
      <DashboardView
        leadsThisWeek={counts.leadsThisWeek}
        appointmentsToday={counts.appointmentsToday}
        revenueWeek={counts.revenueWeek}
        expensesWeek={counts.expensesWeek}
        chartData={chartData}
        hasErrors={counts.errors.length > 0}
      />
    </div>
  );
}
