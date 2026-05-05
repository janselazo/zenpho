import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  parseGooglePlaceSnapshot,
  stripMarkdownForProposalPdf,
} from "@/lib/crm/proposal-enrichment-context";
import {
  collectProposalAiVisualRasters,
  collectProposalPdfRasters,
} from "@/lib/crm/proposal-pdf-rasters";
import {
  buildSalesProposalPdfBytes,
  slugifyPdfFilenameSegment,
} from "@/lib/crm/sales-proposal-pdf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

type Body = { proposalId?: unknown };

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

export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body." },
      { status: 400 }
    );
  }

  const proposalId =
    typeof body.proposalId === "string" ? body.proposalId.trim() : "";
  if (!proposalId) {
    return NextResponse.json({ error: "proposalId required" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "agency_admin" && profile?.role !== "agency_member") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: row, error } = await supabase
    .from("sales_proposal")
    .select(
      `
      id,
      title,
      proposal_body,
      total_price_estimate,
      client_id,
      google_place_snapshot,
      proposal_ai_visuals,
      client(name, company)
    `
    )
    .eq("id", proposalId)
    .maybeSingle();

  if (error || !row) {
    return NextResponse.json({ error: "Proposal not found" }, { status: 404 });
  }

  const bodyMd =
    typeof row.proposal_body === "string" ? row.proposal_body.trim() : "";
  if (!bodyMd) {
    return NextResponse.json(
      { error: "Proposal has no body to export yet." },
      { status: 400 }
    );
  }

  const clientJoin = row.client as
    | { name: string; company: string | null }
    | null
    | { name: string; company: string | null }[];

  const cj = Array.isArray(clientJoin) ? clientJoin[0] : clientJoin;
  const clientName =
    typeof cj?.name === "string" && cj.name.trim()
      ? cj.name.trim()
      : typeof cj?.company === "string" && cj.company.trim()
        ? cj.company.trim()
        : "Client";

  const company =
    typeof cj?.company === "string" && cj.company.trim()
      ? cj.company.trim()
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

  const clientLine = company
    ? `${clientName} (${company})`
    : clientName;

  const placeSnapshot = parseGooglePlaceSnapshot(row.google_place_snapshot);
  const rasterSlots = await collectProposalPdfRasters({
    googlePlacesApiKey: process.env.GOOGLE_PLACES_API_KEY,
    place: placeSnapshot,
    businessLabel: clientName,
  });

  const aiRasterRows = parseAiVisualRowsPdf(row.proposal_ai_visuals);
  const aiRasters =
    aiRasterRows.length > 0
      ? await collectProposalAiVisualRasters({ rows: aiRasterRows })
      : [];

  const allRasters = [...rasterSlots, ...aiRasters];

  const bodyForPdf = stripMarkdownForProposalPdf(bodyMd).trim();

  const pdfBytes = await buildSalesProposalPdfBytes({
    proposalTitle: title,
    clientLine,
    investmentLine: investment,
    markdownBody: bodyForPdf,
    generatedAtLabel: dateStr,
    embeddedRasters: allRasters.length ? allRasters : undefined,
  });

  const slug = slugifyPdfFilenameSegment(clientName);
  const filename = `proposal-${slug}-${dateStr}.pdf`;

  return new NextResponse(Buffer.from(pdfBytes), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
