import { Buffer } from "node:buffer";
import type { createClient } from "@/lib/supabase/server";
import { parseGooglePlaceSnapshot } from "@/lib/crm/proposal-enrichment-context";
import {
  collectProposalAiVisualRasters,
  collectProposalPdfRasters,
} from "@/lib/crm/proposal-pdf-rasters";
import {
  buildSalesProposalPdfBytes,
  slugifyPdfFilenameSegment,
  type SalesProposalPdfInput,
} from "@/lib/crm/sales-proposal-pdf";
import { downloadProposalSignatureBytesFromPath } from "@/lib/crm/proposal-pdf-signature";
import { resolveProspectBrandAssets } from "@/lib/crm/prospect-branding-asset-resolve";

type SupabaseServer = Awaited<ReturnType<typeof createClient>>;

function formatUsd(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(n);
}

function parseAiVisualRowsPdf(
  raw: unknown,
): { path: string; caption: string }[] {
  if (!Array.isArray(raw)) return [];
  const out: { path: string; caption: string }[] = [];
  for (const x of raw) {
    if (!x || typeof x !== "object") continue;
    const o = x as Record<string, unknown>;
    const path = typeof o.path === "string" ? o.path.trim() : "";
    const caption = typeof o.caption === "string" ? o.caption.trim() : "";
    if (path.startsWith("proposal-ai-visuals/"))
      out.push({ path, caption: caption || "AI visualization" });
  }
  return out;
}

export type SalesProposalPdfBuildResult =
  | {
      ok: true;
      bytes: Buffer;
      filename: string;
      title: string;
      buyerName: string;
      recipientEmail: string | null;
    }
  | { ok: false; status: number; error: string };

export async function buildSalesProposalPdfForDelivery(params: {
  supabase: SupabaseServer;
  proposalId: string;
}): Promise<SalesProposalPdfBuildResult> {
  const proposalId = params.proposalId.trim();
  if (!proposalId) return { ok: false, status: 400, error: "proposalId required" };

  const { data: row, error } = await params.supabase
    .from("sales_proposal")
    .select(
      `
      id,
      title,
      proposal_body,
      total_price_estimate,
      client_id,
      lead_id,
      google_place_snapshot,
      proposal_ai_visuals,
      signature_image_path,
      signature_signer_name,
      signature_signed_at,
      client(name, company, email),
      lead(name, company, email)
    `,
    )
    .eq("id", proposalId)
    .maybeSingle();

  if (error || !row) {
    return { ok: false, status: 404, error: "Proposal not found" };
  }

  const bodyMd =
    typeof row.proposal_body === "string" ? row.proposal_body.trim() : "";
  if (!bodyMd) {
    return { ok: false, status: 400, error: "Proposal has no body to export yet." };
  }

  const leadJoin = Array.isArray(row.lead)
    ? row.lead[0]
    : (row.lead as
        | { name?: string | null; company?: string | null; email?: string | null }
        | null);
  const clientJoin = Array.isArray(row.client)
    ? row.client[0]
    : (row.client as
        | { name?: string | null; company?: string | null; email?: string | null }
        | null);

  const nameFromLead =
    typeof leadJoin?.name === "string" && leadJoin.name.trim()
      ? leadJoin.name.trim()
      : typeof leadJoin?.company === "string" && leadJoin.company.trim()
        ? leadJoin.company.trim()
        : "";
  const nameFromClient =
    typeof clientJoin?.name === "string" && clientJoin.name.trim()
      ? clientJoin.name.trim()
      : typeof clientJoin?.company === "string" && clientJoin.company.trim()
        ? clientJoin.company.trim()
        : "";
  const buyerName = nameFromLead || nameFromClient || "Client";

  const recipientEmail =
    (typeof leadJoin?.email === "string" && leadJoin.email.trim()) ||
    (typeof clientJoin?.email === "string" && clientJoin.email.trim()) ||
    null;

  const company =
    typeof clientJoin?.company === "string" && clientJoin.company.trim()
      ? clientJoin.company.trim()
      : typeof leadJoin?.company === "string" && leadJoin.company.trim()
        ? leadJoin.company.trim()
        : "";

  const title =
    typeof row.title === "string" && row.title.trim()
      ? row.title.trim()
      : "Proposal";

  const tpe =
    row.total_price_estimate != null &&
    typeof row.total_price_estimate === "number"
      ? row.total_price_estimate
      : row.total_price_estimate != null &&
          typeof row.total_price_estimate === "string"
        ? Number.parseFloat(row.total_price_estimate)
        : null;

  const investment =
    tpe != null && Number.isFinite(tpe)
      ? `Estimated investment (from catalog selections): ${formatUsd(tpe)}. Final pricing subject to contract.`
      : "";

  const dateStr = new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

  const clientLine = company ? `${buyerName} (${company})` : buyerName;
  const placeSnapshot = parseGooglePlaceSnapshot(row.google_place_snapshot);
  const listingSite = placeSnapshot?.websiteUri?.trim() ?? "";
  const brandLabel = buyerName || placeSnapshot?.name?.trim() || title;

  const [rasterSlots, brandAssets] = await Promise.all([
    collectProposalPdfRasters({
      googlePlacesApiKey: process.env.GOOGLE_PLACES_API_KEY,
      place: placeSnapshot,
      businessLabel: buyerName,
    }),
    listingSite
      ? resolveProspectBrandAssets({
          websiteUrl: listingSite,
          businessName: brandLabel || undefined,
        })
      : Promise.resolve(null),
  ]);

  const aiRasterRows = parseAiVisualRowsPdf(row.proposal_ai_visuals);
  const aiRasters =
    aiRasterRows.length > 0
      ? await collectProposalAiVisualRasters({ rows: aiRasterRows })
      : [];

  const allRasters = [...rasterSlots, ...aiRasters];

  let agencySignature: SalesProposalPdfInput["agencySignature"] = null;
  const sigPath =
    typeof row.signature_image_path === "string"
      ? row.signature_image_path.trim()
      : "";
  if (sigPath) {
    const sigBuf = await downloadProposalSignatureBytesFromPath(sigPath);
    if (sigBuf?.length) {
      const signerRaw =
        typeof row.signature_signer_name === "string"
          ? row.signature_signer_name.trim()
          : "";
      const signedRaw = row.signature_signed_at;
      const signedAt =
        typeof signedRaw === "string" && signedRaw.trim()
          ? new Date(signedRaw)
          : new Date();
      const signedAtLabel = new Intl.DateTimeFormat("en-CA", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(Number.isNaN(signedAt.getTime()) ? new Date() : signedAt);
      agencySignature = {
        imageBytes: new Uint8Array(sigBuf),
        signerName: signerRaw || "Authorized representative",
        signedAtLabel,
      };
    }
  }

  const pdfBytes = await buildSalesProposalPdfBytes({
    proposalTitle: title,
    clientLine,
    investmentLine: investment,
    markdownBody: bodyMd,
    generatedAtLabel: dateStr,
    embeddedRasters: allRasters.length ? allRasters : undefined,
    brandAssets,
    placeTypes: placeSnapshot?.types ?? null,
    agencySignature,
  });

  const slug = slugifyPdfFilenameSegment(buyerName);
  const filename = `proposal-${slug}-${dateStr}.pdf`;

  return {
    ok: true,
    bytes: Buffer.from(pdfBytes),
    filename,
    title,
    buyerName,
    recipientEmail,
  };
}
