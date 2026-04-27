import type { SupabaseClient } from "@supabase/supabase-js";
import type { StitchProspectDesignPayload } from "@/lib/crm/stitch-prospect-design-types";
import { insertProspectPreviewWithSlug } from "@/lib/crm/prospect-preview-insert";
import { captureProspectPreviewScreenshot } from "@/lib/crm/prospect-preview-screenshot";
import { prospectPreviewPageUrl } from "@/lib/crm/prospect-preview-public-url";
import {
  ensureProspectPreviewRequiredSections,
  repairWebAppDashboardNavigation,
  sanitizeProspectPreviewFullDocumentHtml,
  type ProspectPreviewSectionMeta,
} from "@/lib/crm/prospect-preview-sanitize";
import { primaryPlaceTypeLabel } from "@/lib/crm/places-search-ui";

const MAX_HTML_BYTES = 2_500_000;
const FETCH_MS = 60_000;

/** Download HTML from Stitch’s export URL (signed CDN / redirect chain). */
export async function fetchHtmlFromStitchExportUrl(htmlExportUrl: string): Promise<string | null> {
  const url = htmlExportUrl.trim();
  if (!url) return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_MS);
  try {
    const res = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: { Accept: "text/html,application/xhtml+xml,*/*" },
    });
    if (!res.ok) return null;
    const len = res.headers.get("content-length");
    if (len && Number.parseInt(len, 10) > MAX_HTML_BYTES) return null;
    const text = await res.text();
    if (text.length > MAX_HTML_BYTES) return null;
    return text;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function stitchPayloadToPreviewMeta(payload: StitchProspectDesignPayload): {
  businessName: string;
  businessAddress: string | null;
  placeGoogleId: string | null;
  primaryCategory: string | null;
  listingPhone: string | null;
  websiteUrl: string | null;
} {
  if (payload.kind === "place") {
    const p = payload.place;
    const cat = primaryPlaceTypeLabel(p.types);
    return {
      businessName: p.name.trim(),
      businessAddress: p.formattedAddress?.trim() || null,
      placeGoogleId: p.id,
      primaryCategory: cat || null,
      listingPhone:
        p.nationalPhoneNumber?.trim() ||
        p.internationalPhoneNumber?.trim() ||
        null,
      websiteUrl: p.websiteUri?.trim() || null,
    };
  }
  let host = "";
  try {
    host = new URL(
      /^https?:\/\//i.test(payload.url) ? payload.url : `https://${payload.url}`
    ).hostname.replace(/^www\./i, "");
  } catch {
    /* ignore */
  }
  const title = payload.pageTitle?.trim().slice(0, 200) || "";
  return {
    businessName: title || host || "Stitch preview",
    businessAddress: null,
    placeGoogleId: null,
    primaryCategory: null,
    listingPhone: null,
    websiteUrl: payload.url || null,
  };
}

function deriveCityFromAddress(address: string | null): string | null {
  if (!address) return null;
  const parts = address
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length === 0) return null;
  if (parts.length === 1) return parts[0];
  return parts[parts.length - 2] || parts[0];
}

export type StitchHostedPreview = {
  hostedPreviewId: string;
  hostedPreviewSlug: string;
  hostedPreviewUrl: string;
};

/**
 * Saves Stitch export HTML into `prospect_preview` so it is served at the same URLs as LLM previews
 * (e.g. https://preview.zenpho.com/{slug} when PREVIEW_PUBLIC_HOST is set).
 */
export async function persistStitchHtmlAsProspectPreview(params: {
  supabase: SupabaseClient;
  userId: string;
  payload: StitchProspectDesignPayload;
  htmlExportUrl: string;
}): Promise<StitchHostedPreview | null> {
  const raw = await fetchHtmlFromStitchExportUrl(params.htmlExportUrl);
  if (!raw?.trim()) {
    console.warn("[stitch host preview] empty or failed HTML fetch");
    return null;
  }

  const meta = stitchPayloadToPreviewMeta(params.payload);

  const sectionMeta: ProspectPreviewSectionMeta = {
    businessName: meta.businessName,
    businessAddress: meta.businessAddress,
    city: deriveCityFromAddress(meta.businessAddress),
    primaryCategory: meta.primaryCategory,
    listingPhone: meta.listingPhone,
    websiteUrl: meta.websiteUrl,
  };

  let safe: string;
  try {
    // Web-app previews need the dashboard sidebar repaired before the
    // marketing-section safety net runs, so its nav rewrites operate on the
    // canonical hash IDs and do not synthesize marketing stubs into a
    // dashboard shell.
    const repaired =
      params.payload.target === "webapp"
        ? repairWebAppDashboardNavigation(raw, sectionMeta)
        : raw;
    const completed = ensureProspectPreviewRequiredSections(repaired, sectionMeta);
    safe = sanitizeProspectPreviewFullDocumentHtml(completed);
  } catch (e) {
    console.warn("[stitch host preview] sanitize failed", e);
    return null;
  }

  const inserted = await insertProspectPreviewWithSlug({
    supabase: params.supabase,
    userId: params.userId,
    html: safe,
    placeGoogleId: meta.placeGoogleId,
    businessName: meta.businessName,
    businessAddress: meta.businessAddress,
    primaryCategory: meta.primaryCategory,
    previewDeviceType: params.payload.target === "mobile" ? "MOBILE" : "DESKTOP",
  });

  if (!inserted.ok) {
    console.warn("[stitch host preview] insert failed", inserted.error);
    return null;
  }

  const { id, slug: previewSlug } = inserted;
  const hostedPreviewUrl = prospectPreviewPageUrl(id, previewSlug);

  void captureProspectPreviewScreenshot(id).catch(() => {
    /* logged in screenshot helper */
  });

  return {
    hostedPreviewId: id,
    hostedPreviewSlug: previewSlug,
    hostedPreviewUrl,
  };
}
