"use client";

import { Fragment, useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Flame,
  Clock,
  Zap,
  ArrowRight,
  ChevronRight,
  Calendar,
  Building2,
  DollarSign,
  Phone,
  Mail,
  Users,
  MessageSquare,
  CalendarCheck,
  MoreHorizontal,
} from "lucide-react";
import {
  playbookCategories,
  prospectingTasks,
  DEAL_STAGE_LABELS,
  DEAL_STAGE_COLORS,
  type DealStage,
  type PlaybookCategory,
  type ProspectingTask,
  type ProspectingTaskType,
} from "@/lib/crm/mock-data";
import type {
  ClientsCreatedPoint,
  DashboardFunnelStage,
  DashboardRangeTotals,
  LeadsAppointmentsPoint,
} from "@/lib/crm/dashboard-data";
import DashboardRangePicker from "@/components/crm/DashboardRangePicker";
import {
  getCompletions,
  loadPlaybookCategories,
  PLAYBOOK_STRUCTURE_CHANGED_EVENT,
} from "@/lib/crm/playbook-store";
import { fetchUserProspectingPlaybook } from "@/lib/crm/playbook-remote";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import type { DailyMoneyPoint } from "@/components/crm/DashboardCharts";

const dashCard =
  "rounded-2xl border border-border bg-white shadow-sm dark:border-zinc-800/70 dark:bg-zinc-900/60 dark:shadow-none dark:ring-1 dark:ring-white/[0.05]";

/** Donut ring: orange arc on grey track (matches Daily Playbook reference). */
function PlaybookProgressRing({ percent }: { percent: number }) {
  const r = 20;
  const stroke = 3.5;
  const c = 2 * Math.PI * r;
  const p = Math.min(100, Math.max(0, percent));
  const offset = c - (p / 100) * c;
  const size = (r + stroke) * 2;
  const vb = size / 2;
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className="shrink-0 -rotate-90"
      aria-hidden
    >
      <circle
        cx={vb}
        cy={vb}
        r={r}
        fill="none"
        strokeWidth={stroke}
        className="text-zinc-200 dark:text-zinc-700"
        stroke="currentColor"
      />
      <circle
        cx={vb}
        cy={vb}
        r={r}
        fill="none"
        strokeWidth={stroke}
        strokeLinecap="round"
        stroke="currentColor"
        className="text-amber-500 dark:text-amber-400"
        strokeDasharray={c}
        strokeDashoffset={offset}
      />
    </svg>
  );
}

function useDashboardChartTheme() {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const root = document.documentElement;
    const sync = () => setDark(root.classList.contains("dark"));
    sync();
    const mo = new MutationObserver(sync);
    mo.observe(root, { attributes: true, attributeFilter: ["class"] });
    return () => mo.disconnect();
  }, []);
  return dark
    ? {
        grid: "#27272a",
        tick: "#a1a1aa",
        snapshotGrid: "#3f3f46",
        snapshotTick: "#71717a",
        tooltipBg: "#18181b",
        tooltipBorder: "#3f3f46",
        tooltipColor: "#e4e4e7",
        legendColor: "#a1a1aa",
        barPrimary: "#a1a1aa",
        barVolume: "#34d399",
        barFinRev: "#38bdf8",
        barFinExp: "#71717a",
        barProfit: "#60a5fa",
        financeGrid: "#3f3f46",
        financeTick: "#71717a",
        financeBarRevenue: "#3b82f6",
        financeBarExpense: "#52525b",
        financeBarProfit: "#6366f1",
        refLine: "#3f3f46",
      }
    : {
        grid: "#e8ecf1",
        tick: "#5c6370",
        snapshotGrid: "#e2e8f0",
        snapshotTick: "#94a3b8",
        tooltipBg: "#ffffff",
        tooltipBorder: "#e8ecf1",
        tooltipColor: "#111827",
        legendColor: "#5c6370",
        barPrimary: "#18181b",
        barVolume: "#10b981",
        barFinRev: "#0ea5e9",
        barFinExp: "#94a3b8",
        barProfit: "#2563eb",
        financeGrid: "#e5e7eb",
        financeTick: "#9ca3af",
        financeBarRevenue: "#93c5fd",
        financeBarExpense: "#cbd5e1",
        financeBarProfit: "#a5b4fc",
        refLine: "#e5e7eb",
      };
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

/** Evenly spaced X-axis ticks for the finance snapshot (template-style scale). */
function financeXAxisTickValues(lo: number, hi: number): number[] {
  const span = hi - lo;
  if (!Number.isFinite(span) || span <= 0) return [lo, hi];
  const n = 5;
  return Array.from({ length: n }, (_, i) => lo + (span * i) / (n - 1));
}

function formatFinanceXAxisTick(v: number): string {
  const abs = Math.abs(v);
  if (abs >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}m`;
  if (abs >= 1000) {
    const k = v / 1000;
    const half = Math.round(k * 2) / 2;
    return half % 1 === 0 ? `$${half}k` : `$${half.toFixed(1)}k`;
  }
  const x = Math.round(v * 100) / 100;
  if (Math.abs(x - Math.round(x)) < 0.001) return `$${Math.round(x)}`;
  return `$${x.toFixed(1)}`;
}

function daysBetween(a: string, b: Date) {
  const d = new Date(a);
  d.setHours(0, 0, 0, 0);
  const bNorm = new Date(b);
  bNorm.setHours(0, 0, 0, 0);
  return Math.floor((bNorm.getTime() - d.getTime()) / 86_400_000);
}

const TASK_TYPE_ICONS: Record<ProspectingTaskType, React.ReactNode> = {
  follow_up: <Clock className="h-4 w-4" />,
  call: <Phone className="h-4 w-4" />,
  email: <Mail className="h-4 w-4" />,
  text: <MessageSquare className="h-4 w-4" />,
  appointment: <CalendarCheck className="h-4 w-4" />,
  other: <MoreHorizontal className="h-4 w-4" />,
};

function convRate(a: number, b: number) {
  if (a === 0) return "—";
  return `${Math.round((b / a) * 100)}%`;
}

/** Sloped top edge per column (y0 left %, y1 right %) for a wave-like funnel. */
const FUNNEL_TOP_SLANT: [string, string][] = [
  ["6%", "18%"],
  ["14%", "26%"],
  ["22%", "34%"],
  ["30%", "42%"],
  ["38%", "48%"],
];

/** Light mode: saturated top → soft bottom (blue ramp left → right). */
const FUNNEL_BLUE_GRADIENTS_LIGHT = [
  "linear-gradient(to bottom, rgb(191 219 254 / 0.95), rgb(191 219 254 / 0.08))",
  "linear-gradient(to bottom, rgb(147 197 253 / 0.95), rgb(147 197 253 / 0.1))",
  "linear-gradient(to bottom, rgb(96 165 250 / 0.98), rgb(96 165 250 / 0.12))",
  "linear-gradient(to bottom, rgb(59 130 246 / 0.98), rgb(59 130 246 / 0.14))",
  "linear-gradient(to bottom, rgb(37 99 235 / 1), rgb(37 99 235 / 0.16))",
];

const FUNNEL_BLUE_GRADIENTS_DARK = [
  "linear-gradient(to bottom, rgb(147 197 253 / 0.45), rgb(147 197 253 / 0.06))",
  "linear-gradient(to bottom, rgb(96 165 250 / 0.5), rgb(96 165 250 / 0.08))",
  "linear-gradient(to bottom, rgb(59 130 246 / 0.55), rgb(59 130 246 / 0.1))",
  "linear-gradient(to bottom, rgb(37 99 235 / 0.58), rgb(37 99 235 / 0.12))",
  "linear-gradient(to bottom, rgb(29 78 216 / 0.6), rgb(29 78 216 / 0.14))",
];

function funnelBarHeightPct(
  stage: DashboardFunnelStage,
  maxCount: number,
  maxRevenue: number
): number {
  const floor = 30;
  const span = 70;
  if (stage.label === "Revenue") {
    const r =
      maxRevenue <= 0 ? 0.28 : Math.min(1, stage.value / maxRevenue);
    return floor + span * Math.max(0.22, r);
  }
  const c =
    maxCount <= 0 ? 0.16 : Math.min(1, stage.count / maxCount);
  return floor + span * Math.max(0.14, c);
}

/** Compact metrics (e.g. 9.3K) for the top funnel row. */
function funnelDisplayValueCompact(stage: DashboardFunnelStage): string {
  if (stage.label === "Revenue") {
    const v = stage.value;
    if (!Number.isFinite(v)) return fmt(0);
    const av = Math.abs(v);
    if (av >= 1_000_000) {
      const x = v / 1_000_000;
      return `$${x % 1 === 0 ? x.toFixed(0) : x.toFixed(1)}M`;
    }
    if (av >= 1000) {
      const x = v / 1000;
      return `$${x % 1 === 0 ? x.toFixed(0) : x.toFixed(1)}k`;
    }
    return fmt(v);
  }
  const n = stage.count;
  if (n >= 1_000_000) {
    const x = n / 1_000_000;
    return `${x % 1 === 0 ? x.toFixed(0) : x.toFixed(1)}M`;
  }
  if (n >= 1000) {
    const x = n / 1000;
    return `${x % 1 === 0 ? x.toFixed(0) : x.toFixed(1)}K`;
  }
  return String(n);
}

// ── Active tasks for dashboard ──────────────────────────────────────────────

function getActiveTasks(
  today: Date,
  range: { from: string; to: string }
): ProspectingTask[] {
  return prospectingTasks
    .filter((t) => {
      if (t.status === "completed" || t.status === "skipped") return false;
      const d = t.dueDate.slice(0, 10);
      return d >= range.from && d <= range.to;
    })
    .sort((a, b) => {
      const aOver = daysBetween(a.dueDate, today) > 0 ? 0 : 1;
      const bOver = daysBetween(b.dueDate, today) > 0 ? 0 : 1;
      if (aOver !== bOver) return aOver - bOver;
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    })
    .slice(0, 4);
}

// ── Deals activity heatmap data ─────────────────────────────────────────────

function buildDealsHeatmap() {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const hours = ["9am", "10am", "11am", "12pm", "1pm", "2pm", "3pm", "4pm", "5pm"];
  const data: { day: string; hour: string; value: number }[] = [];
  days.forEach((day) => {
    hours.forEach((hour) => {
      data.push({ day, hour, value: 0 });
    });
  });
  return { days, hours, data };
}

const businessOverviewCardShell =
  "relative overflow-hidden rounded-xl border border-border/80 bg-white p-4 shadow-sm dark:border-zinc-700/70 dark:bg-zinc-900/50";

function businessMetricPctChange(
  cur: number,
  prev: number
): { pct: number; up: boolean } | null {
  if (prev === 0 && cur === 0) return null;
  if (prev === 0) return { pct: 100, up: cur > 0 };
  const raw = ((cur - prev) / prev) * 100;
  return {
    pct: Math.round(Math.abs(raw) * 10) / 10,
    up: raw >= 0,
  };
}

function DashboardBusinessSparkline({
  data,
  positive,
  chartId,
}: {
  data: { label: string; v: number }[];
  positive: boolean;
  chartId: string;
}) {
  const stroke = positive ? "#22c55e" : "#f472b6";
  const fillId = `biz-spark-${chartId}`;
  if (data.length === 0) {
    return <div className="h-12 w-[4.5rem] shrink-0" />;
  }
  return (
    <div className="relative h-12 w-[4.5rem] shrink-0">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{ top: 4, right: 0, left: 0, bottom: 0 }}
        >
          <defs>
            <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={stroke} stopOpacity={0.45} />
              <stop offset="100%" stopColor={stroke} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <YAxis hide domain={[0, "dataMax"]} />
          <Area
            type="monotone"
            dataKey="v"
            stroke={stroke}
            strokeWidth={1.75}
            fill={`url(#${fillId})`}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function BusinessOverviewCard({
  title,
  value,
  sub,
  trend,
  spark,
  icon,
  chartId,
}: {
  title: string;
  value: string;
  sub: string;
  trend: { pct: number; up: boolean } | null;
  spark: { label: string; v: number }[];
  icon: ReactNode;
  chartId: string;
}) {
  const up = trend?.up ?? true;
  const trendColor =
    trend == null
      ? "text-zinc-400"
      : up
        ? "text-emerald-600 dark:text-emerald-400"
        : "text-pink-600 dark:text-pink-400";
  const glow =
    trend == null
      ? "radial-gradient(circle, rgb(167 139 250 / 0.2) 0%, transparent 70%)"
      : up
        ? "radial-gradient(circle, rgb(34 197 94 / 0.22) 0%, transparent 70%)"
        : "radial-gradient(circle, rgb(244 114 182 / 0.22) 0%, transparent 70%)";

  return (
    <div className={businessOverviewCardShell}>
      <div
        className="pointer-events-none absolute -bottom-6 -right-6 h-28 w-28 rounded-full blur-2xl dark:opacity-90"
        style={{ background: glow }}
        aria-hidden
      />
      <div className="relative flex items-start justify-between gap-2">
        <div className="flex min-w-0 flex-1 items-start gap-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600 dark:bg-blue-950/80 dark:text-blue-300">
            {icon}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-text-primary underline decoration-zinc-300 decoration-1 underline-offset-2 dark:text-zinc-100 dark:decoration-zinc-600">
              {title}
            </p>
          </div>
        </div>
      </div>
      <div className="relative mt-3 flex items-end justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-2xl font-bold tabular-nums tracking-tight text-text-primary dark:text-zinc-50">
            {value}
          </p>
          <p className="mt-0.5 text-[11px] text-text-secondary dark:text-zinc-500">
            {sub}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          {trend ? (
            <span className={`text-sm font-semibold tabular-nums ${trendColor}`}>
              {trend.pct}%
              {trend.up ? " ↑" : " ↓"}
            </span>
          ) : (
            <span className="text-sm font-medium text-zinc-400">—</span>
          )}
          <DashboardBusinessSparkline
            data={spark}
            positive={trend?.up ?? true}
            chartId={chartId}
          />
        </div>
      </div>
    </div>
  );
}

// ── Component ───────────────────────────────────────────────────────────────

interface DashboardViewProps {
  activeClients: number;
  activeProjects: number;
  revenueWeek: number;
  expensesWeek: number;
  chartData: DailyMoneyPoint[];
  hasErrors: boolean;
  dateFrom: string;
  dateTo: string;
  rangeLabel: string;
  isAllTime: boolean;
  funnel: DashboardFunnelStage[];
  leadsChartData: LeadsAppointmentsPoint[];
  clientsChartData: ClientsCreatedPoint[];
  businessTotalsCur: DashboardRangeTotals;
  businessTotalsPrev: DashboardRangeTotals | null;
}

export default function DashboardView({
  activeClients,
  activeProjects,
  revenueWeek,
  expensesWeek,
  chartData,
  hasErrors,
  dateFrom,
  dateTo,
  rangeLabel,
  isAllTime,
  funnel,
  leadsChartData,
  clientsChartData,
  businessTotalsCur,
  businessTotalsPrev,
}: DashboardViewProps) {
  const today = new Date();
  const range = { from: dateFrom, to: dateTo };
  const activeTasks = getActiveTasks(today, range);
  const heatmap = buildDealsHeatmap();
  const profit = revenueWeek - expensesWeek;

  const leadsBars = useMemo(
    () =>
      leadsChartData.length > 0
        ? leadsChartData
        : [{ label: "—", leads: 0, appointments: 0 }],
    [leadsChartData]
  );

  const businessOverviewSubLabel =
    isAllTime || !businessTotalsPrev
      ? "In selected range"
      : "vs prior period";

  const businessOverviewRows = useMemo(() => {
    const prev = businessTotalsPrev;
    const leadsSpark = leadsChartData.map((r) => ({
      label: r.label,
      v: r.leads,
    }));
    const apptSpark = leadsChartData.map((r) => ({
      label: r.label,
      v: r.appointments,
    }));
    const clientsSpark = clientsChartData.map((r) => ({
      label: r.label,
      v: r.clients,
    }));
    const revenueSpark = chartData.map((r) => ({
      label: r.label,
      v: r.revenue,
    }));
    const cur = businessTotalsCur;
    return [
      {
        chartId: "leads",
        title: "Leads",
        value: cur.leads.toLocaleString(),
        trend: prev ? businessMetricPctChange(cur.leads, prev.leads) : null,
        spark: leadsSpark,
        icon: <Users className="h-4 w-4" strokeWidth={2.25} />,
      },
      {
        chartId: "appts",
        title: "Appointments",
        value: cur.appointments.toLocaleString(),
        trend: prev
          ? businessMetricPctChange(cur.appointments, prev.appointments)
          : null,
        spark: apptSpark,
        icon: <Calendar className="h-4 w-4" strokeWidth={2.25} />,
      },
      {
        chartId: "clients",
        title: "Clients",
        value: cur.clients.toLocaleString(),
        trend: prev ? businessMetricPctChange(cur.clients, prev.clients) : null,
        spark: clientsSpark,
        icon: <Building2 className="h-4 w-4" strokeWidth={2.25} />,
      },
      {
        chartId: "revenue",
        title: "Revenue",
        value: fmt(cur.revenue),
        trend: prev ? businessMetricPctChange(cur.revenue, prev.revenue) : null,
        spark: revenueSpark,
        icon: <DollarSign className="h-4 w-4" strokeWidth={2.25} />,
      },
    ];
  }, [
    businessTotalsCur,
    businessTotalsPrev,
    leadsChartData,
    clientsChartData,
    chartData,
  ]);

  const chartTheme = useDashboardChartTheme();
  const [playbookCats, setPlaybookCats] = useState<PlaybookCategory[]>(
    playbookCategories
  );
  const [playbookCompletions, setPlaybookCompletions] = useState<
    Record<string, number>
  >({});
  const [funnelSelectedIdx, setFunnelSelectedIdx] = useState(2);

  const funnelScale = useMemo(() => {
    const funnelMaxCount = Math.max(
      ...funnel.filter((s) => s.label !== "Revenue").map((s) => s.count),
      1
    );
    const rev = funnel.find((s) => s.label === "Revenue");
    const funnelMaxRevenue = Math.max(rev?.value ?? 0, 1);
    return { funnelMaxCount, funnelMaxRevenue };
  }, [funnel]);

  useEffect(() => {
    setFunnelSelectedIdx((i) =>
      Math.min(Math.max(0, i), Math.max(0, funnel.length - 1))
    );
  }, [funnel.length]);

  useEffect(() => {
    async function syncPlaybookKpis() {
      if (!isSupabaseConfigured()) {
        const loaded = loadPlaybookCategories();
        if (loaded !== null) setPlaybookCats(loaded);
        setPlaybookCompletions(getCompletions());
        return;
      }
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        const loaded = loadPlaybookCategories();
        if (loaded !== null) setPlaybookCats(loaded);
        setPlaybookCompletions(getCompletions());
        return;
      }
      const result = await fetchUserProspectingPlaybook(supabase, user.id);
      if (!result.found) {
        setPlaybookCats([]);
        setPlaybookCompletions({});
        return;
      }
      setPlaybookCats(result.categories);
      setPlaybookCompletions(result.completions);
    }

    void syncPlaybookKpis();
    window.addEventListener(PLAYBOOK_STRUCTURE_CHANGED_EVENT, syncPlaybookKpis);
    const supabase = isSupabaseConfigured() ? createClient() : null;
    const sub = supabase?.auth.onAuthStateChange(() => {
      void syncPlaybookKpis();
    });
    return () => {
      window.removeEventListener(
        PLAYBOOK_STRUCTURE_CHANGED_EVENT,
        syncPlaybookKpis
      );
      sub?.data.subscription.unsubscribe();
    };
  }, []);

  const completions = playbookCompletions;
  const totalActivities = playbookCats.reduce(
    (s, c) => s + c.activities.length,
    0
  );
  const completedActivities = playbookCats.reduce(
    (s, c) =>
      s + c.activities.filter((a) => (completions[a.id] ?? 0) >= a.target).length,
    0
  );
  const totalPoints = playbookCats.reduce(
    (s, c) => s + c.activities.reduce((a, act) => a + act.points, 0),
    0
  );
  const earnedPoints = playbookCats.reduce(
    (s, c) =>
      s + c.activities.reduce((a, act) => {
        const done = completions[act.id] ?? 0;
        return a + (done >= act.target ? act.points : 0);
      }, 0),
    0
  );

  const progressPercent =
    totalActivities > 0
      ? Math.round((completedActivities / totalActivities) * 100)
      : 0;
  const streakDays = completedActivities > 0 ? 1 : 0;

  const volumeChartData = useMemo(
    () => [
      {
        name: "Active clients",
        v: activeClients,
        display: String(activeClients),
      },
      {
        name: "Active projects",
        v: activeProjects,
        display: String(activeProjects),
      },
    ],
    [activeClients, activeProjects]
  );

  const financeChartData = useMemo(
    () => [
      {
        name: "Revenue",
        v: revenueWeek,
        display: fmt(revenueWeek),
        profitRow: false,
      },
      {
        name: "Expenses",
        v: expensesWeek,
        display: fmt(expensesWeek),
        profitRow: false,
      },
      {
        name: "Profit",
        v: profit,
        display: fmt(profit),
        profitRow: true,
      },
    ],
    [revenueWeek, expensesWeek, profit]
  );

  const volumeAxisMax = Math.max(
    5,
    Math.ceil(Math.max(1, activeClients, activeProjects) * 1.2)
  );

  const financeAxisMin = Math.min(0, profit);
  const financeAxisMax = Math.max(
    1,
    revenueWeek,
    expensesWeek,
    profit,
    financeAxisMin < 0 ? -financeAxisMin * 0.05 : 0
  );
  const financeDomainLo =
    financeAxisMin < 0 ? Math.floor(financeAxisMin * 1.08) : 0;
  const financeDomainHi = Math.ceil(financeAxisMax * 1.08);
  const financeDomain: [number, number] = [financeDomainLo, financeDomainHi];

  const financeXTicks = useMemo(
    () => financeXAxisTickValues(financeDomainLo, financeDomainHi),
    [financeDomainLo, financeDomainHi]
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="heading-display text-2xl font-bold text-text-primary dark:text-zinc-50">
            Dashboard
          </h1>
          <p className="text-sm text-text-secondary dark:text-zinc-400">
            {rangeLabel}
          </p>
        </div>
        <DashboardRangePicker
          from={dateFrom}
          to={dateTo}
          isAllTime={isAllTime}
        />
      </div>

      {/* Overview — Leads, Appointments, Clients, Revenue (matches pipeline KPI style) */}
      <section className="space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-text-secondary/70 dark:text-zinc-500">
          Overview
        </p>
        <div className={`${dashCard} p-4`}>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {businessOverviewRows.map((row) => (
              <BusinessOverviewCard
                key={row.chartId}
                title={row.title}
                value={row.value}
                sub={businessOverviewSubLabel}
                trend={row.trend}
                spark={row.spark}
                icon={row.icon}
                chartId={row.chartId}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Daily Playbook summary */}
      <section className="space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-text-secondary/70 dark:text-zinc-500">
          Daily Playbook
        </p>
        <div
          className={`${dashCard} flex flex-col divide-y divide-border overflow-hidden dark:divide-zinc-800/80 md:flex-row md:divide-x md:divide-y-0`}
        >
          <div className="flex flex-1 items-center gap-4 px-5 py-4 md:py-5">
            <div className="relative flex h-[52px] w-[52px] shrink-0 items-center justify-center">
              <PlaybookProgressRing percent={progressPercent} />
              <span className="pointer-events-none absolute text-sm font-bold tabular-nums text-text-primary dark:text-zinc-50">
                {progressPercent}%
              </span>
            </div>
            <div className="min-w-0">
              <p className="text-xs text-text-secondary dark:text-zinc-500">
                Today&apos;s Progress
              </p>
              <p className="mt-0.5 text-lg font-bold tabular-nums text-text-primary dark:text-zinc-50">
                {completedActivities} / {totalActivities}
              </p>
            </div>
          </div>

          <div className="flex flex-1 items-center gap-4 px-5 py-4 md:py-5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-950/35">
              <Zap
                className="h-5 w-5 text-emerald-600 dark:text-emerald-400"
                aria-hidden
              />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-text-secondary dark:text-zinc-500">
                Points Today
              </p>
              <p className="mt-0.5 text-lg font-bold tabular-nums text-text-primary dark:text-zinc-50">
                {earnedPoints} / {totalPoints}
              </p>
            </div>
          </div>

          <div className="flex flex-1 items-center gap-4 px-5 py-4 md:py-5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-zinc-100 dark:bg-zinc-800/80">
              <Flame
                className="h-5 w-5 text-zinc-600 dark:text-zinc-400"
                aria-hidden
              />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-text-secondary dark:text-zinc-500">
                Current Streak
              </p>
              <p className="mt-0.5 text-lg font-bold tabular-nums text-text-primary dark:text-zinc-50">
                {streakDays} {streakDays === 1 ? "day" : "days"}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end px-5 py-4 md:min-w-[10.5rem] md:flex-none md:py-5">
            <Link
              href="/prospecting/playbook"
              className="group inline-flex items-center gap-1.5 text-sm font-semibold text-accent hover:text-accent dark:text-blue-400 dark:hover:text-blue-400"
            >
              Open Playbook
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Business snapshot — horizontal bar charts */}
      <div className={`${dashCard} p-5`}>
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-text-secondary/70 dark:text-zinc-500">
            Business snapshot
          </p>
          <p className="text-xs text-text-secondary dark:text-zinc-500">
            {rangeLabel}
          </p>
        </div>
        <div className="mt-6 grid gap-8 lg:grid-cols-2 lg:gap-10">
          <div className="rounded-xl border border-border/70 bg-zinc-50/40 p-4 dark:border-zinc-800/80 dark:bg-zinc-950/35">
            <p className="text-sm font-semibold tracking-tight text-text-primary dark:text-zinc-100">
              Volume
            </p>
            <div className="mt-4 h-[148px] w-full min-w-0">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  layout="vertical"
                  data={volumeChartData}
                  margin={{ top: 6, right: 44, left: 0, bottom: 6 }}
                  barCategoryGap="40%"
                >
                  <CartesianGrid
                    strokeDasharray="4 6"
                    stroke={chartTheme.snapshotGrid}
                    strokeOpacity={0.65}
                    horizontal
                    vertical={false}
                    syncWithTicks
                  />
                  <XAxis
                    type="number"
                    domain={[0, volumeAxisMax]}
                    tick={{
                      fontSize: 11,
                      fill: chartTheme.snapshotTick,
                      fontWeight: 500,
                    }}
                    axisLine={false}
                    tickLine={false}
                    allowDecimals={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={112}
                    tick={{
                      fontSize: 11,
                      fill: chartTheme.snapshotTick,
                      fontWeight: 500,
                    }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    formatter={(value) => [String(value ?? 0), "Count"]}
                    contentStyle={{
                      borderRadius: 12,
                      border: `1px solid ${chartTheme.tooltipBorder}`,
                      fontSize: 12,
                      backgroundColor: chartTheme.tooltipBg,
                      color: chartTheme.tooltipColor,
                    }}
                  />
                  <Bar
                    dataKey="v"
                    radius={[0, 999, 999, 0]}
                    maxBarSize={10}
                    fill={chartTheme.barVolume}
                  >
                    <LabelList
                      dataKey="display"
                      position="right"
                      offset={10}
                      fill={chartTheme.tick}
                      fontSize={11}
                      fontWeight={600}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="rounded-xl border border-zinc-200/90 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
            <div className="flex items-baseline justify-between gap-4">
              <span className="text-sm font-medium text-text-secondary dark:text-zinc-400">
                Finance
              </span>
              <span className="text-xs text-text-secondary/85 dark:text-zinc-500">
                {rangeLabel}
              </span>
            </div>
            <div className="mt-5 h-[200px] w-full min-w-0">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  layout="vertical"
                  data={financeChartData}
                  margin={{ top: 4, right: 16, left: 4, bottom: 22 }}
                  barCategoryGap="42%"
                >
                  <CartesianGrid
                    strokeDasharray="2 5"
                    stroke={chartTheme.financeGrid}
                    strokeOpacity={0.85}
                    horizontal
                    vertical={false}
                    syncWithTicks
                  />
                  <XAxis
                    type="number"
                    domain={financeDomain}
                    ticks={financeXTicks}
                    tick={{
                      fontSize: 11,
                      fill: chartTheme.financeTick,
                      fontWeight: 400,
                    }}
                    tickMargin={10}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={formatFinanceXAxisTick}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={108}
                    tick={{
                      fontSize: 12,
                      fill: chartTheme.financeTick,
                      fontWeight: 400,
                    }}
                    axisLine={false}
                    tickLine={false}
                    tickMargin={14}
                  />
                  <Tooltip
                    formatter={(value) => [fmt(Number(value ?? 0)), ""]}
                    contentStyle={{
                      borderRadius: 12,
                      border: `1px solid ${chartTheme.tooltipBorder}`,
                      fontSize: 12,
                      backgroundColor: chartTheme.tooltipBg,
                      color: chartTheme.tooltipColor,
                    }}
                  />
                  {financeAxisMin < 0 ? (
                    <ReferenceLine
                      x={0}
                      stroke={chartTheme.refLine}
                      strokeWidth={1}
                    />
                  ) : null}
                  <Bar dataKey="v" radius={[0, 999, 999, 0]} maxBarSize={9}>
                    {financeChartData.map((row) => (
                      <Cell
                        key={row.name}
                        fill={
                          row.profitRow
                            ? chartTheme.financeBarProfit
                            : row.name === "Revenue"
                              ? chartTheme.financeBarRevenue
                              : chartTheme.financeBarExpense
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* Sales Funnel — analytics-style metrics row + blue wave */}
      <div className={`${dashCard} p-5`}>
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-text-secondary/60 dark:text-zinc-500">
            Sales Funnel
          </p>
          <span className="text-xs text-text-secondary dark:text-zinc-500">
            {rangeLabel}
          </span>
        </div>

        <div className="mt-5 rounded-xl border border-border/80 bg-white p-4 shadow-[inset_0_1px_0_rgba(0,0,0,0.02)] dark:border-zinc-700/70 dark:bg-zinc-950/40 dark:shadow-none">
          {/* Top: stage metrics (selectable highlight) */}
          <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
            {funnel.map((stage, i) => {
              const selected = funnelSelectedIdx === i;
              return (
                <button
                  key={`${stage.label}-metric`}
                  type="button"
                  onClick={() => setFunnelSelectedIdx(i)}
                  className={`rounded-xl border px-1.5 py-3 text-center transition-all sm:px-2 sm:py-4 ${
                    selected
                      ? "border-blue-600 bg-[#2563eb] text-white shadow-md shadow-blue-600/20"
                      : "border-border/60 bg-zinc-50/80 hover:border-blue-200 hover:bg-white dark:border-zinc-600 dark:bg-zinc-900/50 dark:hover:border-blue-500/40 dark:hover:bg-zinc-900"
                  }`}
                >
                  <p
                    className={`text-[10px] font-medium leading-tight sm:text-[11px] ${
                      selected
                        ? "text-white/90"
                        : "text-text-secondary dark:text-zinc-500"
                    }`}
                  >
                    {stage.label}
                  </p>
                  <p
                    className={`mt-1.5 text-base font-bold tabular-nums leading-none tracking-tight sm:mt-2 sm:text-xl ${
                      selected ? "text-white" : "text-text-primary dark:text-zinc-100"
                    }`}
                  >
                    {funnelDisplayValueCompact(stage)}
                  </p>
                  {i < funnel.length - 1 && stage.count > 0 ? (
                    <p
                      className={`mt-2 text-[9px] leading-snug sm:text-[10px] ${
                        selected
                          ? "text-white/80"
                          : "text-text-secondary dark:text-zinc-500"
                      }`}
                    >
                      {convRate(
                        stage.count || 1,
                        funnel[i + 1].count || funnel[i + 1].value
                      )}{" "}
                      of {stage.label.toLowerCase()}
                    </p>
                  ) : (
                    <span className="mt-2 block h-[14px] sm:h-4" aria-hidden />
                  )}
                  {selected ? (
                    <Link
                      href="/leads"
                      className="mt-2 inline-flex items-center justify-center gap-0.5 text-[10px] font-semibold text-white/95 hover:text-white"
                    >
                      Pipeline
                      <ChevronRight className="h-3 w-3 opacity-90" />
                    </Link>
                  ) : null}
                </button>
              );
            })}
          </div>

          {/* Bottom: tapered wave + blue envelope */}
          <div className="relative mt-5 overflow-hidden rounded-2xl bg-gradient-to-b from-blue-100/50 via-blue-50/30 to-white dark:from-blue-950/35 dark:via-blue-950/20 dark:to-zinc-950/20">
            <div
              className="pointer-events-none absolute inset-x-0 top-0 h-12 bg-gradient-to-b from-blue-200/25 to-transparent dark:from-blue-400/10"
              aria-hidden
            />
            <div className="relative grid grid-cols-5 gap-1 px-2 pb-3 pt-4 sm:gap-1.5 sm:px-3 sm:pb-4 sm:pt-5">
              {funnel.map((stage, i) => {
                const [y0, y1] = FUNNEL_TOP_SLANT[i] ?? ["10%", "20%"];
                const h = funnelBarHeightPct(
                  stage,
                  funnelScale.funnelMaxCount,
                  funnelScale.funnelMaxRevenue
                );
                const pipeLight =
                  "inset 0 1px 0 rgba(255,255,255,0.45), inset 0 -1px 0 rgba(30,64,175,0.14)";
                const pipeDark =
                  "inset 0 1px 0 rgba(255,255,255,0.12), inset 0 -1px 0 rgba(0,0,0,0.35)";
                return (
                  <div
                    key={`${stage.label}-wave`}
                    className="flex min-h-[6.5rem] flex-col justify-end sm:min-h-[7.5rem]"
                  >
                    <div
                      className="relative w-full"
                      style={{
                        height: `${h}%`,
                        minHeight: "2rem",
                        maxHeight: "100%",
                      }}
                    >
                      <div
                        className="absolute inset-0 rounded-b-md dark:hidden"
                        style={{
                          clipPath: `polygon(0 ${y0}, 100% ${y1}, 100% 100%, 0 100%)`,
                          background:
                            FUNNEL_BLUE_GRADIENTS_LIGHT[
                              i % FUNNEL_BLUE_GRADIENTS_LIGHT.length
                            ],
                          boxShadow: pipeLight,
                        }}
                      />
                      <div
                        className="absolute inset-0 hidden rounded-b-md dark:block"
                        style={{
                          clipPath: `polygon(0 ${y0}, 100% ${y1}, 100% 100%, 0 100%)`,
                          background:
                            FUNNEL_BLUE_GRADIENTS_DARK[
                              i % FUNNEL_BLUE_GRADIENTS_DARK.length
                            ],
                          boxShadow: pipeDark,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Next Appointments + Tasks */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Next Appointments */}
        <div className={`${dashCard} p-5`}>
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-text-secondary/60 dark:text-zinc-500">
              Next Appointments
            </p>
            <Link
              href="/calendar"
              className="text-xs font-medium text-accent hover:underline dark:text-blue-400 dark:hover:text-blue-300"
            >
              View all →
            </Link>
          </div>
          <div className="mt-6 flex flex-col items-center gap-2 py-6 text-center">
            <Calendar className="h-8 w-8 text-text-secondary/30 dark:text-zinc-600" />
            <p className="text-sm text-text-secondary dark:text-zinc-400">
              No upcoming appointments
            </p>
          </div>
        </div>

        {/* Tasks */}
        <div className={`${dashCard} p-5`}>
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-text-secondary/60 dark:text-zinc-500">
              Tasks
            </p>
            <Link
              href="/prospecting/playbook"
              className="text-xs font-medium text-accent hover:underline dark:text-blue-400 dark:hover:text-blue-300"
            >
              View all →
            </Link>
          </div>
          <div className="mt-4 space-y-3">
            {activeTasks.length === 0 ? (
              <p className="py-6 text-center text-sm text-text-secondary dark:text-zinc-400">
                No active tasks
              </p>
            ) : (
              activeTasks.map((t) => {
                const diff = daysBetween(t.dueDate, today);
                const isOverdue = diff > 0;
                return (
                  <div
                    key={t.id}
                    className={`flex items-start gap-3 rounded-xl px-3 py-2.5 ${
                      isOverdue ? "bg-red-50/60 dark:bg-red-950/35" : ""
                    }`}
                  >
                    <span className={isOverdue ? "text-red-400 dark:text-red-400" : "text-text-secondary/40 dark:text-zinc-600"}>
                      {TASK_TYPE_ICONS[t.type]}
                    </span>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-text-primary dark:text-zinc-100">
                        {t.title}
                      </p>
                      <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                        {t.linkedLead && (
                          <span className="rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-medium text-accent">
                            {t.linkedLead}
                          </span>
                        )}
                        {isOverdue && (
                          <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-medium text-red-700 dark:bg-red-950/80 dark:text-red-300">
                            Overdue by {diff} day{diff > 1 ? "s" : ""}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Opportunities & Appointments + Deals Activity */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Opportunities & Appointments chart */}
        <div className={`${dashCard} p-5`}>
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-text-secondary/60 dark:text-zinc-500">
              Opportunities & Appointments
            </p>
            <span className="text-xs text-text-secondary dark:text-zinc-500">
              {rangeLabel}
            </span>
          </div>
          <div className="mt-4 h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={leadsBars}
                margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: chartTheme.tick }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: chartTheme.tick }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip
                  formatter={(value, name) => [
                    String(value ?? 0),
                    typeof name === "string" ? name : "",
                  ]}
                  contentStyle={{
                    borderRadius: 12,
                    border: `1px solid ${chartTheme.tooltipBorder}`,
                    fontSize: 12,
                    backgroundColor: chartTheme.tooltipBg,
                    color: chartTheme.tooltipColor,
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 11, color: chartTheme.legendColor }} />
                <Bar dataKey="appointments" name="Appointments" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={20} />
                <Bar dataKey="leads" name="Opportunities" fill="#93c5fd" radius={[4, 4, 0, 0]} maxBarSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Deals Activity heatmap */}
        <div className={`${dashCard} p-5`}>
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-text-secondary/60 dark:text-zinc-500">
              Deals Activity
            </p>
            <span className="text-xs text-text-secondary dark:text-zinc-500">
              {rangeLabel}
            </span>
          </div>
          <div className="mt-4 overflow-x-auto">
            <div className="grid min-w-[400px]" style={{ gridTemplateColumns: `auto repeat(${heatmap.hours.length}, 1fr)` }}>
              {/* Header row */}
              <div />
              {heatmap.hours.map((h) => (
                <div key={h} className="px-1 pb-1 text-center text-[10px] text-text-secondary dark:text-zinc-500">
                  {h}
                </div>
              ))}
              {/* Data rows */}
              {heatmap.days.map((day) => (
                <Fragment key={day}>
                  <div className="flex items-center pr-2 text-xs text-text-secondary dark:text-zinc-500">
                    {day}
                  </div>
                  {heatmap.hours.map((hour) => {
                    const cell = heatmap.data.find(
                      (c) => c.day === day && c.hour === hour
                    );
                    const v = cell?.value ?? 0;
                    return (
                      <div
                        key={`${day}-${hour}`}
                        className={`m-0.5 h-6 rounded ${
                          v === 0
                            ? "bg-gray-50 dark:bg-zinc-800/70"
                            : v === 1
                              ? "bg-emerald-100 dark:bg-emerald-900/50"
                              : v <= 3
                                ? "bg-emerald-300 dark:bg-emerald-600/70"
                                : "bg-emerald-500 dark:bg-emerald-500"
                        }`}
                      />
                    );
                  })}
                </Fragment>
              ))}
            </div>
            <div className="mt-2 flex items-center justify-end gap-1 text-[10px] text-text-secondary dark:text-zinc-500">
              <span>Less</span>
              <span className="h-3 w-3 rounded bg-gray-50 dark:bg-zinc-800/70" />
              <span className="h-3 w-3 rounded bg-emerald-100 dark:bg-emerald-900/50" />
              <span className="h-3 w-3 rounded bg-emerald-300 dark:bg-emerald-600/70" />
              <span className="h-3 w-3 rounded bg-emerald-500 dark:bg-emerald-500" />
              <span>More</span>
            </div>
          </div>
        </div>
      </div>

      {/* Revenue vs Expenses */}
      {!hasErrors && chartData.length > 0 && (
        <div className={`${dashCard} p-6`}>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-text-secondary dark:text-zinc-400">
            Revenue vs expenses · {rangeLabel}
          </h2>
          <div className="mt-4 h-[280px] w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: chartTheme.tick }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: chartTheme.tick }} axisLine={false} tickLine={false} tickFormatter={(v) => v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v}`} />
                <Tooltip
                  formatter={(value) => fmt(Number(value ?? 0))}
                  contentStyle={{
                    borderRadius: 12,
                    border: `1px solid ${chartTheme.tooltipBorder}`,
                    fontSize: 12,
                    backgroundColor: chartTheme.tooltipBg,
                    color: chartTheme.tooltipColor,
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 12, color: chartTheme.legendColor }} />
                <Bar dataKey="revenue" name="Revenue" fill="#2563eb" radius={[4, 4, 0, 0]} maxBarSize={28} />
                <Bar dataKey="expense" name="Expenses" fill="#0ea5e9" radius={[4, 4, 0, 0]} maxBarSize={28} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
