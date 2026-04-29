import type { SupabaseClient } from "@supabase/supabase-js";
import { readProjectSourceLeadId } from "@/lib/crm/prospect-client-shell";

/**
 * Calendar month bounds as ISO strings for timestamptz filters.
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
 * Distinct clients linked to leads moved to `closed_won` in the month
 * (`lead.updated_at` in range). Aligns with pipeline “won” without the deal table.
 */
export async function fetchMonthlyClientsWonCount(
  supabase: SupabaseClient,
  anchor: Date = new Date()
): Promise<number> {
  const { startIso, endIso } = monthBoundsIso(anchor);
  const { data: rows, error } = await supabase
    .from("lead")
    .select("converted_client_id")
    .eq("stage", "closed_won")
    .gte("updated_at", startIso)
    .lte("updated_at", endIso);

  if (error || !rows?.length) return 0;

  const clientIds = new Set<string>();
  for (const row of rows) {
    const cid = row.converted_client_id as string | null;
    if (cid?.trim()) clientIds.add(cid.trim());
  }
  return clientIds.size;
}

/**
 * Sum of `project.budget` for root products whose lead is Won (projects from a lead with
 * `metadata.sourceLeadId`) or any product without a source lead link (studio clients).
 */
export async function fetchMonthlyRevenueFromWonClientProjects(
  supabase: SupabaseClient,
  anchor: Date = new Date()
): Promise<number> {
  const { startIso, endIso } = monthBoundsIso(anchor);

  const { data: projects, error } = await supabase
    .from("project")
    .select("budget, metadata")
    .is("parent_project_id", null)
    .gte("created_at", startIso)
    .lte("created_at", endIso);

  if (error) return 0;

  const leadIds = [
    ...new Set(
      (projects ?? [])
        .map((p) => readProjectSourceLeadId(p.metadata))
        .filter((id): id is string => Boolean(id))
    ),
  ];

  const stageByLead = new Map<string, string>();
  if (leadIds.length > 0) {
    const { data: lr } = await supabase
      .from("lead")
      .select("id, stage")
      .in("id", leadIds);
    for (const r of lr ?? []) {
      stageByLead.set(
        r.id as string,
        String((r.stage as string | null) ?? "").trim()
      );
    }
  }

  let sum = 0;
  for (const p of projects ?? []) {
    const sid = readProjectSourceLeadId(p.metadata);
    if (sid) {
      if (stageByLead.get(sid) !== "closed_won") continue;
    }
    sum += Number((p.budget as number | null) ?? 0);
  }
  return sum;
}
