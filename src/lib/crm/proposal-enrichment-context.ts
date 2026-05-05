import type { ResolvedBrandAssets } from "@/lib/crm/prospect-branding-asset-resolve";
import type { PlacesSearchPlace } from "@/lib/crm/places-types";

const GENERIC_GOOGLE_TYPES = new Set(["establishment", "point_of_interest"]);

export function originFromRequest(req: Request): string {
  const env =
    process.env.NEXT_PUBLIC_APP_ORIGIN?.trim() ||
    process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (env) return env.replace(/\/$/, "");
  const vz = process.env.VERCEL_URL?.trim();
  if (vz) {
    const withProto = vz.startsWith("http") ? vz : `https://${vz}`;
    return withProto.replace(/\/$/, "");
  }
  try {
    return new URL(req.url).origin;
  } catch {
    return "";
  }
}

/** Parse JSON column into a safe place snapshot. */
export function parseGooglePlaceSnapshot(
  raw: unknown
): PlacesSearchPlace | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const id = typeof o.id === "string" ? o.id.trim() : "";
  const name = typeof o.name === "string" ? o.name.trim() : "";
  if (!id || !name) return null;

  let photoRefs: string[] | undefined;
  if (Array.isArray(o.photoRefs)) {
    photoRefs = o.photoRefs
      .filter((x): x is string => typeof x === "string")
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 6);
    if (!photoRefs.length) photoRefs = undefined;
  }

  return {
    id,
    name,
    formattedAddress:
      typeof o.formattedAddress === "string" ? o.formattedAddress : null,
    rating:
      typeof o.rating === "number" && Number.isFinite(o.rating)
        ? o.rating
        : null,
    userRatingCount:
      typeof o.userRatingCount === "number" &&
      Number.isFinite(o.userRatingCount)
        ? Math.round(o.userRatingCount)
        : null,
    websiteUri:
      typeof o.websiteUri === "string"
        ? o.websiteUri.trim() || null
        : null,
    types: Array.isArray(o.types)
      ? o.types.filter((t): t is string => typeof t === "string")
      : [],
    nationalPhoneNumber:
      typeof o.nationalPhoneNumber === "string"
        ? o.nationalPhoneNumber.trim() || null
        : null,
    internationalPhoneNumber:
      typeof o.internationalPhoneNumber === "string"
        ? o.internationalPhoneNumber.trim() || null
        : null,
    googleMapsUri:
      typeof o.googleMapsUri === "string"
        ? o.googleMapsUri.trim() || null
        : null,
    businessStatus:
      typeof o.businessStatus === "string"
        ? o.businessStatus.trim() || null
        : null,
    ...(photoRefs?.length ? { photoRefs } : {}),
  };
}

function readableGoogleCategories(types: string[]): string {
  const raw = Array.isArray(types) ? types : [];
  const seen = raw
    .map((t) => t.trim())
    .filter((t) => t && !GENERIC_GOOGLE_TYPES.has(t))
    .slice(0, 14);

  const labels = [...new Set(seen)].slice(0, 10).map((t) =>
    t.replace(/_/g, " ")
  );

  return labels.length ? labels.join(", ") : "general local business";
}

export function summarizeGoogleListingForPrompt(
  place: PlacesSearchPlace
): string {
  const lines = [
    `Listing name (Google): ${place.name}`,
    place.formattedAddress
      ? `Address: ${place.formattedAddress}`
      : null,
    `Industry / Google categories (raw types): ${readableGoogleCategories(place.types)}`,
    place.websiteUri ? `Official website URL: ${place.websiteUri}` : null,
    place.rating != null
      ? `Google rating snapshot: ${place.rating} (${place.userRatingCount ?? "?"} ratings — signal only)`
      : null,
    place.googleMapsUri
      ? `Maps link (verification only — do NOT embed in prose as a clickable offer): ${place.googleMapsUri}`
      : null,
  ].filter(Boolean);
  return lines.join("\n");
}

export function summarizeBrandAssetsForPrompt(
  assets: ResolvedBrandAssets | null | undefined,
  listingWebsite: string | null
): string {
  if ((!assets || assets.palette.length === 0) && !listingWebsite) {
    return "No scraped brand palette/logo was available.";
  }

  const parts: string[] = [];
  if (listingWebsite) {
    parts.push(`Website used for scrape: ${listingWebsite}`);
  }
  if (!assets?.palette.length) {
    parts.push(
      "No confident color palette extracted from homepage (fonts/markup unavailable or blocked)."
    );
    return parts.join("\n");
  }

  const brand = assets;

  parts.push(
    [
      `Extracted homepage palette sample (hex, best-effort): ${brand.palette.slice(0, 5).join(", ")}`,
      brand.primary ? `Dominant hue candidate: ${brand.primary}` : null,
      brand.accent ? `Accent hue candidate: ${brand.accent}` : null,
      brand.logoSourceUrl
        ? `Logo asset URL fetched for reference: ${brand.logoSourceUrl}`
        : null,
    ]
      .filter(Boolean)
      .join("\n")
  );
  parts.push(
    "Use palette references for tone/wording cohesion (industry vibes), not legally binding trademark claims."
  );
  return parts.filter(Boolean).join("\n");
}

export function buildBusinessVisualMarkdownBlock(
  origin: string,
  photoRefs: string[] | undefined
): string | null {
  const base = origin.replace(/\/$/, "");
  if (!base || !photoRefs?.length) return null;
  const urls = photoRefs.slice(0, 3).map(
    (ref) =>
      `${base}/api/crm/google-place-photo?photo=${encodeURIComponent(ref)}`
  );
  const lines = urls.map(
    (u, idx) =>
      `![Google Business photo (${idx + 1} of ${urls.length})](${u})\n`
  );
  return (
    `\n## Business visuals\n` +
    `Public listing imagery from Google (photo references refresh with your agency session).\n\n` +
    lines.join("") +
    `\n`
  );
}

const CRM_IMG_LINE =
  /^!\[[^\]]*\]\([^)]*(?:\/api\/crm\/google-place-photo\b)[^)]*\)\s*$/gm;

const PROPOSAL_AI_IMG_LINE =
  /^!\[[^\]]*\]\([^)]*proposal-ai-visuals[^)]*\)\s*$/gm;

export function stripMarkdownCrmListingImages(markdownBody: string): string {
  return markdownBody.replace(CRM_IMG_LINE, "").replace(/\n{3,}/g, "\n\n");
}

export function stripMarkdownProposalAiImages(markdownBody: string): string {
  return markdownBody.replace(PROPOSAL_AI_IMG_LINE, "").replace(/\n{3,}/g, "\n\n");
}

/** Strip markdown image rows stitched for web preview — PDF renders rasters separately. */
export function stripMarkdownForProposalPdf(markdownBody: string): string {
  return stripMarkdownProposalAiImages(
    stripMarkdownCrmListingImages(markdownBody),
  );
}

/** AI-generated visuals stored under `proposal-ai-visuals/` (public CDN URLs). */
export function buildProposalAiVisualMarkdownSection(
  items: { caption: string; publicUrl: string }[],
): string | null {
  if (!items.length) return null;
  const lines = items.map(
    (it) =>
      `![${it.caption.replace(/[\[\]]/g, "")}](${it.publicUrl})\n`,
  );
  return `\n## Concept illustrations\nAI-generated visuals for narrative texture (conceptual — not factual photography).\n\n${lines.join("")}\n`;
}

export function spliceBeforeExecutiveSummary(
  markdownBody: string,
  insertMd: string | null | undefined
): string {
  if (!insertMd?.trim()) return markdownBody;
  const needle = "\n## Executive Summary\n";
  const i = markdownBody.indexOf(needle);
  const block = `\n${insertMd.trim()}\n`;
  if (i >= 0) {
    return markdownBody.slice(0, i) + block + markdownBody.slice(i);
  }
  return `${markdownBody.trim()}\n\n${block}`;
}
