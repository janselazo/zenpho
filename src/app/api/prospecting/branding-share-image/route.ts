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
import { generateAdsFunnelImageSubset } from "@/lib/crm/prospect-ads-image-gen";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

type Body = {
  businessName?: unknown;
  place?: PlacesSearchPlace | null;
  report?: MarketIntelReport | null;
  leadId?: unknown;
};

function brandLogoDataUrl(input: {
  logoPng: Buffer | null;
  logoSvg: string | null;
}): string | null {
  if (input.logoPng) {
    const isJpeg =
      input.logoPng.length >= 3 &&
      input.logoPng[0] === 0xff &&
      input.logoPng[1] === 0xd8 &&
      input.logoPng[2] === 0xff;
    const mime = isJpeg ? "image/jpeg" : "image/png";
    return `data:${mime};base64,${input.logoPng.toString("base64")}`;
  }
  if (input.logoSvg?.trim()) {
    return `data:image/svg+xml;base64,${Buffer.from(input.logoSvg).toString("base64")}`;
  }
  return null;
}

function pngDataUrl(buf: Buffer | null): string | null {
  return buf ? `data:image/png;base64,${buf.toString("base64")}` : null;
}

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

    const campaignImages = funnel
      ? await generateAdsFunnelImageSubset(spec, funnel, vertical, [
          "landingHero",
          "adFbFeed",
          "adIgStory",
          "adGoogleDisplay",
          "adHeroBanner",
        ])
      : null;
    if (campaignImages && Object.keys(campaignImages.errors).length > 0) {
      console.warn(
        "[branding-share-image] campaign image warnings:",
        campaignImages.errors,
      );
    }

    const rendered = renderBrandingShareImage({
      spec,
      funnel,
      realPalette: realAssets.palette,
      logoDataUrl: brandLogoDataUrl(realAssets),
      campaignImages: campaignImages
        ? {
            landingHero: pngDataUrl(campaignImages.landingHero),
            metaFeed: pngDataUrl(campaignImages.adFbFeed),
            instagramStory: pngDataUrl(campaignImages.adIgStory),
            googleDisplay: pngDataUrl(campaignImages.adGoogleDisplay),
            heroBanner: pngDataUrl(campaignImages.adHeroBanner),
          }
        : undefined,
    });
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
