import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { CrmProductServiceRow } from "@/lib/crm/crm-catalog-types";
import {
  buildBusinessVisualMarkdownBlock,
  originFromRequest,
  parseGooglePlaceSnapshot,
  spliceBeforeExecutiveSummary,
  summarizeBrandAssetsForPrompt,
  summarizeGoogleListingForPrompt,
} from "@/lib/crm/proposal-enrichment-context";
import { generateSalesProposalMarkdown } from "@/lib/crm/sales-proposal-llm";
import { resolveProspectBrandAssets } from "@/lib/crm/prospect-branding-asset-resolve";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

type Body = { proposalId?: unknown };

function parseUuidArray(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((x): x is string => typeof x === "string" && Boolean(x.trim()));
}

export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json(
      { ok: false as const, error: "Invalid JSON body." },
      { status: 400 }
    );
  }

  const proposalId =
    typeof body.proposalId === "string" ? body.proposalId.trim() : "";
  if (!proposalId) {
    return NextResponse.json(
      { ok: false as const, error: "proposalId is required." },
      { status: 400 }
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json(
      { ok: false as const, error: "Unauthorized" },
      { status: 401 }
    );
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "agency_admin" && profile?.role !== "agency_member") {
    return NextResponse.json(
      { ok: false as const, error: "Forbidden" },
      { status: 403 }
    );
  }

  const { data: row, error: rowErr } = await supabase
    .from("sales_proposal")
    .select(
      "id, client_id, wizard_notes, selected_catalog_item_ids, title, google_place_snapshot"
    )
    .eq("id", proposalId)
    .maybeSingle();

  if (rowErr || !row) {
    return NextResponse.json(
      { ok: false as const, error: "Proposal not found." },
      { status: 404 }
    );
  }

  const clientId =
    typeof row.client_id === "string" && row.client_id.trim()
      ? row.client_id.trim()
      : null;
  if (!clientId) {
    return NextResponse.json(
      { ok: false as const, error: "Link a client before generating." },
      { status: 400 }
    );
  }

  const selectedIds = parseUuidArray(row.selected_catalog_item_ids);
  if (selectedIds.length === 0) {
    return NextResponse.json(
      { ok: false as const, error: "Select at least one service first." },
      { status: 400 }
    );
  }

  const { data: clientRow, error: clientErr } = await supabase
    .from("client")
    .select("name, company, email, phone, notes")
    .eq("id", clientId)
    .maybeSingle();

  if (clientErr || !clientRow) {
    return NextResponse.json(
      { ok: false as const, error: "Client not found." },
      { status: 400 }
    );
  }

  const { data: catalogRows, error: catErr } = await supabase
    .from("crm_product_service")
    .select("id, name, description, unit_price, currency, sku, is_active, sort_order")
    .in("id", selectedIds);

  if (catErr || !catalogRows?.length) {
    return NextResponse.json(
      { ok: false as const, error: "Could not load selected catalog items." },
      { status: 400 }
    );
  }

  const byId = new Map<string, CrmProductServiceRow>();
  for (const r of catalogRows as Record<string, unknown>[]) {
    const row: CrmProductServiceRow = {
      id: r.id as string,
      name: String(r.name ?? "").trim() || "Unnamed",
      description: String(r.description ?? ""),
      unit_price: Number(r.unit_price) || 0,
      currency: String(r.currency ?? "usd"),
      sku: r.sku != null ? String(r.sku).trim() || null : null,
      is_active: Boolean(r.is_active),
      sort_order: Number(r.sort_order) || 0,
    };
    byId.set(row.id, row);
  }

  const services: CrmProductServiceRow[] = [];
  for (const id of selectedIds) {
    const hit = byId.get(id);
    if (hit) services.push(hit);
  }
  if (services.length === 0) {
    return NextResponse.json(
      { ok: false as const, error: "Selected services are no longer valid." },
      { status: 400 }
    );
  }

  const wizNotes =
    typeof row.wizard_notes === "string" ? row.wizard_notes : "";

  const snapshot = parseGooglePlaceSnapshot(row.google_place_snapshot);
  const clientDisplayName =
    (clientRow.name as string)?.trim() ||
    (clientRow.company as string)?.trim() ||
    "Client";

  let listingBlock: string | null = null;
  let brandSignalsBlock: string | null = null;
  let visualMd: string | null = null;

  if (snapshot) {
    listingBlock = summarizeGoogleListingForPrompt(snapshot);
    const brandAssets = snapshot.websiteUri?.trim()
      ? await resolveProspectBrandAssets({
          websiteUrl: snapshot.websiteUri,
          businessName:
            snapshot.name?.trim() || clientDisplayName,
        })
      : null;

    brandSignalsBlock = summarizeBrandAssetsForPrompt(
      brandAssets,
      snapshot.websiteUri
    );

    const origin = originFromRequest(req);
    visualMd = buildBusinessVisualMarkdownBlock(
      origin,
      snapshot.photoRefs
    );
  }

  const llm = await generateSalesProposalMarkdown({
    client: {
      name:
        (clientRow.name as string)?.trim() ||
        (clientRow.company as string)?.trim() ||
        "Client",
      company:
        typeof clientRow.company === "string"
          ? clientRow.company.trim() || null
          : null,
      email:
        typeof clientRow.email === "string"
          ? clientRow.email.trim() || null
          : null,
      phone:
        typeof clientRow.phone === "string"
          ? clientRow.phone.trim() || null
          : null,
      notes:
        typeof clientRow.notes === "string"
          ? clientRow.notes.trim() || null
          : null,
    },
    services,
    wizardNotes: wizNotes,
    enrichment:
      listingBlock?.trim() || brandSignalsBlock?.trim()
        ? {
            listingBlock,
            brandSignalsBlock,
          }
        : null,
  });

  if (!llm.ok) {
    return NextResponse.json(
      { ok: false as const, error: llm.error },
      { status: 500 }
    );
  }

  let proposalMd = llm.markdown;
  if (visualMd) {
    proposalMd = spliceBeforeExecutiveSummary(llm.markdown, visualMd);
  }

  const { error: upErr } = await supabase
    .from("sales_proposal")
    .update({
      title: llm.title.trim() || (row.title as string) || "Proposal",
      proposal_body: proposalMd,
      status: "generated",
      updated_at: new Date().toISOString(),
    })
    .eq("id", proposalId);

  if (upErr) {
    return NextResponse.json(
      { ok: false as const, error: upErr.message },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true as const,
    title: llm.title,
    markdown: proposalMd,
  });
}
