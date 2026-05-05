import { createClient } from "@/lib/supabase/server";
import {
  parseSalesProposalStatus,
  type SalesProposalAiVisualRow,
  type SalesProposalCatalogLineRow,
  type SalesProposalDetail,
} from "@/lib/crm/sales-proposal-types";
import { coerceSalesProposalStrategySpec } from "@/lib/crm/sales-proposal-llm";
import { parseGooglePlaceSnapshot } from "@/lib/crm/proposal-enrichment-context";

function parseAiVisualRows(raw: unknown): SalesProposalAiVisualRow[] {
  if (!Array.isArray(raw)) return [];
  const out: SalesProposalAiVisualRow[] = [];
  for (const x of raw) {
    if (!x || typeof x !== "object") continue;
    const o = x as Record<string, unknown>;
    const path = typeof o.path === "string" ? o.path.trim() : "";
    const caption = typeof o.caption === "string" ? o.caption.trim() : "";
    if (path.startsWith("proposal-ai-visuals/"))
      out.push({
        path,
        caption: caption || "AI visualization",
      });
  }
  return out;
}

function parseUuidArray(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((x): x is string => typeof x === "string" && Boolean(x.trim()));
}

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
      proposal_body,
      google_place_snapshot,
      selected_catalog_item_ids,
      wizard_notes,
      total_price_estimate,
      proposal_strategy,
      proposal_ai_visuals,
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

  const tpe =
    row.total_price_estimate != null &&
    typeof row.total_price_estimate === "number"
      ? row.total_price_estimate
      : row.total_price_estimate != null &&
          typeof row.total_price_estimate === "string"
        ? Number.parseFloat(row.total_price_estimate as string)
        : null;

  const strategyParsed = coerceSalesProposalStrategySpec(
    row.proposal_strategy,
  );

  return {
    id: row.id as string,
    clientId:
      typeof row.client_id === "string" && row.client_id.trim()
        ? row.client_id.trim()
        : null,
    clientName: cn || null,
    title:
      typeof row.title === "string"
        ? row.title.trim() || "Untitled"
        : "Untitled",
    status: parseSalesProposalStatus(row.status as string),
    proposal_body:
      typeof row.proposal_body === "string" ? row.proposal_body : "",
    google_place_snapshot: parseGooglePlaceSnapshot(row.google_place_snapshot),
    selected_catalog_item_ids: parseUuidArray(row.selected_catalog_item_ids),
    wizard_notes:
      typeof row.wizard_notes === "string" ? row.wizard_notes : "",
    total_price_estimate: Number.isFinite(tpe ?? NaN) ? tpe : null,
    strategy: strategyParsed ?? null,
    ai_visuals: parseAiVisualRows(row.proposal_ai_visuals),
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
