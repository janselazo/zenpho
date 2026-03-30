import { enumerateDays } from "@/lib/crm/dashboard-range";
import {
  DASHBOARD_FUNNEL_REVENUE_STAGE_LABEL,
  type ClientsCreatedPoint,
  type DashboardFunnelStage,
  type DashboardRangeTotals,
  type LeadsAppointmentsPoint,
} from "@/lib/crm/dashboard-types";
import { createClient } from "@/lib/supabase/server";

function toLocalYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function dayKeyFromTimestamptz(iso: string): string {
  return toLocalYmd(new Date(iso));
}

function parseLocalYmd(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function startOfWeekSunday(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  x.setDate(x.getDate() - x.getDay());
  return x;
}

const rangeStart = (from: string) => `${from}T00:00:00.000Z`;
const rangeEnd = (to: string) => `${to}T23:59:59.999Z`;

export async function fetchDashboardKpis(from: string, to: string) {
  const supabase = await createClient();
  const rs = rangeStart(from);
  const re = rangeEnd(to);

  const [clients, projects] = await Promise.all([
    supabase
      .from("client")
      .select("*", { count: "exact", head: true })
      .gte("created_at", rs)
      .lte("created_at", re),
    supabase
      .from("project")
      .select("*", { count: "exact", head: true })
      .gte("created_at", rs)
      .lte("created_at", re),
  ]);

  return {
    activeClients: clients.count ?? 0,
    activeProjects: projects.count ?? 0,
    errors: [clients.error, projects.error].filter(Boolean),
  };
}

export async function fetchDashboardFunnel(
  from: string,
  to: string
): Promise<DashboardFunnelStage[]> {
  const supabase = await createClient();
  const rs = rangeStart(from);
  const re = rangeEnd(to);

  const [
    leadsRes,
    apptsRes,
    qualifiedRes,
    projectsRes,
  ] = await Promise.all([
    supabase
      .from("lead")
      .select("*", { count: "exact", head: true })
      .gte("created_at", rs)
      .lte("created_at", re),
    supabase
      .from("appointment")
      .select("*", { count: "exact", head: true })
      .gte("starts_at", rs)
      .lte("starts_at", re),
    supabase
      .from("lead")
      .select("*", { count: "exact", head: true })
      .in("stage", [
        "qualified",
        "discoverycall_completed",
        "proposal_sent",
        "negotiation",
      ])
      .gte("created_at", rs)
      .lte("created_at", re),
    /** Projects created in range — budget sums feed funnel “revenue” column (deal table deprecated). */
    supabase
      .from("project")
      .select("budget")
      .gte("created_at", rs)
      .lte("created_at", re),
  ]);

  const projectRows = projectsRes.data ?? [];
  const projectsCreatedCount = projectRows.length;
  const revenue = projectRows.reduce(
    (s, p) => s + Number(p.budget ?? 0),
    0
  );

  return [
    {
      label: "Leads",
      count: leadsRes.count ?? 0,
      value: 0,
      color: "#3b82f6",
      bg: "bg-blue-50 dark:bg-blue-500/12",
    },
    {
      label: "Appointments",
      count: apptsRes.count ?? 0,
      value: 0,
      color: "#8b5cf6",
      bg: "bg-violet-50 dark:bg-violet-500/12",
    },
    {
      label: "Qualified",
      count: qualifiedRes.count ?? 0,
      value: 0,
      color: "#10b981",
      bg: "bg-emerald-50 dark:bg-emerald-500/12",
    },
    {
      label: "Projects",
      count: projectsCreatedCount,
      value: 0,
      color: "#f59e0b",
      bg: "bg-amber-50 dark:bg-amber-500/12",
    },
    {
      label: DASHBOARD_FUNNEL_REVENUE_STAGE_LABEL,
      count: 0,
      value: revenue,
      color: "#10b981",
      bg: "bg-emerald-50 dark:bg-emerald-500/12",
    },
  ];
}

/** Daily leads created + appointments starting, for bar chart (capped granularity). */
export async function fetchLeadsAppointmentsSeries(
  from: string,
  to: string
): Promise<LeadsAppointmentsPoint[]> {
  const supabase = await createClient();
  const days = enumerateDays(from, to);
  if (days.length === 0) return [];

  const rs = rangeStart(from);
  const re = rangeEnd(to);

  const [leadsRes, apptsRes] = await Promise.all([
    supabase.from("lead").select("created_at").gte("created_at", rs).lte("created_at", re),
    supabase
      .from("appointment")
      .select("starts_at")
      .gte("starts_at", rs)
      .lte("starts_at", re),
  ]);

  const leadByDay: Record<string, number> = {};
  const apptByDay: Record<string, number> = {};
  for (const d of days) {
    leadByDay[d] = 0;
    apptByDay[d] = 0;
  }

  for (const row of leadsRes.data ?? []) {
    const k = dayKeyFromTimestamptz(row.created_at as string);
    if (leadByDay[k] !== undefined) leadByDay[k] += 1;
  }
  for (const row of apptsRes.data ?? []) {
    const k = dayKeyFromTimestamptz(row.starts_at as string);
    if (apptByDay[k] !== undefined) apptByDay[k] += 1;
  }

  if (days.length > 120) {
    const leadByMonth: Record<string, number> = {};
    const apptByMonth: Record<string, number> = {};
    for (const d of days) {
      const ym = d.slice(0, 7);
      leadByMonth[ym] = (leadByMonth[ym] ?? 0) + (leadByDay[d] ?? 0);
      apptByMonth[ym] = (apptByMonth[ym] ?? 0) + (apptByDay[d] ?? 0);
    }
    const monthKeys = [...new Set(days.map((d) => d.slice(0, 7)))].sort();
    return monthKeys.map((ym) => ({
      label: parseLocalYmd(`${ym}-01`).toLocaleDateString(undefined, {
        month: "short",
        year: "numeric",
      }),
      leads: leadByMonth[ym] ?? 0,
      appointments: apptByMonth[ym] ?? 0,
    }));
  }

  const useWeekly = days.length > 31;
  if (!useWeekly) {
    return days.map((d) => {
      const dt = new Date(d + "T12:00:00");
      return {
        label: dt.toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
        }),
        leads: leadByDay[d] ?? 0,
        appointments: apptByDay[d] ?? 0,
      };
    });
  }

  type WeekAcc = { leads: number; appointments: number; label: string; sort: number };
  const byWeek = new Map<string, WeekAcc>();
  let sort = 0;
  for (const d of days) {
    const sunday = startOfWeekSunday(parseLocalYmd(d));
    const key = toLocalYmd(sunday);
    let acc = byWeek.get(key);
    if (!acc) {
      acc = {
        leads: 0,
        appointments: 0,
        label: sunday.toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
        }),
        sort: sort++,
      };
      byWeek.set(key, acc);
    }
    acc.leads += leadByDay[d] ?? 0;
    acc.appointments += apptByDay[d] ?? 0;
  }

  return [...byWeek.entries()]
    .sort((a, b) => a[1].sort - b[1].sort)
    .map(([, v]) => ({
      label: v.label,
      leads: v.leads,
      appointments: v.appointments,
    }));
}

/** Aggregate counts for dashboard KPI strip (matches series totals for the same range). */
export async function fetchDashboardRangeTotals(
  from: string,
  to: string
): Promise<DashboardRangeTotals> {
  const supabase = await createClient();
  const rs = rangeStart(from);
  const re = rangeEnd(to);

  const [leadsRes, apptsRes, clientsRes, revenueRes] = await Promise.all([
    supabase
      .from("lead")
      .select("*", { count: "exact", head: true })
      .gte("created_at", rs)
      .lte("created_at", re),
    supabase
      .from("appointment")
      .select("*", { count: "exact", head: true })
      .gte("starts_at", rs)
      .lte("starts_at", re),
    supabase
      .from("client")
      .select("*", { count: "exact", head: true })
      .gte("created_at", rs)
      .lte("created_at", re),
    supabase
      .from("transaction")
      .select("amount")
      .eq("type", "revenue")
      .gte("date", from)
      .lte("date", to),
  ]);

  const revenue =
    revenueRes.data?.reduce((s, r) => s + Number(r.amount), 0) ?? 0;

  return {
    leads: leadsRes.count ?? 0,
    appointments: apptsRes.count ?? 0,
    clients: clientsRes.count ?? 0,
    revenue,
  };
}

/** Clients created per day/week/month — same bucketing as leads/appointments chart. */
export async function fetchClientsCreatedSeries(
  from: string,
  to: string
): Promise<ClientsCreatedPoint[]> {
  const supabase = await createClient();
  const days = enumerateDays(from, to);
  if (days.length === 0) return [];

  const rs = rangeStart(from);
  const re = rangeEnd(to);

  const { data } = await supabase
    .from("client")
    .select("created_at")
    .gte("created_at", rs)
    .lte("created_at", re);

  const byDay: Record<string, number> = {};
  for (const d of days) {
    byDay[d] = 0;
  }
  for (const row of data ?? []) {
    const k = dayKeyFromTimestamptz(row.created_at as string);
    if (byDay[k] !== undefined) byDay[k] += 1;
  }

  if (days.length > 120) {
    const byMonth: Record<string, number> = {};
    for (const d of days) {
      const ym = d.slice(0, 7);
      byMonth[ym] = (byMonth[ym] ?? 0) + (byDay[d] ?? 0);
    }
    const monthKeys = [...new Set(days.map((d) => d.slice(0, 7)))].sort();
    return monthKeys.map((ym) => ({
      label: parseLocalYmd(`${ym}-01`).toLocaleDateString(undefined, {
        month: "short",
        year: "numeric",
      }),
      clients: byMonth[ym] ?? 0,
    }));
  }

  const useWeekly = days.length > 31;
  if (!useWeekly) {
    return days.map((d) => {
      const dt = new Date(d + "T12:00:00");
      return {
        label: dt.toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
        }),
        clients: byDay[d] ?? 0,
      };
    });
  }

  type WeekAcc = { clients: number; label: string; sort: number };
  const byWeek = new Map<string, WeekAcc>();
  let sort = 0;
  for (const d of days) {
    const sunday = startOfWeekSunday(parseLocalYmd(d));
    const key = toLocalYmd(sunday);
    let acc = byWeek.get(key);
    if (!acc) {
      acc = {
        clients: 0,
        label: sunday.toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
        }),
        sort: sort++,
      };
      byWeek.set(key, acc);
    }
    acc.clients += byDay[d] ?? 0;
  }

  return [...byWeek.entries()]
    .sort((a, b) => a[1].sort - b[1].sort)
    .map(([, v]) => ({
      label: v.label,
      clients: v.clients,
    }));
}
