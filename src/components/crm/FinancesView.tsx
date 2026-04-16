"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  DollarSign,
  Loader2,
  Plus,
  Pencil,
  Trash2,
  TrendingDown,
  TrendingUp,
  X,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  getIncomeSources,
  createIncomeSource,
  updateIncomeSource,
  deleteIncomeSource,
  getIncomeEntries,
  upsertIncomeEntry,
  getFixedExpenses,
  createFixedExpense,
  updateFixedExpense,
  deleteFixedExpense,
  getVariableExpenses,
  addVariableExpense,
  updateVariableExpense,
  deleteVariableExpense,
  getMonthlyOverview,
  getDailyIncomeLogs,
  upsertDailyIncomeLog,
  deleteDailyIncomeLog,
} from "@/app/(crm)/actions/finances";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type IncomeSource = {
  id: string;
  name: string;
  kind: string;
  is_active: boolean;
  sort_order: number;
};

type IncomeEntry = {
  id: string;
  income_source_id: string;
  month: string;
  hours: number;
  revenue: number;
  expenses: number;
  notes: string | null;
  income_source: IncomeSource | null;
};

type FixedExpense = {
  id: string;
  name: string;
  amount: number;
  due_day: number;
  category: string | null;
  is_active: boolean;
};

type VariableExpenseEntry = {
  id: string;
  category: string;
  amount: number;
  date: string;
  description: string | null;
};

type MonthlyOverview = {
  totalIncome: number;
  totalIncomeExpenses: number;
  totalFixedExpenses: number;
  totalVariableExpenses: number;
  totalExpenses: number;
  net: number;
};

type DailyIncomeLog = {
  id: string;
  income_source_id: string;
  date: string;
  amount: number;
  hours: number;
  notes: string | null;
  income_source: { id: string; name: string; kind: string } | null;
};

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TABS = ["Overview", "Income", "Fixed Expenses", "Variable Expenses"] as const;
type Tab = (typeof TABS)[number];

const KIND_LABELS: Record<string, string> = {
  job: "Job",
  agency: "Agency",
  software_product: "Software",
  freelance: "Freelance",
  other: "Other",
};

const KIND_COLORS: Record<string, string> = {
  job: "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400",
  agency: "bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-400",
  software_product: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400",
  freelance: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
  other: "bg-zinc-100 text-zinc-600 dark:bg-zinc-700/40 dark:text-zinc-400",
};

const SOURCE_LINE_COLORS = [
  "#2563eb", "#8b5cf6", "#10b981", "#f59e0b", "#ef4444",
  "#06b6d4", "#ec4899", "#84cc16", "#f97316", "#6366f1",
];

const VARIABLE_CATEGORIES = [
  "FPL",
  "Grocery",
  "House Products",
  "Gas & Air",
  "Sunpass",
  "Parking",
  "Car Maintenance",
  "Dining Out",
  "Dentist",
  "Education",
  "Clothes",
  "Haircut & Shaving",
  "Amazon",
  "Medicines",
  "Facebook Ads",
  "Zelle",
  "Hostinger",
  "Cash",
  "Other",
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function daysInMonth(monthStr: string): number {
  const [y, m] = monthStr.split("-").map(Number);
  return new Date(y, m, 0).getDate();
}

function fmt(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

function monthLabel(monthStr: string): string {
  const [y, m] = monthStr.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

function prevMonth(monthStr: string): string {
  const [y, m] = monthStr.split("-").map(Number);
  const d = new Date(y, m - 2, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

function nextMonth(monthStr: string): string {
  const [y, m] = monthStr.split("-").map(Number);
  const d = new Date(y, m, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

function currentMonthStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function FinancesView() {
  const [tab, setTab] = useState<Tab>("Overview");
  const [month, setMonth] = useState(currentMonthStr);
  const [loading, setLoading] = useState(true);

  // Data
  const [sources, setSources] = useState<IncomeSource[]>([]);
  const [entries, setEntries] = useState<IncomeEntry[]>([]);
  const [fixedExpenses, setFixedExpenses] = useState<FixedExpense[]>([]);
  const [variableExpenses, setVariableExpenses] = useState<VariableExpenseEntry[]>([]);
  const [overview, setOverview] = useState<MonthlyOverview | null>(null);
  const [dailyLogs, setDailyLogs] = useState<DailyIncomeLog[]>([]);

  const days = useMemo(() => daysInMonth(month), [month]);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [srcRes, entRes, fixRes, varRes, ovRes, dailyRes] = await Promise.all([
        getIncomeSources(),
        getIncomeEntries(month),
        getFixedExpenses(),
        getVariableExpenses(month),
        getMonthlyOverview(month),
        getDailyIncomeLogs(month),
      ]);
      if (srcRes.data) setSources(srcRes.data as IncomeSource[]);
      if (entRes.data) setEntries(entRes.data as IncomeEntry[]);
      if (fixRes.data) setFixedExpenses(fixRes.data as FixedExpense[]);
      if (varRes.data) setVariableExpenses(varRes.data as VariableExpenseEntry[]);
      setOverview(ovRes as MonthlyOverview);
      if (dailyRes.data) setDailyLogs(dailyRes.data as DailyIncomeLog[]);
    } catch {
      /* tables may not exist yet */
    } finally {
      setLoading(false);
    }
  }, [month]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  // Chart data for overview
  const overviewChartData = useMemo(() => {
    if (!overview) return [];
    return [
      { name: "Income", amount: overview.totalIncome },
      { name: "Fixed Exp.", amount: overview.totalFixedExpenses },
      { name: "Variable Exp.", amount: overview.totalVariableExpenses },
      { name: "Biz Expenses", amount: overview.totalIncomeExpenses },
      { name: "Net", amount: overview.net },
    ];
  }, [overview]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-text-primary dark:text-zinc-50">
          Finances
        </h1>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setMonth(prevMonth(month))}
            className="rounded-lg border border-border p-1.5 text-text-secondary hover:bg-surface dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="min-w-[160px] text-center text-sm font-semibold text-text-primary dark:text-zinc-100">
            {monthLabel(month)}
          </span>
          <button
            type="button"
            onClick={() => setMonth(nextMonth(month))}
            className="rounded-lg border border-border p-1.5 text-text-secondary hover:bg-surface dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto rounded-xl border border-border bg-surface/50 p-1 dark:border-zinc-800 dark:bg-zinc-900/60">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              tab === t
                ? "bg-white text-text-primary shadow-sm dark:bg-zinc-800 dark:text-zinc-100"
                : "text-text-secondary hover:text-text-primary dark:text-zinc-400 dark:hover:text-zinc-200"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex min-h-[30vh] items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-text-secondary dark:text-zinc-500" />
        </div>
      ) : (
        <>
          {tab === "Overview" && (
            <OverviewTab
              overview={overview}
              entries={entries}
              sources={sources}
              days={days}
              chartData={overviewChartData}
              dailyLogs={dailyLogs}
              month={month}
              onReload={loadAll}
            />
          )}
          {tab === "Income" && (
            <IncomeTab
              sources={sources}
              entries={entries}
              month={month}
              days={days}
              onReload={loadAll}
            />
          )}
          {tab === "Fixed Expenses" && (
            <FixedExpensesTab
              expenses={fixedExpenses}
              days={days}
              onReload={loadAll}
            />
          )}
          {tab === "Variable Expenses" && (
            <VariableExpensesTab
              expenses={variableExpenses}
              month={month}
              days={days}
              onReload={loadAll}
            />
          )}
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Overview Tab
// ---------------------------------------------------------------------------

function OverviewTab({
  overview,
  entries,
  sources,
  days,
  chartData,
  dailyLogs,
  month,
  onReload,
}: {
  overview: MonthlyOverview | null;
  entries: IncomeEntry[];
  sources: IncomeSource[];
  days: number;
  chartData: { name: string; amount: number }[];
  dailyLogs: DailyIncomeLog[];
  month: string;
  onReload: () => Promise<void>;
}) {
  const [showAddDaily, setShowAddDaily] = useState(false);
  const [savingDaily, setSavingDaily] = useState(false);

  const activeSources = useMemo(
    () => sources.filter((s) => s.is_active),
    [sources]
  );

  const dailyChartData = useMemo(() => {
    if (dailyLogs.length === 0) return [];
    const dateMap = new Map<string, Record<string, number>>();
    for (const log of dailyLogs) {
      const dayKey = log.date;
      const sourceName = log.income_source?.name ?? "Unknown";
      const existing = dateMap.get(dayKey) ?? {};
      existing[sourceName] = (existing[sourceName] ?? 0) + Number(log.amount);
      dateMap.set(dayKey, existing);
    }
    return [...dateMap.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, amounts]) => ({
        date: new Date(date + "T12:00:00").toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        }),
        ...amounts,
      }));
  }, [dailyLogs]);

  const dailySourceNames = useMemo(() => {
    const names = new Set<string>();
    for (const log of dailyLogs) {
      names.add(log.income_source?.name ?? "Unknown");
    }
    return [...names];
  }, [dailyLogs]);

  async function handleAddDaily(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSavingDaily(true);
    const fd = new FormData(e.currentTarget);
    await upsertDailyIncomeLog(fd);
    setShowAddDaily(false);
    await onReload();
    setSavingDaily(false);
  }

  async function handleDeleteDaily(id: string) {
    if (!confirm("Delete this daily entry?")) return;
    await deleteDailyIncomeLog(id);
    await onReload();
  }

  if (!overview) {
    return (
      <p className="text-sm text-text-secondary dark:text-zinc-400">
        No data for this month.
      </p>
    );
  }

  const cards = [
    {
      label: "Total Income",
      value: overview.totalIncome,
      daily: overview.totalIncome / days,
      color: "text-emerald-600 dark:text-emerald-400",
      bg: "bg-emerald-50 dark:bg-emerald-500/10",
      icon: <TrendingUp className="h-5 w-5" />,
    },
    {
      label: "Fixed Expenses",
      value: overview.totalFixedExpenses,
      daily: overview.totalFixedExpenses / days,
      color: "text-red-600 dark:text-red-400",
      bg: "bg-red-50 dark:bg-red-500/10",
      icon: <ArrowDownRight className="h-5 w-5" />,
    },
    {
      label: "Variable Expenses",
      value: overview.totalVariableExpenses,
      daily: overview.totalVariableExpenses / days,
      color: "text-orange-600 dark:text-orange-400",
      bg: "bg-orange-50 dark:bg-orange-500/10",
      icon: <TrendingDown className="h-5 w-5" />,
    },
    {
      label: "Net Profit / Loss",
      value: overview.net,
      daily: overview.net / days,
      color:
        overview.net >= 0
          ? "text-emerald-600 dark:text-emerald-400"
          : "text-red-600 dark:text-red-400",
      bg:
        overview.net >= 0
          ? "bg-emerald-50 dark:bg-emerald-500/10"
          : "bg-red-50 dark:bg-red-500/10",
      icon:
        overview.net >= 0 ? (
          <ArrowUpRight className="h-5 w-5" />
        ) : (
          <ArrowDownRight className="h-5 w-5" />
        ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <div
            key={c.label}
            className="rounded-2xl border border-border bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/80"
          >
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wider text-text-secondary dark:text-zinc-500">
                {c.label}
              </p>
              <span className={`rounded-lg p-1.5 ${c.bg} ${c.color}`}>
                {c.icon}
              </span>
            </div>
            <p className={`mt-2 text-2xl font-bold tracking-tight ${c.color}`}>
              {fmt(c.value)}
            </p>
            <p className="mt-1 text-xs text-text-secondary dark:text-zinc-500">
              {fmt(c.daily)} / day
            </p>
          </div>
        ))}
      </div>

      {/* Individual breakdown charts */}
      {chartData.length > 0 && (() => {
        const ITEM_COLORS: Record<string, string> = {
          Income: "#10b981",
          "Fixed Exp.": "#ef4444",
          "Variable Exp.": "#f59e0b",
          "Biz Expenses": "#8b5cf6",
          Net: overview!.net >= 0 ? "#10b981" : "#ef4444",
        };

        return (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {chartData.map((item) => {
              const color = ITEM_COLORS[item.name] ?? "#2563eb";
              const daily = item.amount / days;
              const miniData = [
                { label: "Daily", value: Math.abs(daily) },
              ];
              return (
                <div
                  key={item.name}
                  className="rounded-2xl border border-border bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/80"
                >
                  <div className="flex items-baseline justify-between">
                    <p className="text-xs font-semibold uppercase tracking-wider text-text-secondary dark:text-zinc-500">
                      {item.name}
                    </p>
                    <p
                      className="text-lg font-bold tabular-nums tracking-tight"
                      style={{ color }}
                    >
                      {fmt(item.amount)}
                    </p>
                  </div>
                  <div className="mt-3 h-[120px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={miniData}
                        margin={{ top: 4, right: 4, left: 0, bottom: 0 }}
                      >
                        <XAxis
                          dataKey="label"
                          tick={{ fontSize: 11, fill: "#5c6370" }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <YAxis
                          tick={{ fontSize: 10, fill: "#5c6370" }}
                          axisLine={false}
                          tickLine={false}
                          width={50}
                          tickFormatter={(v: number) =>
                            v >= 1000 ? `$${(v / 1000).toFixed(1)}k` : `$${v}`
                          }
                        />
                        <Tooltip
                          formatter={(value) => fmt(Number(value ?? 0))}
                          contentStyle={{
                            borderRadius: 10,
                            border: "1px solid #e8ecf1",
                            fontSize: 12,
                          }}
                        />
                        <Bar
                          dataKey="value"
                          name="Daily Income"
                          fill={color}
                          radius={[6, 6, 0, 0]}
                          maxBarSize={56}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <p className="mt-1 text-center text-xs tabular-nums text-text-secondary dark:text-zinc-500">
                    {fmt(daily)} / day
                  </p>
                </div>
              );
            })}
          </div>
        );
      })()}

      {/* Daily Income Tracker */}
      <div className="rounded-2xl border border-border bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900/80">
        <div className="flex items-center justify-between border-b border-border px-6 py-4 dark:border-zinc-800">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-text-secondary dark:text-zinc-400">
            Daily Income by Business
          </h2>
          <button
            type="button"
            onClick={() => setShowAddDaily(!showAddDaily)}
            className="flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-white hover:bg-accent/90 dark:bg-blue-600 dark:hover:bg-blue-500"
          >
            <Plus className="h-3.5 w-3.5" />
            Log Income
          </button>
        </div>

        {showAddDaily && (
          <form
            onSubmit={handleAddDaily}
            className="flex flex-wrap items-end gap-3 border-b border-border bg-surface/30 px-6 py-4 dark:border-zinc-800 dark:bg-zinc-950/30"
          >
            <div>
              <label className="mb-1 block text-xs font-medium text-text-secondary dark:text-zinc-400">
                Business
              </label>
              <select
                name="income_source_id"
                required
                className="rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-accent dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
              >
                <option value="">Select…</option>
                {activeSources.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-text-secondary dark:text-zinc-400">
                Date
              </label>
              <input
                name="date"
                type="date"
                defaultValue={new Date().toISOString().slice(0, 10)}
                className="rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-accent dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-text-secondary dark:text-zinc-400">
                Amount ($)
              </label>
              <input
                name="amount"
                type="number"
                step="0.01"
                required
                placeholder="0.00"
                className="w-28 rounded-lg border border-border bg-white px-3 py-2 text-sm tabular-nums outline-none focus:border-accent dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-text-secondary dark:text-zinc-400">
                Hours
              </label>
              <input
                name="hours"
                type="number"
                step="0.25"
                defaultValue={0}
                className="w-20 rounded-lg border border-border bg-white px-3 py-2 text-sm tabular-nums outline-none focus:border-accent dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
              />
            </div>
            <div className="flex-1">
              <label className="mb-1 block text-xs font-medium text-text-secondary dark:text-zinc-400">
                Notes
              </label>
              <input
                name="notes"
                placeholder="Optional"
                className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-accent dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
              />
            </div>
            <button
              type="submit"
              disabled={savingDaily}
              className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent/90 disabled:opacity-50 dark:bg-blue-600"
            >
              {savingDaily ? "Saving…" : "Save"}
            </button>
            <button
              type="button"
              onClick={() => setShowAddDaily(false)}
              className="rounded-lg px-3 py-2 text-sm text-text-secondary hover:text-text-primary dark:text-zinc-400"
            >
              Cancel
            </button>
          </form>
        )}

        {dailyChartData.length > 0 ? (
          <div className="p-6">
            <div className="h-[300px] w-full min-w-0">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={dailyChartData}
                  margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#e8ecf1"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11, fill: "#5c6370" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "#5c6370" }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v: number) =>
                      v >= 1000 ? `$${(v / 1000).toFixed(1)}k` : `$${v}`
                    }
                  />
                  <Tooltip
                    formatter={(value) => fmt(Number(value ?? 0))}
                    contentStyle={{
                      borderRadius: 12,
                      border: "1px solid #e8ecf1",
                      fontSize: 12,
                    }}
                  />
                  <Legend
                    verticalAlign="top"
                    height={36}
                    iconType="circle"
                    wrapperStyle={{ fontSize: 12 }}
                  />
                  {dailySourceNames.map((name, i) => (
                    <Line
                      key={name}
                      type="monotone"
                      dataKey={name}
                      name={name}
                      stroke={SOURCE_LINE_COLORS[i % SOURCE_LINE_COLORS.length]}
                      strokeWidth={2.5}
                      dot={{ r: 4, strokeWidth: 2, stroke: "#fff", fill: SOURCE_LINE_COLORS[i % SOURCE_LINE_COLORS.length] }}
                      activeDot={{ r: 6, strokeWidth: 2, stroke: "#fff" }}
                      connectNulls
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Daily log entries table */}
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border text-xs font-semibold uppercase tracking-wider text-text-secondary dark:border-zinc-800 dark:text-zinc-500">
                    <th className="px-4 py-2">Date</th>
                    <th className="px-4 py-2">Business</th>
                    <th className="px-4 py-2 text-right">Amount</th>
                    <th className="px-4 py-2 text-right">Hours</th>
                    <th className="px-4 py-2">Notes</th>
                    <th className="w-12 px-4 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {dailyLogs.map((log) => (
                    <tr
                      key={log.id}
                      className="border-b border-border/50 dark:border-zinc-800/50"
                    >
                      <td className="px-4 py-2 text-text-secondary dark:text-zinc-400">
                        {new Date(log.date + "T12:00:00").toLocaleDateString(
                          "en-US",
                          { month: "short", day: "numeric" }
                        )}
                      </td>
                      <td className="px-4 py-2 font-medium text-text-primary dark:text-zinc-200">
                        {log.income_source?.name ?? "Unknown"}
                      </td>
                      <td className="px-4 py-2 text-right tabular-nums text-emerald-600 dark:text-emerald-400">
                        {fmt(Number(log.amount))}
                      </td>
                      <td className="px-4 py-2 text-right tabular-nums text-text-secondary dark:text-zinc-400">
                        {Number(log.hours)}
                      </td>
                      <td className="px-4 py-2 text-text-secondary dark:text-zinc-400">
                        {log.notes || "—"}
                      </td>
                      <td className="px-4 py-2 text-right">
                        <button
                          type="button"
                          onClick={() => handleDeleteDaily(log.id)}
                          className="rounded-lg p-1 text-text-secondary hover:bg-red-50 hover:text-red-600 dark:text-zinc-500 dark:hover:bg-red-500/10 dark:hover:text-red-400"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="font-semibold text-text-primary dark:text-zinc-100">
                    <td className="px-4 py-2" colSpan={2}>
                      Total
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums text-emerald-600 dark:text-emerald-400">
                      {fmt(dailyLogs.reduce((s, l) => s + Number(l.amount), 0))}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums">
                      {dailyLogs.reduce((s, l) => s + Number(l.hours), 0)}
                    </td>
                    <td colSpan={2} />
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        ) : (
          <p className="px-6 py-8 text-center text-sm text-text-secondary dark:text-zinc-400">
            No daily income logged this month. Click &quot;Log Income&quot; to start tracking.
          </p>
        )}
      </div>

      {/* Income sources quick glance */}
      {entries.length > 0 && (
        <div className="rounded-2xl border border-border bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900/80">
          <div className="border-b border-border px-6 py-4 dark:border-zinc-800">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-text-secondary dark:text-zinc-400">
              Income by Source
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border text-xs font-semibold uppercase tracking-wider text-text-secondary dark:border-zinc-800 dark:text-zinc-500">
                  <th className="px-6 py-3">Source</th>
                  <th className="px-4 py-3 text-right">Hours</th>
                  <th className="px-4 py-3 text-right">Revenue</th>
                  <th className="px-4 py-3 text-right">Expenses</th>
                  <th className="px-4 py-3 text-right">Profit</th>
                  <th className="px-4 py-3 text-right">Daily Profit</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((e) => {
                  const profit = e.revenue - e.expenses;
                  return (
                    <tr
                      key={e.id}
                      className="border-b border-border/50 dark:border-zinc-800/50"
                    >
                      <td className="px-6 py-3 font-medium text-text-primary dark:text-zinc-200">
                        <span className="flex items-center gap-2">
                          {e.income_source?.name ?? "Unknown"}
                          {e.income_source?.kind && (
                            <span
                              className={`inline-block rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase ${
                                KIND_COLORS[e.income_source.kind] ?? KIND_COLORS.other
                              }`}
                            >
                              {KIND_LABELS[e.income_source.kind] ?? e.income_source.kind}
                            </span>
                          )}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-text-secondary dark:text-zinc-400">
                        {e.hours}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-emerald-600 dark:text-emerald-400">
                        {fmt(e.revenue)}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-red-600 dark:text-red-400">
                        {fmt(e.expenses)}
                      </td>
                      <td
                        className={`px-4 py-3 text-right tabular-nums font-medium ${
                          profit >= 0
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-red-600 dark:text-red-400"
                        }`}
                      >
                        {fmt(profit)}
                      </td>
                      <td
                        className={`px-4 py-3 text-right tabular-nums ${
                          profit >= 0
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-red-600 dark:text-red-400"
                        }`}
                      >
                        {fmt(profit / days)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="font-semibold text-text-primary dark:text-zinc-100">
                  <td className="px-6 py-3">Total</td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {entries.reduce((s, e) => s + Number(e.hours), 0)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-emerald-600 dark:text-emerald-400">
                    {fmt(entries.reduce((s, e) => s + Number(e.revenue), 0))}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-red-600 dark:text-red-400">
                    {fmt(entries.reduce((s, e) => s + Number(e.expenses), 0))}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {fmt(
                      entries.reduce(
                        (s, e) => s + Number(e.revenue) - Number(e.expenses),
                        0
                      )
                    )}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {fmt(
                      entries.reduce(
                        (s, e) => s + Number(e.revenue) - Number(e.expenses),
                        0
                      ) / days
                    )}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Income Tab
// ---------------------------------------------------------------------------

function IncomeTab({
  sources,
  entries,
  month,
  days,
  onReload,
}: {
  sources: IncomeSource[];
  entries: IncomeEntry[];
  month: string;
  days: number;
  onReload: () => Promise<void>;
}) {
  const [showAddSource, setShowAddSource] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingEntry, setEditingEntry] = useState<string | null>(null);

  async function handleAddSource(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    const fd = new FormData(e.currentTarget);
    await createIncomeSource(fd);
    setShowAddSource(false);
    await onReload();
    setSaving(false);
  }

  async function handleDeleteSource(id: string) {
    if (!confirm("Delete this income source and all its entries?")) return;
    await deleteIncomeSource(id);
    await onReload();
  }

  async function handleSaveEntry(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    const fd = new FormData(e.currentTarget);
    fd.set("month", month);
    await upsertIncomeEntry(fd);
    setEditingEntry(null);
    await onReload();
    setSaving(false);
  }

  const entryBySource = useMemo(() => {
    const map = new Map<string, IncomeEntry>();
    for (const e of entries) map.set(e.income_source_id, e);
    return map;
  }, [entries]);

  return (
    <div className="space-y-6">
      {/* Source list */}
      <div className="rounded-2xl border border-border bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900/80">
        <div className="flex items-center justify-between border-b border-border px-6 py-4 dark:border-zinc-800">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-text-secondary dark:text-zinc-400">
            Income Sources
          </h2>
          <button
            type="button"
            onClick={() => setShowAddSource(!showAddSource)}
            className="flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-white hover:bg-accent/90 dark:bg-blue-600 dark:hover:bg-blue-500"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Source
          </button>
        </div>

        {showAddSource && (
          <form
            onSubmit={handleAddSource}
            className="flex flex-wrap items-end gap-3 border-b border-border bg-surface/30 px-6 py-4 dark:border-zinc-800 dark:bg-zinc-950/30"
          >
            <div className="flex-1">
              <label className="mb-1 block text-xs font-medium text-text-secondary dark:text-zinc-400">
                Name
              </label>
              <input
                name="name"
                required
                placeholder="e.g. Doral Acura"
                className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-text-primary outline-none focus:border-accent dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-blue-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-text-secondary dark:text-zinc-400">
                Type
              </label>
              <select
                name="kind"
                defaultValue="other"
                className="rounded-lg border border-border bg-white px-3 py-2 text-sm text-text-primary outline-none focus:border-accent dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
              >
                {Object.entries(KIND_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent/90 disabled:opacity-50 dark:bg-blue-600"
            >
              {saving ? "Saving…" : "Save"}
            </button>
            <button
              type="button"
              onClick={() => setShowAddSource(false)}
              className="rounded-lg px-3 py-2 text-sm text-text-secondary hover:text-text-primary dark:text-zinc-400"
            >
              Cancel
            </button>
          </form>
        )}

        {sources.length === 0 ? (
          <p className="px-6 py-8 text-center text-sm text-text-secondary dark:text-zinc-400">
            No income sources yet. Add your first business or revenue stream.
          </p>
        ) : (
          <div className="divide-y divide-border/50 dark:divide-zinc-800/50">
            {sources.map((s) => (
              <div
                key={s.id}
                className="flex items-center justify-between px-6 py-3"
              >
                <span className="flex items-center gap-2 text-sm font-medium text-text-primary dark:text-zinc-200">
                  {s.name}
                  <span
                    className={`inline-block rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase ${
                      KIND_COLORS[s.kind] ?? KIND_COLORS.other
                    }`}
                  >
                    {KIND_LABELS[s.kind] ?? s.kind}
                  </span>
                  {!s.is_active && (
                    <span className="rounded-md bg-zinc-100 px-1.5 py-0.5 text-[10px] font-semibold text-zinc-500 dark:bg-zinc-800 dark:text-zinc-500">
                      Inactive
                    </span>
                  )}
                </span>
                <button
                  type="button"
                  onClick={() => handleDeleteSource(s.id)}
                  className="rounded-lg p-1.5 text-text-secondary hover:bg-red-50 hover:text-red-600 dark:text-zinc-500 dark:hover:bg-red-500/10 dark:hover:text-red-400"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Monthly entries table */}
      <div className="rounded-2xl border border-border bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900/80">
        <div className="border-b border-border px-6 py-4 dark:border-zinc-800">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-text-secondary dark:text-zinc-400">
            Monthly Entries
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border text-xs font-semibold uppercase tracking-wider text-text-secondary dark:border-zinc-800 dark:text-zinc-500">
                <th className="px-6 py-3">Source</th>
                <th className="px-4 py-3 text-right">Hours</th>
                <th className="px-4 py-3 text-right">Revenue</th>
                <th className="px-4 py-3 text-right">Daily Rev.</th>
                <th className="px-4 py-3 text-right">Expenses</th>
                <th className="px-4 py-3 text-right">Daily Exp.</th>
                <th className="px-4 py-3 text-right">Profit</th>
                <th className="px-4 py-3 text-right">Daily Profit</th>
                <th className="w-16 px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {sources
                .filter((s) => s.is_active)
                .map((s) => {
                  const entry = entryBySource.get(s.id);
                  const rev = entry ? Number(entry.revenue) : 0;
                  const exp = entry ? Number(entry.expenses) : 0;
                  const hrs = entry ? Number(entry.hours) : 0;
                  const profit = rev - exp;
                  const isEditing = editingEntry === s.id;

                  if (isEditing) {
                    return (
                      <tr
                        key={s.id}
                        className="border-b border-border/50 bg-blue-50/40 dark:border-zinc-800/50 dark:bg-blue-500/5"
                      >
                        <td colSpan={9} className="px-6 py-3">
                          <form
                            onSubmit={handleSaveEntry}
                            className="flex flex-wrap items-end gap-3"
                          >
                            <input
                              type="hidden"
                              name="income_source_id"
                              value={s.id}
                            />
                            <div>
                              <label className="mb-1 block text-xs font-medium text-text-secondary dark:text-zinc-400">
                                Hours
                              </label>
                              <input
                                name="hours"
                                type="number"
                                step="0.01"
                                defaultValue={hrs}
                                className="w-24 rounded-lg border border-border bg-white px-3 py-1.5 text-sm tabular-nums outline-none focus:border-accent dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                              />
                            </div>
                            <div>
                              <label className="mb-1 block text-xs font-medium text-text-secondary dark:text-zinc-400">
                                Revenue
                              </label>
                              <input
                                name="revenue"
                                type="number"
                                step="0.01"
                                defaultValue={rev}
                                className="w-32 rounded-lg border border-border bg-white px-3 py-1.5 text-sm tabular-nums outline-none focus:border-accent dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                              />
                            </div>
                            <div>
                              <label className="mb-1 block text-xs font-medium text-text-secondary dark:text-zinc-400">
                                Expenses
                              </label>
                              <input
                                name="expenses"
                                type="number"
                                step="0.01"
                                defaultValue={exp}
                                className="w-32 rounded-lg border border-border bg-white px-3 py-1.5 text-sm tabular-nums outline-none focus:border-accent dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                              />
                            </div>
                            <div className="flex-1">
                              <label className="mb-1 block text-xs font-medium text-text-secondary dark:text-zinc-400">
                                Notes
                              </label>
                              <input
                                name="notes"
                                defaultValue={entry?.notes ?? ""}
                                placeholder="Optional notes"
                                className="w-full rounded-lg border border-border bg-white px-3 py-1.5 text-sm outline-none focus:border-accent dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                              />
                            </div>
                            <button
                              type="submit"
                              disabled={saving}
                              className="rounded-lg bg-accent px-3 py-1.5 text-sm font-semibold text-white hover:bg-accent/90 disabled:opacity-50 dark:bg-blue-600"
                            >
                              {saving ? "Saving…" : "Save"}
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingEntry(null)}
                              className="rounded-lg p-1.5 text-text-secondary hover:text-text-primary dark:text-zinc-400"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </form>
                        </td>
                      </tr>
                    );
                  }

                  return (
                    <tr
                      key={s.id}
                      className="border-b border-border/50 dark:border-zinc-800/50"
                    >
                      <td className="px-6 py-3 font-medium text-text-primary dark:text-zinc-200">
                        {s.name}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-text-secondary dark:text-zinc-400">
                        {hrs}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-emerald-600 dark:text-emerald-400">
                        {fmt(rev)}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-emerald-600/70 dark:text-emerald-400/70">
                        {fmt(rev / days)}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-red-600 dark:text-red-400">
                        {fmt(exp)}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-red-600/70 dark:text-red-400/70">
                        {fmt(exp / days)}
                      </td>
                      <td
                        className={`px-4 py-3 text-right tabular-nums font-medium ${
                          profit >= 0
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-red-600 dark:text-red-400"
                        }`}
                      >
                        {fmt(profit)}
                      </td>
                      <td
                        className={`px-4 py-3 text-right tabular-nums ${
                          profit >= 0
                            ? "text-emerald-600/70 dark:text-emerald-400/70"
                            : "text-red-600/70 dark:text-red-400/70"
                        }`}
                      >
                        {fmt(profit / days)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => setEditingEntry(s.id)}
                          className="rounded-lg p-1.5 text-text-secondary hover:bg-surface hover:text-accent dark:text-zinc-500 dark:hover:bg-zinc-800 dark:hover:text-blue-400"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
            <tfoot>
              <tr className="font-semibold text-text-primary dark:text-zinc-100">
                <td className="px-6 py-3">Total</td>
                <td className="px-4 py-3 text-right tabular-nums">
                  {sources
                    .filter((s) => s.is_active)
                    .reduce((s, src) => {
                      const e = entryBySource.get(src.id);
                      return s + (e ? Number(e.hours) : 0);
                    }, 0)}
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-emerald-600 dark:text-emerald-400">
                  {fmt(
                    sources
                      .filter((s) => s.is_active)
                      .reduce((s, src) => {
                        const e = entryBySource.get(src.id);
                        return s + (e ? Number(e.revenue) : 0);
                      }, 0)
                  )}
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-emerald-600/70 dark:text-emerald-400/70">
                  {fmt(
                    sources
                      .filter((s) => s.is_active)
                      .reduce((s, src) => {
                        const e = entryBySource.get(src.id);
                        return s + (e ? Number(e.revenue) : 0);
                      }, 0) / days
                  )}
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-red-600 dark:text-red-400">
                  {fmt(
                    sources
                      .filter((s) => s.is_active)
                      .reduce((s, src) => {
                        const e = entryBySource.get(src.id);
                        return s + (e ? Number(e.expenses) : 0);
                      }, 0)
                  )}
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-red-600/70 dark:text-red-400/70">
                  {fmt(
                    sources
                      .filter((s) => s.is_active)
                      .reduce((s, src) => {
                        const e = entryBySource.get(src.id);
                        return s + (e ? Number(e.expenses) : 0);
                      }, 0) / days
                  )}
                </td>
                {(() => {
                  const totalProfit = sources
                    .filter((s) => s.is_active)
                    .reduce((s, src) => {
                      const e = entryBySource.get(src.id);
                      return (
                        s +
                        (e ? Number(e.revenue) - Number(e.expenses) : 0)
                      );
                    }, 0);
                  return (
                    <>
                      <td
                        className={`px-4 py-3 text-right tabular-nums ${
                          totalProfit >= 0
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-red-600 dark:text-red-400"
                        }`}
                      >
                        {fmt(totalProfit)}
                      </td>
                      <td
                        className={`px-4 py-3 text-right tabular-nums ${
                          totalProfit >= 0
                            ? "text-emerald-600/70 dark:text-emerald-400/70"
                            : "text-red-600/70 dark:text-red-400/70"
                        }`}
                      >
                        {fmt(totalProfit / days)}
                      </td>
                    </>
                  );
                })()}
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Fixed Expenses Tab
// ---------------------------------------------------------------------------

function FixedExpensesTab({
  expenses,
  days,
  onReload,
}: {
  expenses: FixedExpense[];
  days: number;
  onReload: () => Promise<void>;
}) {
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    const fd = new FormData(e.currentTarget);
    await createFixedExpense(fd);
    setShowAdd(false);
    await onReload();
    setSaving(false);
  }

  async function handleUpdate(e: React.FormEvent<HTMLFormElement>, id: string) {
    e.preventDefault();
    setSaving(true);
    const fd = new FormData(e.currentTarget);
    await updateFixedExpense(id, fd);
    setEditingId(null);
    await onReload();
    setSaving(false);
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this fixed expense?")) return;
    await deleteFixedExpense(id);
    await onReload();
  }

  const totalAmount = expenses.reduce((s, ex) => s + Number(ex.amount), 0);
  const totalDaily = totalAmount / days;

  return (
    <div className="rounded-2xl border border-border bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900/80">
      <div className="flex items-center justify-between border-b border-border px-6 py-4 dark:border-zinc-800">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-text-secondary dark:text-zinc-400">
          Fixed Expenses
        </h2>
        <button
          type="button"
          onClick={() => setShowAdd(!showAdd)}
          className="flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-white hover:bg-accent/90 dark:bg-blue-600 dark:hover:bg-blue-500"
        >
          <Plus className="h-3.5 w-3.5" />
          Add Expense
        </button>
      </div>

      {showAdd && (
        <form
          onSubmit={handleAdd}
          className="flex flex-wrap items-end gap-3 border-b border-border bg-surface/30 px-6 py-4 dark:border-zinc-800 dark:bg-zinc-950/30"
        >
          <div className="flex-1">
            <label className="mb-1 block text-xs font-medium text-text-secondary dark:text-zinc-400">
              Name
            </label>
            <input
              name="name"
              required
              placeholder="e.g. Apartment Rent"
              className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-accent dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-text-secondary dark:text-zinc-400">
              Amount
            </label>
            <input
              name="amount"
              type="number"
              step="0.01"
              required
              placeholder="0.00"
              className="w-32 rounded-lg border border-border bg-white px-3 py-2 text-sm tabular-nums outline-none focus:border-accent dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-text-secondary dark:text-zinc-400">
              Due Day
            </label>
            <input
              name="due_day"
              type="number"
              min={1}
              max={31}
              defaultValue={1}
              className="w-20 rounded-lg border border-border bg-white px-3 py-2 text-sm tabular-nums outline-none focus:border-accent dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-text-secondary dark:text-zinc-400">
              Category
            </label>
            <input
              name="category"
              placeholder="Optional"
              className="w-32 rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-accent dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
            />
          </div>
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent/90 disabled:opacity-50 dark:bg-blue-600"
          >
            {saving ? "Saving…" : "Save"}
          </button>
          <button
            type="button"
            onClick={() => setShowAdd(false)}
            className="rounded-lg px-3 py-2 text-sm text-text-secondary hover:text-text-primary dark:text-zinc-400"
          >
            Cancel
          </button>
        </form>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border text-xs font-semibold uppercase tracking-wider text-text-secondary dark:border-zinc-800 dark:text-zinc-500">
              <th className="px-6 py-3">Name</th>
              <th className="px-4 py-3 text-center">Due Day</th>
              <th className="px-4 py-3 text-right">Fixed Amount</th>
              <th className="px-4 py-3 text-right">Daily Cost</th>
              <th className="w-24 px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {expenses.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-6 py-8 text-center text-sm text-text-secondary dark:text-zinc-400"
                >
                  No fixed expenses yet.
                </td>
              </tr>
            ) : (
              expenses.map((ex) =>
                editingId === ex.id ? (
                  <tr
                    key={ex.id}
                    className="border-b border-border/50 bg-blue-50/40 dark:border-zinc-800/50 dark:bg-blue-500/5"
                  >
                    <td colSpan={5} className="px-6 py-3">
                      <form
                        onSubmit={(e) => handleUpdate(e, ex.id)}
                        className="flex flex-wrap items-end gap-3"
                      >
                        <div className="flex-1">
                          <input
                            name="name"
                            defaultValue={ex.name}
                            required
                            className="w-full rounded-lg border border-border bg-white px-3 py-1.5 text-sm outline-none focus:border-accent dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                          />
                        </div>
                        <div>
                          <input
                            name="amount"
                            type="number"
                            step="0.01"
                            defaultValue={ex.amount}
                            className="w-28 rounded-lg border border-border bg-white px-3 py-1.5 text-sm tabular-nums outline-none focus:border-accent dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                          />
                        </div>
                        <div>
                          <input
                            name="due_day"
                            type="number"
                            min={1}
                            max={31}
                            defaultValue={ex.due_day}
                            className="w-16 rounded-lg border border-border bg-white px-3 py-1.5 text-sm tabular-nums outline-none focus:border-accent dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                          />
                        </div>
                        <button
                          type="submit"
                          disabled={saving}
                          className="rounded-lg bg-accent px-3 py-1.5 text-sm font-semibold text-white hover:bg-accent/90 disabled:opacity-50 dark:bg-blue-600"
                        >
                          {saving ? "Saving…" : "Save"}
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingId(null)}
                          className="rounded-lg p-1.5 text-text-secondary hover:text-text-primary dark:text-zinc-400"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </form>
                    </td>
                  </tr>
                ) : (
                  <tr
                    key={ex.id}
                    className="border-b border-border/50 dark:border-zinc-800/50"
                  >
                    <td className="px-6 py-3 font-medium text-text-primary dark:text-zinc-200">
                      {ex.name}
                    </td>
                    <td className="px-4 py-3 text-center tabular-nums text-text-secondary dark:text-zinc-400">
                      {ex.due_day}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-red-600 dark:text-red-400">
                      {fmt(Number(ex.amount))}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-red-600/70 dark:text-red-400/70">
                      {fmt(Number(ex.amount) / days)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => setEditingId(ex.id)}
                          className="rounded-lg p-1.5 text-text-secondary hover:bg-surface hover:text-accent dark:text-zinc-500 dark:hover:bg-zinc-800 dark:hover:text-blue-400"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(ex.id)}
                          className="rounded-lg p-1.5 text-text-secondary hover:bg-red-50 hover:text-red-600 dark:text-zinc-500 dark:hover:bg-red-500/10 dark:hover:text-red-400"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              )
            )}
          </tbody>
          {expenses.length > 0 && (
            <tfoot>
              <tr className="font-semibold text-text-primary dark:text-zinc-100">
                <td className="px-6 py-3">Total Fixed Expenses</td>
                <td />
                <td className="px-4 py-3 text-right tabular-nums text-red-600 dark:text-red-400">
                  {fmt(totalAmount)}
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-red-600/70 dark:text-red-400/70">
                  {fmt(totalDaily)}
                </td>
                <td />
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Variable Expenses Tab
// ---------------------------------------------------------------------------

function VariableExpensesTab({
  expenses,
  month,
  days,
  onReload,
}: {
  expenses: VariableExpenseEntry[];
  month: string;
  days: number;
  onReload: () => Promise<void>;
}) {
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [groupByCategory, setGroupByCategory] = useState(false);

  async function handleAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    const fd = new FormData(e.currentTarget);
    await addVariableExpense(fd);
    setShowAdd(false);
    await onReload();
    setSaving(false);
  }

  async function handleUpdate(e: React.FormEvent<HTMLFormElement>, id: string) {
    e.preventDefault();
    setSaving(true);
    const fd = new FormData(e.currentTarget);
    await updateVariableExpense(id, fd);
    setEditingId(null);
    await onReload();
    setSaving(false);
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this expense?")) return;
    await deleteVariableExpense(id);
    await onReload();
  }

  const totalAmount = expenses.reduce((s, ex) => s + Number(ex.amount), 0);

  const grouped = useMemo(() => {
    const map = new Map<string, { items: VariableExpenseEntry[]; total: number }>();
    for (const ex of expenses) {
      const g = map.get(ex.category) ?? { items: [], total: 0 };
      g.items.push(ex);
      g.total += Number(ex.amount);
      map.set(ex.category, g);
    }
    return [...map.entries()].sort((a, b) => b[1].total - a[1].total);
  }, [expenses]);

  return (
    <div className="rounded-2xl border border-border bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900/80">
      <div className="flex items-center justify-between border-b border-border px-6 py-4 dark:border-zinc-800">
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-text-secondary dark:text-zinc-400">
            Variable Expenses
          </h2>
          <button
            type="button"
            onClick={() => setGroupByCategory(!groupByCategory)}
            className="rounded-lg border border-border px-2.5 py-1 text-[11px] font-medium text-text-secondary hover:bg-surface dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
          >
            {groupByCategory ? "Show flat list" : "Group by category"}
          </button>
        </div>
        <button
          type="button"
          onClick={() => setShowAdd(!showAdd)}
          className="flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-white hover:bg-accent/90 dark:bg-blue-600 dark:hover:bg-blue-500"
        >
          <Plus className="h-3.5 w-3.5" />
          Add Expense
        </button>
      </div>

      {showAdd && (
        <form
          onSubmit={handleAdd}
          className="flex flex-wrap items-end gap-3 border-b border-border bg-surface/30 px-6 py-4 dark:border-zinc-800 dark:bg-zinc-950/30"
        >
          <div>
            <label className="mb-1 block text-xs font-medium text-text-secondary dark:text-zinc-400">
              Category
            </label>
            <select
              name="category"
              required
              className="rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-accent dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
            >
              <option value="">Select…</option>
              {VARIABLE_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-text-secondary dark:text-zinc-400">
              Amount
            </label>
            <input
              name="amount"
              type="number"
              step="0.01"
              required
              placeholder="0.00"
              className="w-28 rounded-lg border border-border bg-white px-3 py-2 text-sm tabular-nums outline-none focus:border-accent dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-text-secondary dark:text-zinc-400">
              Date
            </label>
            <input
              name="date"
              type="date"
              defaultValue={new Date().toISOString().slice(0, 10)}
              className="rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-accent dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
            />
          </div>
          <div className="flex-1">
            <label className="mb-1 block text-xs font-medium text-text-secondary dark:text-zinc-400">
              Description
            </label>
            <input
              name="description"
              placeholder="Optional"
              className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-accent dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
            />
          </div>
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent/90 disabled:opacity-50 dark:bg-blue-600"
          >
            {saving ? "Saving…" : "Save"}
          </button>
          <button
            type="button"
            onClick={() => setShowAdd(false)}
            className="rounded-lg px-3 py-2 text-sm text-text-secondary hover:text-text-primary dark:text-zinc-400"
          >
            Cancel
          </button>
        </form>
      )}

      <div className="overflow-x-auto">
        {groupByCategory ? (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border text-xs font-semibold uppercase tracking-wider text-text-secondary dark:border-zinc-800 dark:text-zinc-500">
                <th className="px-6 py-3">Category</th>
                <th className="px-4 py-3 text-right">Total</th>
                <th className="px-4 py-3 text-right">Daily</th>
              </tr>
            </thead>
            <tbody>
              {grouped.map(([cat, g]) => (
                <tr
                  key={cat}
                  className="border-b border-border/50 dark:border-zinc-800/50"
                >
                  <td className="px-6 py-3 font-medium text-text-primary dark:text-zinc-200">
                    {cat}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-red-600 dark:text-red-400">
                    {fmt(g.total)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-red-600/70 dark:text-red-400/70">
                    {fmt(g.total / days)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="font-semibold text-text-primary dark:text-zinc-100">
                <td className="px-6 py-3">Total Variable Expenses</td>
                <td className="px-4 py-3 text-right tabular-nums text-red-600 dark:text-red-400">
                  {fmt(totalAmount)}
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-red-600/70 dark:text-red-400/70">
                  {fmt(totalAmount / days)}
                </td>
              </tr>
            </tfoot>
          </table>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border text-xs font-semibold uppercase tracking-wider text-text-secondary dark:border-zinc-800 dark:text-zinc-500">
                <th className="px-6 py-3">Category</th>
                <th className="px-4 py-3 text-right">Amount</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Description</th>
                <th className="w-24 px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {expenses.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-6 py-8 text-center text-sm text-text-secondary dark:text-zinc-400"
                  >
                    No variable expenses this month.
                  </td>
                </tr>
              ) : (
                expenses.map((ex) =>
                  editingId === ex.id ? (
                    <tr
                      key={ex.id}
                      className="border-b border-border/50 bg-blue-50/40 dark:border-zinc-800/50 dark:bg-blue-500/5"
                    >
                      <td colSpan={5} className="px-6 py-3">
                        <form
                          onSubmit={(e) => handleUpdate(e, ex.id)}
                          className="flex flex-wrap items-end gap-3"
                        >
                          <div>
                            <select
                              name="category"
                              defaultValue={ex.category}
                              className="rounded-lg border border-border bg-white px-3 py-1.5 text-sm outline-none focus:border-accent dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                            >
                              {VARIABLE_CATEGORIES.map((c) => (
                                <option key={c} value={c}>
                                  {c}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <input
                              name="amount"
                              type="number"
                              step="0.01"
                              defaultValue={ex.amount}
                              className="w-28 rounded-lg border border-border bg-white px-3 py-1.5 text-sm tabular-nums outline-none focus:border-accent dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                            />
                          </div>
                          <div>
                            <input
                              name="date"
                              type="date"
                              defaultValue={ex.date}
                              className="rounded-lg border border-border bg-white px-3 py-1.5 text-sm outline-none focus:border-accent dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                            />
                          </div>
                          <div className="flex-1">
                            <input
                              name="description"
                              defaultValue={ex.description ?? ""}
                              placeholder="Optional"
                              className="w-full rounded-lg border border-border bg-white px-3 py-1.5 text-sm outline-none focus:border-accent dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                            />
                          </div>
                          <button
                            type="submit"
                            disabled={saving}
                            className="rounded-lg bg-accent px-3 py-1.5 text-sm font-semibold text-white hover:bg-accent/90 disabled:opacity-50 dark:bg-blue-600"
                          >
                            {saving ? "Saving…" : "Save"}
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingId(null)}
                            className="rounded-lg p-1.5 text-text-secondary hover:text-text-primary dark:text-zinc-400"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </form>
                      </td>
                    </tr>
                  ) : (
                    <tr
                      key={ex.id}
                      className="border-b border-border/50 dark:border-zinc-800/50"
                    >
                      <td className="px-6 py-3 font-medium text-text-primary dark:text-zinc-200">
                        {ex.category}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-red-600 dark:text-red-400">
                        {fmt(Number(ex.amount))}
                      </td>
                      <td className="px-4 py-3 text-text-secondary dark:text-zinc-400">
                        {new Date(ex.date + "T12:00:00").toLocaleDateString(
                          "en-US",
                          { month: "short", day: "numeric" }
                        )}
                      </td>
                      <td className="px-4 py-3 text-text-secondary dark:text-zinc-400">
                        {ex.description || "—"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => setEditingId(ex.id)}
                            className="rounded-lg p-1.5 text-text-secondary hover:bg-surface hover:text-accent dark:text-zinc-500 dark:hover:bg-zinc-800 dark:hover:text-blue-400"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(ex.id)}
                            className="rounded-lg p-1.5 text-text-secondary hover:bg-red-50 hover:text-red-600 dark:text-zinc-500 dark:hover:bg-red-500/10 dark:hover:text-red-400"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                )
              )}
            </tbody>
            {expenses.length > 0 && (
              <tfoot>
                <tr className="font-semibold text-text-primary dark:text-zinc-100">
                  <td className="px-6 py-3">Total Variable Expenses</td>
                  <td className="px-4 py-3 text-right tabular-nums text-red-600 dark:text-red-400">
                    {fmt(totalAmount)}
                  </td>
                  <td className="px-4 py-3 text-text-secondary/60 dark:text-zinc-500">
                    {fmt(totalAmount / days)} / day
                  </td>
                  <td />
                  <td />
                </tr>
              </tfoot>
            )}
          </table>
        )}
      </div>
    </div>
  );
}
