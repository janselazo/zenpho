import { enumerateDays } from "@/lib/crm/dashboard-range";
import {
  notesIncludeProspectShellMarker,
} from "@/lib/crm/prospect-client-shell";
import {
  type ClientsCreatedPoint,
  type DashboardFunnelStage,
  type DashboardRangeTotals,
  type LeadsAppointmentsPoint,
} from "@/lib/crm/dashboard-types";
import { fetchCrmAccessContext } from "@/lib/crm/access-context";
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
  const access = await fetchCrmAccessContext(supabase);
  const organizationId = access?.organizationId ?? null;
  if (!organizationId) {
    return { activeClients: 0, activeProjects: 0, errors: [] };
  }

  const rs = rangeStart(from);
  const re = rangeEnd(to);
  let clientsQuery = supabase
    .from("client")
    .select("notes")
    .eq("organization_id", organizationId)
    .gte("created_at", rs)
    .lte("created_at", re);
  let projectsQuery = supabase
    .from("project")
    .select("*", { count: "exact", head: true })
    .eq("organization_id", organizationId)
    .is("parent_project_id", null)
    .gte("created_at", rs)
    .lte("created_at", re);
  if (access && !access.canManageTeam) {
    clientsQuery = clientsQuery.eq("owner_id", access.userId);
    projectsQuery = projectsQuery.or(
      `owner_id.eq.${access.userId},assigned_to.eq.${access.userId}`
    );
  }

  const [{ data: clientsInRange, error: clientsErr }, projects] =
    await Promise.all([clientsQuery, projectsQuery]);

  const activeClients = (clientsInRange ?? []).filter(
    (r) => !notesIncludeProspectShellMarker(r.notes as string | null)
  ).length;

  return {
    activeClients,
    activeProjects: projects.count ?? 0,
    errors: [clientsErr, projects.error].filter(Boolean),
  };
}

export async function fetchDashboardFunnel(
  from: string,
  to: string
): Promise<DashboardFunnelStage[]> {
  const supabase = await createClient();
  const access = await fetchCrmAccessContext(supabase);
  const organizationId = access?.organizationId ?? null;
  const rs = rangeStart(from);
  const re = rangeEnd(to);

  let leadsQuery = organizationId
    ? supabase
        .from("lead")
        .select("*", { count: "exact", head: true })
        .eq("organization_id", organizationId)
        .gte("created_at", rs)
        .lte("created_at", re)
    : null;
  let apptsQuery = organizationId
    ? supabase
        .from("appointment")
        .select("*", { count: "exact", head: true })
        .eq("organization_id", organizationId)
        .gte("starts_at", rs)
        .lte("starts_at", re)
    : null;
  let qualifiedQuery = organizationId
    ? supabase
        .from("lead")
        .select("*", { count: "exact", head: true })
        .eq("organization_id", organizationId)
        .in("stage", [
          "qualified",
          "discoverycall_completed",
          "proposal_sent",
          "negotiation",
        ])
        .gte("created_at", rs)
        .lte("created_at", re)
    : null;
  let projectsQuery = organizationId
    ? supabase
        .from("project")
        .select("*", { count: "exact", head: true })
        .eq("organization_id", organizationId)
        .is("parent_project_id", null)
        .gte("created_at", rs)
        .lte("created_at", re)
    : null;
  if (access && !access.canViewAllOrgLeads) {
    leadsQuery = leadsQuery?.eq("owner_id", access.userId) ?? null;
    qualifiedQuery = qualifiedQuery?.eq("owner_id", access.userId) ?? null;
  }
  if (access && !access.canManageTeam) {
    apptsQuery = apptsQuery?.eq("created_by", access.userId) ?? null;
    projectsQuery =
      projectsQuery?.or(`owner_id.eq.${access.userId},assigned_to.eq.${access.userId}`) ??
      null;
  }

  const [leadsRes, apptsRes, qualifiedRes, projectsRes] = organizationId
    ? await Promise.all([leadsQuery!, apptsQuery!, qualifiedQuery!, projectsQuery!])
    : [{ count: 0 }, { count: 0 }, { count: 0 }, { count: 0 }];

  const projectsCreatedCount = projectsRes.count ?? 0;

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
  ];
}

/** Daily leads created + appointments starting, for bar chart (capped granularity). */
export async function fetchLeadsAppointmentsSeries(
  from: string,
  to: string
): Promise<LeadsAppointmentsPoint[]> {
  const supabase = await createClient();
  const access = await fetchCrmAccessContext(supabase);
  const organizationId = access?.organizationId ?? null;
  const days = enumerateDays(from, to);
  if (days.length === 0) return [];

  const rs = rangeStart(from);
  const re = rangeEnd(to);

  let leadsQuery = organizationId
    ? supabase
        .from("lead")
        .select("created_at")
        .eq("organization_id", organizationId)
        .gte("created_at", rs)
        .lte("created_at", re)
    : null;
  let apptsQuery = organizationId
    ? supabase
        .from("appointment")
        .select("starts_at")
        .eq("organization_id", organizationId)
        .gte("starts_at", rs)
        .lte("starts_at", re)
    : null;
  if (access && !access.canViewAllOrgLeads) {
    leadsQuery = leadsQuery?.eq("owner_id", access.userId) ?? null;
  }
  if (access && !access.canManageTeam) {
    apptsQuery = apptsQuery?.eq("created_by", access.userId) ?? null;
  }

  const [leadsRes, apptsRes] = organizationId
    ? await Promise.all([leadsQuery!, apptsQuery!])
    : [{ data: [] }, { data: [] }];

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
  const access = await fetchCrmAccessContext(supabase);
  const organizationId = access?.organizationId ?? null;
  if (!organizationId) {
    return {
      leads: 0,
      appointments: 0,
      clients: 0,
      revenue: 0,
    };
  }

  const rs = rangeStart(from);
  const re = rangeEnd(to);
  let leadsQuery = supabase
    .from("lead")
    .select("*", { count: "exact", head: true })
    .eq("organization_id", organizationId)
    .gte("created_at", rs)
    .lte("created_at", re);
  let apptsQuery = supabase
    .from("appointment")
    .select("*", { count: "exact", head: true })
    .eq("organization_id", organizationId)
    .gte("starts_at", rs)
    .lte("starts_at", re);
  let clientsQuery = supabase
    .from("client")
    .select("notes")
    .eq("organization_id", organizationId)
    .gte("created_at", rs)
    .lte("created_at", re);
  let revenueQuery = supabase
    .from("transaction")
    .select("amount")
    .eq("organization_id", organizationId)
    .eq("type", "revenue")
    .gte("date", from)
    .lte("date", to);
  if (access && !access.canViewAllOrgLeads) {
    leadsQuery = leadsQuery.eq("owner_id", access.userId);
  }
  if (access && !access.canManageTeam) {
    apptsQuery = apptsQuery.eq("created_by", access.userId);
    clientsQuery = clientsQuery.eq("owner_id", access.userId);
    revenueQuery = revenueQuery.eq("owner_id", access.userId);
  }

  const [leadsRes, apptsRes, clientsRange, revenueRes] = await Promise.all([
    leadsQuery,
    apptsQuery,
    clientsQuery,
    revenueQuery,
  ]);

  const revenue =
    revenueRes.data?.reduce((s, r) => s + Number(r.amount), 0) ?? 0;

  const clientsCount = (clientsRange.data ?? []).filter(
    (r) => !notesIncludeProspectShellMarker(r.notes as string | null)
  ).length;

  return {
    leads: leadsRes.count ?? 0,
    appointments: apptsRes.count ?? 0,
    clients: clientsCount,
    revenue,
  };
}

/** Clients created per day/week/month — same bucketing as leads/appointments chart. */
export async function fetchClientsCreatedSeries(
  from: string,
  to: string
): Promise<ClientsCreatedPoint[]> {
  const supabase = await createClient();
  const access = await fetchCrmAccessContext(supabase);
  const organizationId = access?.organizationId ?? null;
  const days = enumerateDays(from, to);
  if (days.length === 0) return [];

  const rs = rangeStart(from);
  const re = rangeEnd(to);

  let clientsQuery = organizationId
    ? supabase
        .from("client")
        .select("created_at, notes")
        .eq("organization_id", organizationId)
        .gte("created_at", rs)
        .lte("created_at", re)
    : null;
  if (access && !access.canManageTeam) {
    clientsQuery = clientsQuery?.eq("owner_id", access.userId) ?? null;
  }

  const { data } = organizationId
    ? await clientsQuery!
    : { data: [] as { created_at: string; notes: string | null }[] };

  const byDay: Record<string, number> = {};
  for (const d of days) {
    byDay[d] = 0;
  }
  for (const row of data ?? []) {
    if (notesIncludeProspectShellMarker(row.notes as string | null)) continue;
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
