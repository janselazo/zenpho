import { createClient } from "@/lib/supabase/server";
import {
  parseSalesProposalStatus,
  type SalesProposalListRow,
} from "@/lib/crm/sales-proposal-types";

export async function fetchSalesProposalsForList(): Promise<
  SalesProposalListRow[]
> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("sales_proposal")
    .select(
      `
      id,
      title,
      status,
      updated_at,
      client_id,
      lead_id,
      client(name),
      lead(name)
    `
    )
    .order("updated_at", { ascending: false })
    .limit(200);

  if (error || !data) return [];

  type RowWithParty = {
    id: string;
    title: string | null;
    status: string | null;
    updated_at: string | null;
    client_id: string | null;
    lead_id: string | null;
    client: { name: string } | null | { name: string }[];
    lead: { name: string } | null | { name: string }[];
  };

  return (data as RowWithParty[]).map((r) => {
    const lc = Array.isArray(r.lead) ? r.lead[0]?.name : r.lead?.name;
    const cc = Array.isArray(r.client) ? r.client[0]?.name : r.client?.name;
    const raw =
      (typeof lc === "string" && lc.trim()) ||
      (typeof cc === "string" && cc.trim()) ||
      null;
    return {
      id: r.id,
      title: (r.title as string)?.trim() || "Untitled",
      status: parseSalesProposalStatus(r.status as string),
      clientName: raw ? raw.trim() : null,
      updatedAt: (r.updated_at as string) ?? "",
    };
  });
}
