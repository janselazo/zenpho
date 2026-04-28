import { NextResponse } from "next/server";
import { requireAgencyStaff } from "@/app/(crm)/actions/prospect-preview-agency";
import type { MarketIntelReport } from "@/lib/crm/prospect-intel-report";
import type { PlacesSearchPlace } from "@/lib/crm/places-types";
import {
  generateBrandingSpec,
  type BrandingSpec,
  type ExtractedBrandPalette,
} from "@/lib/crm/prospect-branding-spec-llm";
import { generateAdsFunnelSpec } from "@/lib/crm/prospect-ads-funnel-spec-llm";
import { resolveProspectBrandAssets } from "@/lib/crm/prospect-branding-asset-resolve";
import {
  classifyProspectVertical,
  verticalLabel,
  type ProspectVertical,
} from "@/lib/crm/prospect-vertical-classify";
import { renderBrandingShareImage } from "@/lib/crm/branding-share-image";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

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

  const auth = await requireAgencyStaff();
  if (auth.error) {
    return NextResponse.json(
      { ok: false, error: auth.error },
      { status: auth.error === "Unauthorized" ? 401 : 403 },
    );
  }

  const t0 = Date.now();
  try {
    const effectiveWebsiteUrl =
      body.place?.websiteUri?.trim() ||
      body.report?.customWebsites?.[0]?.trim() ||
      null;
    const realAssets = await resolveProspectBrandAssets({
      websiteUrl: effectiveWebsiteUrl,
    });
    const extractedPalette: ExtractedBrandPalette | null =
      realAssets.primary
        ? {
            primary: realAssets.primary,
            accent: realAssets.accent,
            palette: realAssets.palette,
          }
        : null;
    const vertical: ProspectVertical = classifyProspectVertical({
      place: body.place ?? null,
      signals: null,
    });

    const specResult = await generateBrandingSpec({
      businessName,
      place: body.place ?? null,
      report: body.report ?? null,
      extractedPalette,
      vertical,
    });
    if (!specResult.ok) {
      return NextResponse.json(
        { ok: false, error: `Brand spec generation failed: ${specResult.error}` },
        { status: 500 },
      );
    }

    const spec: BrandingSpec = {
      ...specResult.data,
      brandName: specResult.data.brandName || businessName,
    };

    const funnelSpecResult = await generateAdsFunnelSpec({
      spec,
      vertical,
      place: body.place ?? null,
      report: body.report ?? null,
    });
    const funnel = funnelSpecResult.ok ? funnelSpecResult.data : null;
    if (!funnelSpecResult.ok) {
      console.warn(
        `[branding-share-image] funnel spec failed: ${funnelSpecResult.error}`,
      );
    }

    const rendered = renderBrandingShareImage({ spec, funnel });
    console.info(
      `[branding-share-image] done business="${businessName}" vertical="${verticalLabel(
        vertical,
      )}" (${Date.now() - t0}ms)`,
    );

    return NextResponse.json({
      ok: true,
      ...rendered,
    });
  } catch (e) {
    const msg =
      e instanceof Error
        ? e.message
        : "Brand kit share image request failed.";
    console.error("[branding-share-image] unexpected failure", e);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
