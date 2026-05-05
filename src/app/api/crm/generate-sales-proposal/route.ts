import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { CrmProductServiceRow } from "@/lib/crm/crm-catalog-types";
import type { SalesProposalStrategySpec } from "@/lib/crm/sales-proposal-llm";
import {
  buildBusinessVisualMarkdownBlock,
  buildProposalAiVisualMarkdownSection,
  originFromRequest,
  parseGooglePlaceSnapshot,
  spliceBeforeExecutiveSummary,
  summarizeBrandAssetsForPrompt,
  summarizeGoogleListingForPrompt,
} from "@/lib/crm/proposal-enrichment-context";
import {
  expandSalesProposalFromStrategy,
  generateSalesProposalMarkdown,
  generateSalesProposalStrategySpec,
} from "@/lib/crm/sales-proposal-llm";
import { uploadProposalAiVisualPng } from "@/lib/crm/sales-proposal-ai-visual-storage";
import {
  generateProposalAiImages,
  paletteHexesFromBrand,
} from "@/lib/crm/sales-proposal-image-gen";
import { resolveProspectBrandAssets } from "@/lib/crm/prospect-branding-asset-resolve";
import type { ResolvedBrandAssets } from "@/lib/crm/prospect-branding-asset-resolve";
import { isProposalAiImageGenerationEnabled } from "@/lib/crm/proposal-ai-image-env";
import { classifyProspectVertical } from "@/lib/crm/prospect-vertical-classify";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

type Body = { proposalId?: unknown };

function parseUuidArray(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((x): x is string => typeof x === "string" && Boolean(x.trim()));
}

function proposalStrategyDisabled(): boolean {
  const raw = process.env.PROPOSAL_STRATEGY_DISABLED?.trim().toLowerCase();
  return raw === "1" || raw === "true" || raw === "yes";
}

function industryLabelsFromPlace(snapshot: ReturnType<
  typeof parseGooglePlaceSnapshot
>): string {
  if (!snapshot?.types?.length) return "";
  return snapshot.types
    .map((t) => t.replace(/_/g, " "))
    .filter(Boolean)
    .slice(0, 14)
    .join(", ");
}

function serviceNamesLine(services: CrmProductServiceRow[]): string {
  return services.map((s) => s.name).join(", ").slice(0, 640);
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
      "id, client_id, lead_id, wizard_notes, selected_catalog_item_ids, title, google_place_snapshot"
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
  const leadId =
    typeof row.lead_id === "string" && row.lead_id.trim()
      ? row.lead_id.trim()
      : null;

  let clientRow:
    | {
        name?: string | null;
        company?: string | null;
        email?: string | null;
        phone?: string | null;
        notes?: string | null;
      }
    | null = null;

  if (leadId) {
    const { data: leadDb, error: leadErr } = await supabase
      .from("lead")
      .select("name, company, email, phone, notes")
      .eq("id", leadId)
      .maybeSingle();

    if (leadErr || !leadDb) {
      return NextResponse.json(
        { ok: false as const, error: "Linked lead not found." },
        { status: 400 }
      );
    }
    clientRow = {
      name: leadDb.name as string | null | undefined,
      company: leadDb.company as string | null | undefined,
      email: leadDb.email as string | null | undefined,
      phone: typeof leadDb.phone === "string" ? leadDb.phone : null,
      notes: typeof leadDb.notes === "string" ? leadDb.notes : null,
    };
  } else if (clientId) {
    const { data: cRow, error: clientErr } = await supabase
      .from("client")
      .select("name, company, email, phone, notes")
      .eq("id", clientId)
      .maybeSingle();

    if (clientErr || !cRow) {
      return NextResponse.json(
        { ok: false as const, error: "Client not found." },
        { status: 400 }
      );
    }
    clientRow = cRow;
  }

  if (!clientRow) {
    return NextResponse.json(
      {
        ok: false as const,
        error: "Could not resolve a buyer — go back and complete step 1.",
      },
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

  const { data: catalogRows, error: catErr } = await supabase
    .from("crm_product_service")
    .select("id, name, description, unit_price, discounted_price, currency, sku, is_active, sort_order")
    .in("id", selectedIds);

  if (catErr || !catalogRows?.length) {
    return NextResponse.json(
      { ok: false as const, error: "Could not load selected catalog items." },
      { status: 400 }
    );
  }

  const byId = new Map<string, CrmProductServiceRow>();
  for (const r of catalogRows as Record<string, unknown>[]) {
    const line: CrmProductServiceRow = {
      id: r.id as string,
      name: String(r.name ?? "").trim() || "Unnamed",
      description: String(r.description ?? ""),
      unit_price: Number(r.unit_price) || 0,
      discounted_price: (() => {
        const v = r.discounted_price;
        if (v == null || v === "") return null;
        const n = Number(v);
        return Number.isFinite(n) ? n : null;
      })(),
      currency: String(r.currency ?? "usd"),
      sku: r.sku != null ? String(r.sku).trim() || null : null,
      is_active: Boolean(r.is_active),
      sort_order: Number(r.sort_order) || 0,
    };
    byId.set(line.id, line);
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
    typeof clientRow.name === "string"
      ? clientRow.name.trim()
      : typeof clientRow.company === "string"
        ? clientRow.company.trim()
        : "";
  const buyerLabel = clientDisplayName || "Buyer";

  let listingBlock: string | null = null;
  let brandSignalsBlock: string | null = null;
  let visualMd: string | null = null;

  let brandAssets: ResolvedBrandAssets | null = null;

  if (snapshot) {
    listingBlock = summarizeGoogleListingForPrompt(snapshot);
    brandAssets = snapshot.websiteUri?.trim()
      ? await resolveProspectBrandAssets({
          websiteUrl: snapshot.websiteUri,
          businessName:
            snapshot.name?.trim() || buyerLabel,
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

  const llmInput = {
    client: {
      name:
        (typeof clientRow.name === "string" ? clientRow.name.trim() : "") ||
        (typeof clientRow.company === "string" ? clientRow.company.trim() : "") ||
        "Buyer",
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
  };

  const warnings: string[] = [];

  let strategy: SalesProposalStrategySpec | null = null;

  if (!proposalStrategyDisabled()) {
    const strat = await generateSalesProposalStrategySpec(llmInput);
    if (strat.ok) {
      strategy = strat.data;
    } else {
      warnings.push(
        `Proposal strategy outline skipped: ${strat.error} Falling back to single-pass.`,
      );
    }
  }

  const llm =
    strategy != null && !proposalStrategyDisabled()
      ? await expandSalesProposalFromStrategy(strategy, llmInput)
      : await generateSalesProposalMarkdown(llmInput);

  if (!llm.ok) {
    return NextResponse.json(
      { ok: false as const, error: llm.error, warnings },
      { status: 500 }
    );
  }

  let proposalMd = llm.markdown;

  /** Stored AI visual metadata for PDF re-fetch */
  let aiStored: { path: string; caption: string }[] = [];
  let aiMarkdownSection: string | null = null;

  const apiKeyConfigured = Boolean(process.env.OPENAI_API_KEY?.trim());

  if (isProposalAiImageGenerationEnabled() && apiKeyConfigured) {
    const vertical = classifyProspectVertical({
      place: snapshot,
      signals: {},
    });

    const hexes =
      paletteHexesFromBrand(
        brandAssets?.palette ?? [],
        brandAssets?.primary ?? null,
        brandAssets?.accent ?? null,
      );

    try {
      const imgOut = await generateProposalAiImages({
        strategy,
        vertical,
        paletteHexes: hexes,
        businessName: buyerLabel,
        industryLabels: industryLabelsFromPlace(snapshot),
        serviceNamesLine: serviceNamesLine(services),
      });
      imgOut.errors.forEach((e) => warnings.push(`AI image: ${e}`));

      const mdItems: { caption: string; publicUrl: string }[] = [];
      for (const img of imgOut.images) {
        if (!img.buffer?.length) continue;
        const uploaded = await uploadProposalAiVisualPng({
          proposalId,
          ordinal: img.slotIndex,
          bytes: img.buffer,
        });
        if (!uploaded.ok) {
          warnings.push(`AI image upload: ${uploaded.error}`);
          continue;
        }
        aiStored.push({ path: uploaded.path, caption: img.caption });
        mdItems.push({ caption: img.caption, publicUrl: uploaded.publicUrl });
      }

      aiMarkdownSection = buildProposalAiVisualMarkdownSection(mdItems);
    } catch (e) {
      const msg =
        e instanceof Error ? e.message : "Unexpected AI imagery failure.";
      warnings.push(`AI images skipped: ${msg}`);
    }
  }

  const visualPieces = [
    typeof visualMd === "string" ? visualMd.trim() : "",
    aiMarkdownSection?.trim() ?? "",
  ].filter(Boolean);
  const insertCombined = visualPieces.join("\n");
  if (insertCombined) {
    proposalMd = spliceBeforeExecutiveSummary(proposalMd, `${insertCombined}\n`);
  }

  const { error: upErr } = await supabase
    .from("sales_proposal")
    .update({
      title: llm.title.trim() || (row.title as string) || "Proposal",
      proposal_body: proposalMd,
      status: "generated",
      proposal_strategy:
        strategy && !proposalStrategyDisabled() ? strategy : null,
      proposal_ai_visuals: aiStored,
      updated_at: new Date().toISOString(),
    })
    .eq("id", proposalId);

  if (upErr) {
    return NextResponse.json(
      { ok: false as const, error: upErr.message, warnings },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true as const,
    title: llm.title,
    markdown: proposalMd,
    warnings,
  });
}
