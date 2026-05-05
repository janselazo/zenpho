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
      client(name)
    `
    )
    .order("updated_at", { ascending: false })
    .limit(200);

  if (error || !data) return [];

  type RowWithClient = {
    id: string;
    title: string | null;
    status: string | null;
    updated_at: string | null;
    client_id: string | null;
    client: { name: string } | null | { name: string }[];
  };

  return (data as RowWithClient[]).map((r) => {
    const cn = Array.isArray(r.client) ? r.client[0]?.name : r.client?.name;
    return {
      id: r.id,
      title: (r.title as string)?.trim() || "Untitled",
      status: parseSalesProposalStatus(r.status as string),
      clientName:
        typeof cn === "string" && cn.trim() ? cn.trim() : null,
      updatedAt: (r.updated_at as string) ?? "",
    };
  });
}
