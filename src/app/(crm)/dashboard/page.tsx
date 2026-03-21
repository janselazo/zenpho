import Link from "next/link";
import DashboardCharts from "@/components/crm/DashboardCharts";
import { getLastSevenDaysMoney } from "@/lib/crm/transaction-series";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

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
        <h1 className="heading-display text-2xl font-bold text-text-primary">
          Dashboard
        </h1>
        <p className="mt-2 text-text-secondary">
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
  try {
    counts = await getCounts();
  } catch {
    // schema not applied yet
  }

  const profit = counts.revenueWeek - counts.expensesWeek;

  const chartData = await getLastSevenDaysMoney();

  const schemaIssue =
    counts.errors.length > 0 ? (
      <p className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
        Run{" "}
        <code className="font-mono text-xs">supabase/migrations/*.sql</code> in
        the Supabase SQL editor if tables are missing.
      </p>
    ) : null;

  return (
    <div className="p-8">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="heading-display text-2xl font-bold text-text-primary">
            Dashboard
          </h1>
          <p className="text-sm text-text-secondary">
            This week · at-a-glance
          </p>
        </div>
        <Link
          href="/leads"
          className="text-sm font-medium text-accent hover:underline"
        >
          Manage leads →
        </Link>
      </div>

      {schemaIssue}

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <KpiCard
          label="New leads (week)"
          value={String(counts.leadsThisWeek)}
        />
        <KpiCard
          label="Appointments today"
          value={String(counts.appointmentsToday)}
        />
        <KpiCard
          label="Revenue (week)"
          value={formatMoney(counts.revenueWeek)}
        />
        <KpiCard
          label="Expenses (week)"
          value={formatMoney(counts.expensesWeek)}
        />
        <KpiCard label="Profit (week)" value={formatMoney(profit)} accent />
      </div>

      {counts.errors.length === 0 ? (
        <DashboardCharts data={chartData} />
      ) : null}
    </div>
  );
}

function formatMoney(n: number) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

function KpiCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border border-border bg-white p-5 shadow-sm ${
        accent ? "ring-1 ring-accent/20" : ""
      }`}
    >
      <p className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
        {label}
      </p>
      <p
        className={`mt-2 text-2xl font-bold tracking-tight ${
          accent ? "text-accent" : "text-text-primary"
        }`}
      >
        {value}
      </p>
    </div>
  );
}
