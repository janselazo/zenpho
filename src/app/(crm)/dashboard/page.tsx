import dynamic from "next/dynamic";
import {
  fetchClientsCreatedSeries,
  DASHBOARD_FUNNEL_REVENUE_STAGE_LABEL,
  fetchDashboardFunnel,
  fetchDashboardKpis,
  fetchDashboardRangeTotals,
  fetchLeadsAppointmentsSeries,
  type ClientsCreatedPoint,
  type DashboardFunnelStage,
  type DashboardRangeTotals,
  type LeadsAppointmentsPoint,
} from "@/lib/crm/dashboard-data";
import {
  formatDashboardRangeLabel,
  parseDashboardRangeQuery,
  priorInclusiveRange,
} from "@/lib/crm/dashboard-range";
import type { DailyMoneyPoint } from "@/lib/crm/transaction-series";
import { getMoneySeriesForRange } from "@/lib/crm/transaction-series";
import { isSupabaseConfigured } from "@/lib/supabase/config";

const DashboardView = dynamic(() => import("@/components/crm/DashboardView"), {
  loading: () => (
    <div className="flex min-h-[50vh] items-center justify-center p-8 text-sm text-text-secondary dark:text-zinc-400">
      Loading dashboard…
    </div>
  ),
});

const emptyTotals: DashboardRangeTotals = {
  leads: 0,
  appointments: 0,
  clients: 0,
  revenue: 0,
};

const emptyFunnel: DashboardFunnelStage[] = [
  { label: "Opportunities", count: 0, value: 0, color: "#3b82f6", bg: "bg-blue-50 dark:bg-blue-500/12" },
  { label: "Appointments", count: 0, value: 0, color: "#8b5cf6", bg: "bg-violet-50 dark:bg-violet-500/12" },
  { label: "Qualified", count: 0, value: 0, color: "#10b981", bg: "bg-emerald-50 dark:bg-emerald-500/12" },
  { label: "Deals Closed", count: 0, value: 0, color: "#f59e0b", bg: "bg-amber-50 dark:bg-amber-500/12" },
  {
    label: DASHBOARD_FUNNEL_REVENUE_STAGE_LABEL,
    count: 0,
    value: 0,
    color: "#10b981",
    bg: "bg-emerald-50 dark:bg-emerald-500/12",
  },
];

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; range?: string }>;
}) {
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

  const sp = await searchParams;
  const parsed = parseDashboardRangeQuery(sp);
  const { from, to, isAllTime } = parsed;
  const rangeLabel = isAllTime
    ? "All time"
    : formatDashboardRangeLabel(from, to);

  let counts = {
    activeClients: 0,
    activeProjects: 0,
    errors: [] as unknown[],
  };
  let chartData: DailyMoneyPoint[] = [];
  let funnel: DashboardFunnelStage[] = emptyFunnel;
  let leadsChartData: LeadsAppointmentsPoint[] = [];
  let clientsChartData: ClientsCreatedPoint[] = [];
  let businessTotalsCur: DashboardRangeTotals = emptyTotals;
  let businessTotalsPrev: DashboardRangeTotals | null = null;

  try {
    const prior = !isAllTime ? priorInclusiveRange(from, to) : null;
    const [
      kpis,
      money,
      funnelRes,
      leadsRes,
      clientsSeriesRes,
      totalsCurRes,
      totalsPrevRes,
    ] = await Promise.allSettled([
      fetchDashboardKpis(from, to),
      getMoneySeriesForRange(from, to),
      fetchDashboardFunnel(from, to),
      fetchLeadsAppointmentsSeries(from, to),
      fetchClientsCreatedSeries(from, to),
      fetchDashboardRangeTotals(from, to),
      prior
        ? fetchDashboardRangeTotals(prior.from, prior.to)
        : Promise.resolve(null),
    ]);

    if (kpis.status === "fulfilled") {
      const c = kpis.value;
      counts = {
        activeClients: c.activeClients,
        activeProjects: c.activeProjects,
        errors: c.errors,
      };
    }
    if (money.status === "fulfilled") {
      chartData = money.value;
    }
    if (funnelRes.status === "fulfilled") {
      funnel = funnelRes.value;
    }
    if (leadsRes.status === "fulfilled") {
      leadsChartData = leadsRes.value;
    }
    if (clientsSeriesRes.status === "fulfilled") {
      clientsChartData = clientsSeriesRes.value;
    }
    if (totalsCurRes.status === "fulfilled") {
      businessTotalsCur = totalsCurRes.value;
    }
    if (
      totalsPrevRes.status === "fulfilled" &&
      totalsPrevRes.value !== null
    ) {
      businessTotalsPrev = totalsPrevRes.value;
    }
  } catch {
    /* schema not applied yet */
  }

  return (
    <div className="space-y-6 p-8">
      {counts.errors.length > 0 && (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-100">
          Run{" "}
          <code className="font-mono text-xs">supabase/migrations/*.sql</code>{" "}
          in the Supabase SQL editor if tables are missing.
        </p>
      )}
      <DashboardView
        activeClients={counts.activeClients}
        activeProjects={counts.activeProjects}
        wonRevenue={
          funnel.find((s) => s.label === DASHBOARD_FUNNEL_REVENUE_STAGE_LABEL)
            ?.value ?? 0
        }
        chartData={chartData}
        hasErrors={counts.errors.length > 0}
        dateFrom={from}
        dateTo={to}
        rangeLabel={rangeLabel}
        isAllTime={isAllTime}
        funnel={funnel}
        leadsChartData={leadsChartData}
        clientsChartData={clientsChartData}
        businessTotalsCur={businessTotalsCur}
        businessTotalsPrev={businessTotalsPrev}
      />
    </div>
  );
}
