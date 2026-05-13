import type { ClientTableRow } from "@/lib/crm/client-table-row";
import { createClient } from "@/lib/supabase/server";

export type FetchClientsForViewResult = {
  rows: ClientTableRow[];
  error: { message: string } | null;
};

/**
 * Loads clients with linked lead + deal title for the Clients CRM table.
 */
export async function fetchClientsForClientsView(
  organizationId: string | null,
  opts: { ownerId: string | null; teamWide?: boolean }
): Promise<FetchClientsForViewResult> {
  if (!organizationId || (!opts.teamWide && !opts.ownerId)) {
    return { rows: [], error: null };
  }

  const supabase = await createClient();
  let leadQuery = supabase
    .from("lead")
    .select("id, name, email, company, source, converted_client_id, created_at")
    .eq("organization_id", organizationId)
    .not("converted_client_id", "is", null)
    .order("created_at", { ascending: false });
  if (!opts.teamWide) {
    leadQuery = leadQuery.eq("owner_id", opts.ownerId ?? "");
  }
  const leadsRes = await leadQuery;

  if (leadsRes.error) {
    return { rows: [], error: { message: leadsRes.error.message } };
  }

  const leadByClientId = new Map<
    string,
    {
      id: string;
      name: string | null;
      email: string | null;
      company: string | null;
      source: string | null;
    }
  >();
  for (const row of leadsRes.data ?? []) {
    const cid = row.converted_client_id as string | null;
    if (!cid || leadByClientId.has(cid)) continue;
    leadByClientId.set(cid, {
      id: row.id,
      name: row.name,
      email: row.email,
      company: row.company,
      source: row.source,
    });
  }

  const clientIds = [...leadByClientId.keys()];
  if (clientIds.length === 0) {
    return { rows: [], error: null };
  }

  const leadIds = new Set((leadsRes.data ?? []).map((row) => row.id as string));
  const [clientsRes, dealsRes] = await Promise.all([
    supabase
      .from("client")
      .select("id, name, email, phone, company, notes, created_at")
      .eq("organization_id", organizationId)
      .in("id", clientIds)
      .order("created_at", { ascending: false })
      .limit(200),
    supabase
      .from("deal")
      .select("title, lead_id, updated_at")
      .eq("organization_id", organizationId)
      .in("lead_id", [...leadIds])
      .order("updated_at", { ascending: false })
      .limit(500),
  ]);

  const { data: clients, error } = clientsRes;
  if (error) {
    return { rows: [], error: { message: error.message } };
  }

  const dealTitleByLeadId = new Map<string, string>();
  for (const row of dealsRes.data ?? []) {
    const lid = row.lead_id as string | null;
    if (!lid || dealTitleByLeadId.has(lid)) continue;
    const t = (row.title ?? "").trim();
    if (!t) continue;
    dealTitleByLeadId.set(lid, t);
  }

  const rows: ClientTableRow[] =
    clients?.map((c) => {
      const linkedLead = leadByClientId.get(c.id) ?? null;
      const dealName = linkedLead
        ? (dealTitleByLeadId.get(linkedLead.id) ?? null)
        : null;
      return {
        ...c,
        linkedLead,
        dealName,
      };
    }) ?? [];

  return { rows, error: null };
}
