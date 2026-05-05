import { createClient } from "@/lib/supabase/server";
import {
  parseSalesProposalStatus,
  type SalesProposalCatalogLineRow,
  type SalesProposalDetail,
} from "@/lib/crm/sales-proposal-types";

export async function fetchSalesProposalDetail(
  id: string
): Promise<SalesProposalDetail | null> {
  const supabase = await createClient();
  const { data: row, error } = await supabase
    .from("sales_proposal")
    .select(
      `
      id,
      client_id,
      title,
      status,
      about_us,
      our_story,
      services_overview,
      closing_notes,
      updated_at,
      client(name)
    `
    )
    .eq("id", id)
    .maybeSingle();

  if (error || !row) return null;

  type ClientJoin = null | { name: string };

  const cj =
    typeof row.client === "object" && row.client && !Array.isArray(row.client)
      ? (row.client as ClientJoin)
      : Array.isArray(row.client)
        ? (row.client[0] as ClientJoin | undefined) ?? null
        : null;
  const cn = typeof cj?.name === "string" ? cj.name.trim() : "";

  const { data: lineRows } = await supabase
    .from("sales_proposal_catalog_line")
    .select(
      "id, catalog_item_id, description_snapshot, unit_price_snapshot, sort_order"
    )
    .eq("sales_proposal_id", id)
    .order("sort_order", { ascending: true });

  const catalogLines: SalesProposalCatalogLineRow[] = (lineRows ?? []).map(
    (r) => ({
      id: r.id as string,
      catalog_item_id: (r.catalog_item_id as string | null) ?? null,
      description_snapshot:
        typeof r.description_snapshot === "string"
          ? r.description_snapshot
          : "",
      unit_price_snapshot: Number(r.unit_price_snapshot) || 0,
      sort_order: Number(r.sort_order) || 0,
    })
  );

  return {
    id: row.id as string,
    clientId:
      typeof row.client_id === "string" && row.client_id.trim()
        ? row.client_id.trim()
        : null,
    clientName: cn || null,
    title: typeof row.title === "string" ? row.title.trim() || "Untitled" : "Untitled",
    status: parseSalesProposalStatus(row.status as string),
    about_us: typeof row.about_us === "string" ? row.about_us : "",
    our_story: typeof row.our_story === "string" ? row.our_story : "",
    services_overview:
      typeof row.services_overview === "string" ? row.services_overview : "",
    closing_notes:
      typeof row.closing_notes === "string" ? row.closing_notes : "",
    catalogLines,
    updatedAt: (row.updated_at as string) ?? "",
  };
}
