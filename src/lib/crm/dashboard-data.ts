import { createClient } from "@/lib/supabase/server";
import { enumerateDays } from "@/lib/crm/dashboard-range";

export type DashboardFunnelStage = {
  label: string;
  count: number;
  value: number;
  color: string;
  bg: string;
};

export type LeadsAppointmentsPoint = {
  label: string;
  leads: number;
  appointments: number;
};

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

  const [clients, projects, revenue, expenses] = await Promise.all([
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
    supabase
      .from("transaction")
      .select("amount")
      .eq("type", "revenue")
      .gte("date", from)
      .lte("date", to),
    supabase
      .from("transaction")
      .select("amount")
      .eq("type", "expense")
      .gte("date", from)
      .lte("date", to),
  ]);

  const revSum =
    revenue.data?.reduce((s, r) => s + Number(r.amount), 0) ?? 0;
  const expSum =
    expenses.data?.reduce((s, r) => s + Number(r.amount), 0) ?? 0;

  return {
    activeClients: clients.count ?? 0,
    activeProjects: projects.count ?? 0,
    revenueInRange: revSum,
    expensesInRange: expSum,
    errors: [clients.error, projects.error, revenue.error, expenses.error].filter(
      Boolean
    ),
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
    dealsRes,
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
    supabase
      .from("deal")
      .select("value")
      .eq("stage", "closed_won")
      .gte("updated_at", rs)
      .lte("updated_at", re),
  ]);

  const closedRows = dealsRes.data ?? [];
  const closedCount = closedRows.length;
  const revenue = closedRows.reduce((s, d) => s + Number(d.value ?? 0), 0);

  return [
    {
      label: "Opportunities",
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
      label: "Deals Closed",
      count: closedCount,
      value: 0,
      color: "#f59e0b",
      bg: "bg-amber-50 dark:bg-amber-500/12",
    },
    {
      label: "Revenue",
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
