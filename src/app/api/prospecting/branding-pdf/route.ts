import { NextResponse } from "next/server";
import type { MarketIntelReport } from "@/lib/crm/prospect-intel-report";
import type { PlacesSearchPlace } from "@/lib/crm/places-types";
import { generateProspectBrandingPdfAction } from "@/app/(crm)/actions/prospect-branding-pdf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

type Body = {
  businessName?: unknown;
  place?: PlacesSearchPlace | null;
  report?: MarketIntelReport | null;
  leadId?: unknown;
};

export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON request body." },
      { status: 400 },
    );
  }

  const businessName =
    typeof body.businessName === "string" ? body.businessName.trim() : "";
  if (!businessName) {
    return NextResponse.json(
      { ok: false, error: "Business name is required." },
      { status: 400 },
    );
  }

  try {
    const result = await generateProspectBrandingPdfAction({
      businessName,
      place: body.place ?? null,
      report: body.report ?? null,
      leadId: typeof body.leadId === "string" ? body.leadId.trim() || null : null,
    });

    return NextResponse.json(result, { status: result.ok ? 200 : 500 });
  } catch (e) {
    const msg =
      e instanceof Error
        ? e.message
        : "Brand Kit + Sales Funnel PDF request failed.";
    console.error("[branding-pdf-api] unexpected failure", e);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
