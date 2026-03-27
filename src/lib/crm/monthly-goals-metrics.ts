import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Calendar month bounds as ISO strings for timestamptz filters.
 * Deal.updated_at / project.created_at use the same pattern as dashboard-data.
 */
export function monthBoundsIso(anchor: Date): { startIso: string; endIso: string } {
  const y = anchor.getFullYear();
  const m = anchor.getMonth();
  const start = new Date(y, m, 1, 0, 0, 0, 0);
  const end = new Date(y, m + 1, 0, 23, 59, 59, 999);
  const pad = (n: number) => String(n).padStart(2, "0");
  const from = `${start.getFullYear()}-${pad(start.getMonth() + 1)}-${pad(start.getDate())}`;
  const to = `${end.getFullYear()}-${pad(end.getMonth() + 1)}-${pad(end.getDate())}`;
  return {
    startIso: `${from}T00:00:00.000Z`,
    endIso: `${to}T23:59:59.999Z`,
  };
}

/**
 * Distinct clients (via lead.converted_client_id) with a deal marked closed_won
 * whose updated_at falls in the month. "Won" uses deal.updated_at as proxy (no won_at column).
 */
export async function fetchMonthlyClientsWonCount(
  supabase: SupabaseClient,
  anchor: Date = new Date()
): Promise<number> {
  const { startIso, endIso } = monthBoundsIso(anchor);
  const { data: deals, error } = await supabase
    .from("deal")
    .select("lead_id")
    .eq("stage", "closed_won")
    .gte("updated_at", startIso)
    .lte("updated_at", endIso);

  if (error || !deals?.length) return 0;

  const leadIds = [...new Set(deals.map((d) => d.lead_id).filter(Boolean))];
  if (leadIds.length === 0) return 0;

  const { data: leads, error: le } = await supabase
    .from("lead")
    .select("converted_client_id")
    .in("id", leadIds);

  if (le) return 0;

  const clientIds = new Set<string>();
  for (const row of leads ?? []) {
    const cid = row.converted_client_id as string | null;
    if (cid) clientIds.add(cid);
  }
  return clientIds.size;
}

/**
 * Sum of project.budget for projects created this month whose client has at least one closed_won deal.
 */
export async function fetchMonthlyRevenueFromWonClientProjects(
  supabase: SupabaseClient,
  anchor: Date = new Date()
): Promise<number> {
  const { startIso, endIso } = monthBoundsIso(anchor);

  const { data: wonDeals, error: de } = await supabase
    .from("deal")
    .select("lead_id")
    .eq("stage", "closed_won");

  if (de || !wonDeals?.length) return 0;

  const wonLeadIds = [...new Set(wonDeals.map((d) => d.lead_id).filter(Boolean))];
  if (wonLeadIds.length === 0) return 0;

  const { data: leads, error: le } = await supabase
    .from("lead")
    .select("converted_client_id")
    .in("id", wonLeadIds);

  if (le) return 0;

  const clientIds = [
    ...new Set(
      (leads ?? [])
        .map((l) => l.converted_client_id as string | null)
        .filter((cid): cid is string => Boolean(cid))
    ),
  ];
  if (clientIds.length === 0) return 0;

  const { data: projects, error: pe } = await supabase
    .from("project")
    .select("budget")
    .in("client_id", clientIds)
    .gte("created_at", startIso)
    .lte("created_at", endIso);

  if (pe) return 0;

  return (projects ?? []).reduce(
    (s, p) => s + Number(p.budget ?? 0),
    0
  );
}
