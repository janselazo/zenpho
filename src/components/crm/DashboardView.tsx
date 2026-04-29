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
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Flame,
  Zap,
  ArrowRight,
  Calendar,
  Building2,
  DollarSign,
  ListTodo,
  Users,
  MoreHorizontal,
} from "lucide-react";
import {
  playbookCategories,
  DEAL_STAGE_LABELS,
  DEAL_STAGE_COLORS,
  type DealStage,
  type PlaybookCategory,
} from "@/lib/crm/mock-data";
import {
  type ClientsCreatedPoint,
  type DashboardFunnelStage,
  type DashboardRangeTotals,
  type LeadsAppointmentsPoint,
} from "@/lib/crm/dashboard-types";
import DashboardRangePicker from "@/components/crm/DashboardRangePicker";
import {
  getCompletions,
  loadPlaybookCategories,
  loadPlaybookPriorityActivityIds,
  PLAYBOOK_STRUCTURE_CHANGED_EVENT,
  prunePriorityActivityIds,
} from "@/lib/crm/playbook-store";
import { fetchUserProspectingPlaybook } from "@/lib/crm/playbook-remote";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import type { DailyMoneyPoint } from "@/components/crm/DashboardCharts";
import AppointmentStatusBadge from "@/components/app/AppointmentStatusBadge";
import {
  parseAppointmentStatus,
  type AppointmentStatus,
} from "@/lib/crm/appointment-status";

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
        barVolumeProjects: "#60a5fa",
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
        barVolumeProjects: "#3b82f6",
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

type DashboardUpcomingAppointment = {
  id: string;
  title: string;
  starts_at: string;
  status: AppointmentStatus;
  meta: string | null;
};

function singleAppointmentLead(raw: unknown): {
  name: string | null;
  company: string | null;
  project_type: string | null;
} | null {
  const one = Array.isArray(raw) ? raw[0] : raw;
  if (!one || typeof one !== "object") return null;
  const row = one as Record<string, unknown>;
  return {
    name: typeof row.name === "string" ? row.name : null,
    company: typeof row.company === "string" ? row.company : null,
    project_type:
      typeof row.project_type === "string" ? row.project_type : null,
  };
}

function formatDashboardApptStart(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function appointmentMetaLine(
  name: string | null,
  company: string | null,
  projectType: string | null
): string | null {
  const parts = [name, company, projectType]
    .map((p) => (typeof p === "string" ? p.trim() : ""))
    .filter(Boolean);
  return parts.length ? parts.join(" · ") : null;
}

/** Per-column fills under funnel line: left = stronger periwinkle, right = lighter. */
const FUNNEL_AREA_FILLS_LIGHT = [
  "#dbeafe",
  "#e8efff",
  "#eef2ff",
  "#f3f4ff",
];

const FUNNEL_AREA_FILLS_DARK = [
  "rgb(30 58 138 / 0.45)",
  "rgb(30 64 175 / 0.38)",
  "rgb(37 99 235 / 0.32)",
  "rgb(59 130 246 / 0.26)",
];

function funnelBarHeightPct(stage: DashboardFunnelStage, maxCount: number): number {
  const floor = 30;
  const span = 70;
  const c =
    maxCount <= 0 ? 0.16 : Math.min(1, stage.count / maxCount);
  return floor + span * Math.max(0.14, c);
}

/** Full numbers for funnel metric row (matches dashboard reference). */
function funnelMetricDisplayValue(stage: DashboardFunnelStage): string {
  return stage.count.toLocaleString(undefined, { maximumFractionDigits: 0 });
}

/** Normalized height key 0–1 for drawing the funnel line from stage counts. */
function funnelStageNorm(stage: DashboardFunnelStage, maxCount: number): number {
  const pct = funnelBarHeightPct(stage, maxCount);
  return Math.min(1, Math.max(0, (pct - 30) / 70));
}

function SalesFunnelAreaSvg({
  funnel: stages,
  maxCount,
}: {
  funnel: DashboardFunnelStage[];
  maxCount: number;
}) {
  const n = stages.length;
  const W = 500;
  const H = 100;
  const padT = 6;
  const padB = 2;
  const innerH = H - padT - padB;
  const seg = W / n;

  const yAt = (stage: DashboardFunnelStage) =>
    padT + (1 - funnelStageNorm(stage, maxCount)) * innerH;

  const yTop: number[] = [];
  for (let i = 0; i < n; i++) {
    yTop.push(yAt(stages[i]!));
  }
  yTop.push(yTop[n - 1]!);

  const lineD = yTop
    .map((y, k) => `${k === 0 ? "M" : "L"} ${(k * seg).toFixed(2)} ${y.toFixed(2)}`)
    .join(" ");

  return (
    <svg
      className="h-[112px] w-full text-blue-600 dark:text-blue-400"
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      aria-hidden
    >
      {Array.from({ length: n }, (_, i) => {
        const x0 = i * seg;
        const x1 = (i + 1) * seg;
        const ya = yTop[i]!;
        const yb = yTop[i + 1]!;
        return (
          <g key={i}>
            <polygon
              points={`${x0},${ya} ${x1},${yb} ${x1},${H} ${x0},${H}`}
              className="dark:hidden"
              fill={FUNNEL_AREA_FILLS_LIGHT[i % FUNNEL_AREA_FILLS_LIGHT.length]}
            />
            <polygon
              points={`${x0},${ya} ${x1},${yb} ${x1},${H} ${x0},${H}`}
              className="hidden dark:block"
              fill={FUNNEL_AREA_FILLS_DARK[i % FUNNEL_AREA_FILLS_DARK.length]}
            />
          </g>
        );
      })}
      <path
        d={lineD}
        fill="none"
        stroke="currentColor"
        strokeWidth={2.25}
      />
    </svg>
  );
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

/** Matches Pipeline summary / Leads KPI icon chips (per-metric color). */
const businessOverviewIconTones = {
  leads:
    "bg-sky-50 text-sky-600 shadow-[inset_0_1px_0_0_rgb(255_255_255/0.6)] ring-1 ring-sky-200/90 dark:bg-sky-950/50 dark:text-sky-300 dark:shadow-none dark:ring-sky-800/60",
  appointments:
    "bg-violet-50 text-violet-600 shadow-[inset_0_1px_0_0_rgb(255_255_255/0.6)] ring-1 ring-violet-200/90 dark:bg-violet-950/45 dark:text-violet-300 dark:shadow-none dark:ring-violet-800/55",
  clients:
    "bg-emerald-50 text-emerald-600 shadow-[inset_0_1px_0_0_rgb(255_255_255/0.6)] ring-1 ring-emerald-200/90 dark:bg-emerald-950/45 dark:text-emerald-300 dark:shadow-none dark:ring-emerald-800/55",
  revenue:
    "bg-amber-50 text-amber-700 shadow-[inset_0_1px_0_0_rgb(255_255_255/0.6)] ring-1 ring-amber-200/90 dark:bg-amber-950/40 dark:text-amber-300 dark:shadow-none dark:ring-amber-900/45",
} as const;

type BusinessOverviewMetric = keyof typeof businessOverviewIconTones;

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
  metric,
}: {
  title: string;
  value: string;
  sub: string;
  trend: { pct: number; up: boolean } | null;
  spark: { label: string; v: number }[];
  icon: ReactNode;
  chartId: string;
  metric: BusinessOverviewMetric;
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
          <div
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${businessOverviewIconTones[metric]}`}
            aria-hidden
          >
            {icon}
          </div>
          <div className="min-w-0">
            <p className="pt-0.5 text-[11px] font-semibold leading-tight text-text-primary dark:text-zinc-100">
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
  /** Sum of new-project `budget` in range (matches funnel revenue column; from `fetchDashboardFunnel`). */
  wonRevenue: number;
  /** Project budget booked per time bucket (same semantics as funnel revenue). */
  financeBookedSeries: { label: string; revenue: number }[];
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
  wonRevenue,
  financeBookedSeries,
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
  const heatmap = buildDealsHeatmap();

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
        metric: "leads" as const,
        chartId: "leads",
        title: "Leads",
        value: cur.leads.toLocaleString(),
        trend: prev ? businessMetricPctChange(cur.leads, prev.leads) : null,
        spark: leadsSpark,
        icon: <Users className="h-4 w-4" strokeWidth={2} aria-hidden />,
      },
      {
        metric: "appointments" as const,
        chartId: "appts",
        title: "Appointments",
        value: cur.appointments.toLocaleString(),
        trend: prev
          ? businessMetricPctChange(cur.appointments, prev.appointments)
          : null,
        spark: apptSpark,
        icon: <Calendar className="h-4 w-4" strokeWidth={2} aria-hidden />,
      },
      {
        metric: "clients" as const,
        chartId: "clients",
        title: "Clients",
        value: cur.clients.toLocaleString(),
        trend: prev ? businessMetricPctChange(cur.clients, prev.clients) : null,
        spark: clientsSpark,
        icon: <Building2 className="h-4 w-4" strokeWidth={2} aria-hidden />,
      },
      {
        metric: "revenue" as const,
        chartId: "revenue",
        title: "Revenue",
        value: fmt(cur.revenue),
        trend: prev ? businessMetricPctChange(cur.revenue, prev.revenue) : null,
        spark: revenueSpark,
        icon: <DollarSign className="h-4 w-4" strokeWidth={2} aria-hidden />,
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
  const [priorityActivityIds, setPriorityActivityIds] = useState<string[]>([]);
  const [upcomingAppts, setUpcomingAppts] = useState<
    DashboardUpcomingAppointment[]
  >([]);
  const [apptsLoadError, setApptsLoadError] = useState<string | null>(null);
  const funnelMaxCount = useMemo(
    () => Math.max(...funnel.map((s) => s.count), 1),
    [funnel]
  );

  const dashboardPlaybookTasks = useMemo(() => {
    const prio = new Set(priorityActivityIds);
    const rows: {
      id: string;
      title: string;
      category: string;
      done: number;
      target: number;
      isPriority: boolean;
    }[] = [];
    for (const cat of playbookCats) {
      for (const a of cat.activities) {
        const done = playbookCompletions[a.id] ?? 0;
        if (done >= a.target) continue;
        rows.push({
          id: a.id,
          title: a.title,
          category: cat.name,
          done,
          target: a.target,
          isPriority: prio.has(a.id),
        });
      }
    }
    rows.sort((a, b) => Number(b.isPriority) - Number(a.isPriority));
    return rows.slice(0, 6);
  }, [playbookCats, playbookCompletions, priorityActivityIds]);

  useEffect(() => {
    async function syncPlaybookKpis() {
      if (!isSupabaseConfigured()) {
        const loaded = loadPlaybookCategories();
        const cats = loaded ?? playbookCategories;
        if (loaded !== null) setPlaybookCats(loaded);
        setPlaybookCompletions(getCompletions());
        setPriorityActivityIds(
          prunePriorityActivityIds(cats, loadPlaybookPriorityActivityIds())
        );
        return;
      }
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        const loaded = loadPlaybookCategories();
        const cats = loaded ?? playbookCategories;
        if (loaded !== null) setPlaybookCats(loaded);
        setPlaybookCompletions(getCompletions());
        setPriorityActivityIds(
          prunePriorityActivityIds(cats, loadPlaybookPriorityActivityIds())
        );
        return;
      }
      const result = await fetchUserProspectingPlaybook(supabase, user.id);
      if (!result.found) {
        setPlaybookCats([]);
        setPlaybookCompletions({});
        setPriorityActivityIds([]);
        return;
      }
      setPlaybookCats(result.categories);
      setPlaybookCompletions(result.completions);
      setPriorityActivityIds(
        prunePriorityActivityIds(
          result.categories,
          result.priorityActivityIds
        )
      );
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

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setUpcomingAppts([]);
      setApptsLoadError(null);
      return;
    }
    let cancelled = false;
    async function loadUpcoming() {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from("appointment")
          .select(
            "id, title, starts_at, status, lead:lead_id ( name, company, project_type )"
          )
          .gte("starts_at", new Date().toISOString())
          .order("starts_at", { ascending: true })
          .limit(6);
        if (cancelled) return;
        if (error) {
          setUpcomingAppts([]);
          setApptsLoadError(error.message);
          return;
        }
        setApptsLoadError(null);
        setUpcomingAppts(
          (data ?? []).map(
            (r: {
              id: string;
              title: string;
              starts_at: string;
              status: string | null;
              lead?: unknown;
            }) => {
            const lead = singleAppointmentLead(r.lead);
            return {
              id: r.id,
              title: r.title,
              starts_at: r.starts_at,
              status: parseAppointmentStatus(r.status),
              meta: lead
                ? appointmentMetaLine(
                    lead.name,
                    lead.company,
                    lead.project_type
                  )
                : null,
            };
          })
        );
      } catch (e) {
        if (!cancelled) {
          setUpcomingAppts([]);
          setApptsLoadError(
            e instanceof Error ? e.message : "Failed to load appointments"
          );
        }
      }
    }
    void loadUpcoming();
    return () => {
      cancelled = true;
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
        name: "Active products",
        v: activeProjects,
        display: String(activeProjects),
      },
    ],
    [activeClients, activeProjects]
  );

  const volumeAxisMax = Math.max(
    5,
    Math.ceil(Math.max(1, activeClients, activeProjects) * 1.2)
  );

  const financeAxisMax = useMemo(() => {
    const peak = Math.max(
      0,
      wonRevenue,
      ...financeBookedSeries.map((p) => p.revenue)
    );
    return Math.max(1000, Math.ceil(peak * 1.15));
  }, [financeBookedSeries, wonRevenue]);

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
                metric={row.metric}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Business snapshot — Finance (line) + Volume (bars) */}
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
              Finance
            </p>
            <div className="mt-4 h-[148px] w-full min-w-0">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={financeBookedSeries}
                  margin={{ top: 4, right: 8, left: 0, bottom: 2 }}
                >
                  <CartesianGrid
                    strokeDasharray="4 6"
                    stroke={chartTheme.snapshotGrid}
                    strokeOpacity={0.65}
                    vertical={false}
                  />
                  <XAxis
                    dataKey="label"
                    tick={{
                      fontSize: 10,
                      fill: chartTheme.snapshotTick,
                      fontWeight: 500,
                    }}
                    axisLine={false}
                    tickLine={false}
                    interval="preserveStartEnd"
                    minTickGap={10}
                  />
                  <YAxis
                    domain={[0, financeAxisMax]}
                    width={44}
                    tick={{
                      fontSize: 10,
                      fill: chartTheme.snapshotTick,
                      fontWeight: 500,
                    }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={formatFinanceXAxisTick}
                  />
                  <Tooltip
                    formatter={(value) => [
                      fmt(Number(value ?? 0)),
                      "Booked revenue",
                    ]}
                    contentStyle={{
                      borderRadius: 12,
                      border: `1px solid ${chartTheme.tooltipBorder}`,
                      fontSize: 12,
                      backgroundColor: chartTheme.tooltipBg,
                      color: chartTheme.tooltipColor,
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    name="Booked revenue"
                    stroke={chartTheme.barVolume}
                    strokeWidth={2}
                    dot={{ r: financeBookedSeries.length <= 24 ? 3 : 0 }}
                    activeDot={{ r: 5 }}
                    connectNulls
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
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
                    {volumeChartData.map((row) => (
                      <Cell
                        key={row.name}
                        fill={
                          row.name === "Active products"
                            ? chartTheme.barVolumeProjects
                            : chartTheme.barVolume
                        }
                      />
                    ))}
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
        </div>
      </div>

      {/* Sales Funnel — column metrics + single area chart (reference layout) */}
      <div className={`${dashCard} p-5`}>
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base font-bold tracking-tight text-text-primary dark:text-zinc-100">
            Sales Funnel
          </h2>
          <div className="flex items-center gap-2">
            <span className="hidden text-xs text-text-secondary dark:text-zinc-500 sm:inline">
              {rangeLabel}
            </span>
            <button
              type="button"
              className="rounded-lg p-1.5 text-text-secondary transition-colors hover:bg-zinc-100 hover:text-text-primary dark:text-zinc-500 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
              aria-label="More options"
            >
              <MoreHorizontal className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="mt-5 overflow-hidden rounded-xl border border-border/70 bg-white dark:border-zinc-700/70 dark:bg-zinc-950/40">
          <div className="grid grid-cols-4 divide-x divide-border/70 dark:divide-zinc-700/80">
            {funnel.map((stage) => (
              <div
                key={stage.label}
                className="min-w-0 px-2 py-4 sm:px-3 sm:py-5"
              >
                <p className="text-xs font-medium text-text-secondary dark:text-zinc-500">
                  {stage.label}
                </p>
                <p className="mt-1.5 text-xl font-bold tabular-nums leading-none text-text-primary dark:text-zinc-50 sm:text-2xl">
                  {funnelMetricDisplayValue(stage)}
                </p>
              </div>
            ))}
          </div>
          <div className="relative border-t border-border/70 dark:border-zinc-700/80">
            <SalesFunnelAreaSvg funnel={funnel} maxCount={funnelMaxCount} />
            <div
              className="pointer-events-none absolute inset-0 grid grid-cols-4 divide-x divide-border/50 dark:divide-zinc-700/70"
              aria-hidden
            />
          </div>
        </div>
      </div>

      {/* Upcoming Appointments + Tasks */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className={`${dashCard} p-5`}>
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-text-secondary/60 dark:text-zinc-500">
              Upcoming appointments
            </p>
            <Link
              href="/calendar"
              className="text-xs font-medium text-accent hover:underline dark:text-blue-400 dark:hover:text-blue-300"
            >
              View all →
            </Link>
          </div>
          {apptsLoadError ? (
            <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
              {apptsLoadError}
            </p>
          ) : null}
          {upcomingAppts.length === 0 && !apptsLoadError ? (
            <div className="mt-6 flex flex-col items-center gap-2 py-6 text-center">
              <Calendar className="h-8 w-8 text-text-secondary/30 dark:text-zinc-600" aria-hidden />
              <p className="text-sm text-text-secondary dark:text-zinc-400">
                No upcoming appointments
              </p>
            </div>
          ) : null}
          {upcomingAppts.length > 0 ? (
            <ul className="mt-4 divide-y divide-border dark:divide-zinc-800">
              {upcomingAppts.map((row) => (
                <li key={row.id}>
                  <Link
                    href="/calendar"
                    className="flex w-full items-start justify-between gap-3 py-3 text-left transition-colors first:pt-0 last:pb-0 hover:opacity-90"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-text-primary dark:text-zinc-100">
                        {row.title}
                      </p>
                      <div className="mt-1.5">
                        <AppointmentStatusBadge status={row.status} />
                      </div>
                      {row.meta ? (
                        <p className="mt-1.5 text-xs text-text-secondary dark:text-zinc-500">
                          {row.meta}
                        </p>
                      ) : null}
                    </div>
                    <span className="shrink-0 text-xs font-medium tabular-nums text-text-secondary dark:text-zinc-400">
                      {formatDashboardApptStart(row.starts_at)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        <div className={`${dashCard} p-5`}>
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-text-secondary/60 dark:text-zinc-500">
              Tasks
            </p>
            <Link
              href="/prospecting/playbook?tab=tasks"
              className="text-xs font-medium text-accent hover:underline dark:text-blue-400 dark:hover:text-blue-300"
            >
              View all →
            </Link>
          </div>
          {dashboardPlaybookTasks.length === 0 ? (
            <div className="mt-6 flex flex-col items-center gap-2 py-6 text-center">
              <ListTodo className="h-8 w-8 text-text-secondary/30 dark:text-zinc-600" aria-hidden />
              <p className="text-sm text-text-secondary dark:text-zinc-400">
                {playbookCats.length === 0 || totalActivities === 0
                  ? "Add playbook activities under Prospecting to see tasks here."
                  : "All playbook activities are complete for today."}
              </p>
            </div>
          ) : (
            <ul className="mt-4 space-y-2">
              {dashboardPlaybookTasks.map((t) => {
                const left = t.target - t.done;
                return (
                  <li key={t.id}>
                    <Link
                      href="/prospecting/playbook?tab=tasks"
                      className="flex items-start gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-surface/60 dark:hover:bg-zinc-800/50"
                    >
                      <span
                        className={
                          t.isPriority
                            ? "text-amber-500 dark:text-amber-400"
                            : "text-text-secondary/45 dark:text-zinc-600"
                        }
                        aria-hidden
                      >
                        {t.isPriority ? (
                          <Flame className="h-4 w-4" />
                        ) : (
                          <ListTodo className="h-4 w-4" />
                        )}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-text-primary dark:text-zinc-100">
                          {t.title}
                        </p>
                        <div className="mt-1 flex flex-wrap items-center gap-1.5">
                          <span className="rounded-full bg-surface px-2 py-0.5 text-[10px] font-medium text-text-secondary dark:bg-zinc-800 dark:text-zinc-400">
                            {t.category}
                          </span>
                          <span className="text-[10px] font-medium tabular-nums text-text-secondary dark:text-zinc-500">
                            {t.done}/{t.target} today
                            {left > 0 ? ` · ${left} left` : ""}
                          </span>
                          {t.isPriority ? (
                            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-800 dark:bg-amber-950/60 dark:text-amber-200">
                              Priority
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
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

      {/* Daily Earnings vs Expenses */}
      {!hasErrors && chartData.length > 0 && (
        <div className={`${dashCard} p-6`}>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-text-secondary dark:text-zinc-400">
            Daily earnings vs expenses · {rangeLabel}
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
                <Bar dataKey="revenue" name="Earnings" fill="#22c55e" radius={[4, 4, 0, 0]} maxBarSize={28} />
                <Bar dataKey="expense" name="Expenses" fill="#ef4444" radius={[4, 4, 0, 0]} maxBarSize={28} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
