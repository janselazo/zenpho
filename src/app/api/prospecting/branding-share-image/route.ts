import { NextResponse } from "next/server";
import { requireAgencyStaff } from "@/app/(crm)/actions/prospect-preview-agency";
import type { MarketIntelReport } from "@/lib/crm/prospect-intel-report";
import type { PlacesSearchPlace } from "@/lib/crm/places-types";
import {
  generateBrandingSpec,
  type BrandingSpec,
  type BrandingColor,
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
import { generateBrandingImageSubset } from "@/lib/crm/prospect-branding-image-gen";

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

function hexToRgb(hex: string): [number, number, number] | null {
  const m = hex.trim().match(/^#?([0-9a-fA-F]{6})$/);
  if (!m) return null;
  const n = Number.parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function normalizeHex(hex: string): string | null {
  const rgb = hexToRgb(hex);
  if (!rgb) return null;
  return `#${((1 << 24) | (rgb[0] << 16) | (rgb[1] << 8) | rgb[2])
    .toString(16)
    .slice(1)
    .toUpperCase()}`;
}

function colorDistance(a: string, b: string): number {
  const ar = hexToRgb(a);
  const br = hexToRgb(b);
  if (!ar || !br) return 999;
  return Math.sqrt(
    (ar[0] - br[0]) ** 2 + (ar[1] - br[1]) ** 2 + (ar[2] - br[2]) ** 2,
  );
}

const GENERIC_WORDPRESS_COLORS = [
  "#CF2E2E",
  "#CC1818",
  "#FCB900",
  "#F0BB49",
  "#00D084",
  "#4AB866",
  "#0693E3",
  "#3858E9",
  "#9B51E0",
];

function cleanPalette(input: readonly string[]): string[] {
  const out: string[] = [];
  for (const raw of input) {
    const hex = normalizeHex(raw);
    if (!hex) continue;
    if (GENERIC_WORDPRESS_COLORS.some((generic) => colorDistance(hex, generic) < 18)) {
      continue;
    }
    if (out.every((existing) => colorDistance(existing, hex) > 28)) out.push(hex);
  }
  return out.slice(0, 5);
}

function applySharePalette(spec: BrandingSpec, rawPalette: readonly string[]): BrandingSpec {
  const palette = cleanPalette(rawPalette);
  const primary = palette[0] || "#0DA7AD";
  const accent = palette[1] || "#2F64A7";
  const soft = palette[2] || "#EAF7F8";
  const deep = palette[3] || "#123D68";
  const color = (name: string, hex: string): BrandingColor => ({ name, hex });
  return {
    ...spec,
    primaryColors: [
      color("Brand primary", primary),
      color("Brand accent", accent),
    ],
    secondaryColors: [
      color("Soft tint", soft),
      color("Deep brand", deep),
    ],
  };
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

    const shareSpec = applySharePalette(spec, realAssets.palette);

    const merchImagesPromise = generateBrandingImageSubset(shareSpec, ["merch"]);
    const campaignImages = funnel
      ? await generateAdsFunnelImageSubset(shareSpec, funnel, vertical, [
          "landingHero",
          "adFbFeed",
          "adIgStory",
          "adGoogleDisplay",
        ])
      : null;
    const merchImages = await merchImagesPromise;
    if (Object.keys(merchImages.errors).length > 0) {
      console.warn(
        "[branding-share-image] merchandising image warnings:",
        merchImages.errors,
      );
    }
    if (campaignImages && Object.keys(campaignImages.errors).length > 0) {
      console.warn(
        "[branding-share-image] campaign image warnings:",
        campaignImages.errors,
      );
    }

    const rendered = renderBrandingShareImage({
      spec: shareSpec,
      funnel,
      realPalette: realAssets.palette,
      logoDataUrl: brandLogoDataUrl(realAssets),
      merchImage: pngDataUrl(merchImages.merch),
      campaignImages: campaignImages
        ? {
            landingHero: pngDataUrl(campaignImages.landingHero),
            metaFeed: pngDataUrl(campaignImages.adFbFeed),
            instagramStory: pngDataUrl(campaignImages.adIgStory),
            googleDisplay: pngDataUrl(campaignImages.adGoogleDisplay),
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
