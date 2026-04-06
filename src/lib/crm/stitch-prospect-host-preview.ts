import type { SupabaseClient } from "@supabase/supabase-js";
import type { StitchProspectDesignPayload } from "@/lib/crm/stitch-prospect-design-types";
import { captureProspectPreviewScreenshot } from "@/lib/crm/prospect-preview-screenshot";
import { prospectPreviewPageUrl } from "@/lib/crm/prospect-preview-public-url";
import { prospectPreviewSlugFromBusiness } from "@/lib/crm/prospect-preview-slug";
import { sanitizeProspectPreviewFullDocumentHtml } from "@/lib/crm/prospect-preview-sanitize";
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
} {
  if (payload.kind === "place") {
    const p = payload.place;
    const cat = primaryPlaceTypeLabel(p.types);
    return {
      businessName: p.name.trim(),
      businessAddress: p.formattedAddress?.trim() || null,
      placeGoogleId: p.id,
      primaryCategory: cat || null,
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
  };
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

  let safe: string;
  try {
    safe = sanitizeProspectPreviewFullDocumentHtml(raw);
  } catch (e) {
    console.warn("[stitch host preview] sanitize failed", e);
    return null;
  }

  const meta = stitchPayloadToPreviewMeta(params.payload);

  const { data: row, error } = await params.supabase
    .from("prospect_preview")
    .insert({
      user_id: params.userId,
      html: safe,
      place_google_id: meta.placeGoogleId,
      business_name: meta.businessName,
      business_address: meta.businessAddress,
      primary_category: meta.primaryCategory,
      screenshot_status: "pending",
    })
    .select("id, business_name")
    .single();

  if (error || !row?.id) {
    console.warn("[stitch host preview] insert failed", error?.message);
    return null;
  }

  const id = row.id as string;
  const businessName = (row.business_name as string)?.trim() || meta.businessName;
  const previewSlug = prospectPreviewSlugFromBusiness(businessName, id);

  const { error: slugErr } = await params.supabase
    .from("prospect_preview")
    .update({ slug: previewSlug })
    .eq("id", id);
  if (slugErr) {
    console.warn("[stitch host preview] slug update failed", slugErr.message);
  }

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
