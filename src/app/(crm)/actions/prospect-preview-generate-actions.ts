"use server";

import { generateProspectPreviewDocument } from "@/lib/crm/prospect-preview-generate";
import { captureProspectPreviewScreenshot } from "@/lib/crm/prospect-preview-screenshot";
import { prospectPreviewPageUrl } from "@/lib/crm/prospect-preview-public-url";
import type { PlacesSearchPlace } from "@/lib/crm/places-types";
import { primaryPlaceTypeLabel } from "@/lib/crm/places-search-ui";
import { requireAgencyStaff } from "@/app/(crm)/actions/prospect-preview-agency";

export type GenerateProspectPreviewPayload =
  | { kind: "place"; place: PlacesSearchPlace }
  | { kind: "url"; url: string; pageTitle: string | null };

function safeTrim(s: unknown): string {
  return typeof s === "string" ? s.trim() : "";
}

function normalizePlaceForPreview(place: PlacesSearchPlace) {
  const name = safeTrim(place.name) || "Business";
  const types = Array.isArray(place.types)
    ? place.types.filter((t): t is string => typeof t === "string")
    : [];
  return {
    id: safeTrim(place.id) || "unknown",
    name,
    formattedAddress:
      place.formattedAddress == null
        ? null
        : typeof place.formattedAddress === "string"
          ? place.formattedAddress.trim() || null
          : null,
    websiteUri:
      place.websiteUri == null
        ? null
        : typeof place.websiteUri === "string"
          ? place.websiteUri.trim() || null
          : null,
    types,
    nationalPhoneNumber:
      place.nationalPhoneNumber == null
        ? null
        : typeof place.nationalPhoneNumber === "string"
          ? place.nationalPhoneNumber.trim() || null
          : null,
    internationalPhoneNumber:
      place.internationalPhoneNumber == null
        ? null
        : typeof place.internationalPhoneNumber === "string"
          ? place.internationalPhoneNumber.trim() || null
          : null,
    googleMapsUri:
      place.googleMapsUri == null
        ? null
        : typeof place.googleMapsUri === "string"
          ? place.googleMapsUri.trim() || null
          : null,
    businessStatus:
      place.businessStatus == null
        ? null
        : typeof place.businessStatus === "string"
          ? place.businessStatus.trim() || null
          : null,
    rating: typeof place.rating === "number" ? place.rating : null,
    userRatingCount:
      typeof place.userRatingCount === "number" ? place.userRatingCount : null,
  };
}

export async function generateProspectPreviewAction(
  payload: GenerateProspectPreviewPayload,
): Promise<
  | { ok: true; previewId: string; previewUrl: string; businessName: string; screenshotStatus: string; screenshotUrl: string | null }
  | { ok: false; error: string }
> {
  try {
    return await runGenerateProspectPreview(payload);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Preview generation failed unexpectedly.";
    console.error("[generateProspectPreviewAction]", e);
    return { ok: false as const, error: msg };
  }
}

async function runGenerateProspectPreview(
  payload: GenerateProspectPreviewPayload,
): Promise<
  | { ok: true; previewId: string; previewUrl: string; businessName: string; screenshotStatus: string; screenshotUrl: string | null }
  | { ok: false; error: string }
> {
  const auth = await requireAgencyStaff();
  if (auth.error || !auth.user || !auth.supabase) {
    console.warn("[prospectPreview] generate: auth failed", auth.error ?? "missing user/supabase");
    return { ok: false as const, error: auth.error ?? "Unauthorized" };
  }
  console.log("[prospectPreview] generate: auth ok", { userId: auth.user.id, kind: payload.kind });

  if (payload.kind === "url" && !safeTrim(payload.url)) {
    return { ok: false as const, error: "Missing website URL for preview." };
  }

  const input =
    payload.kind === "place"
      ? (() => {
          const p = normalizePlaceForPreview(payload.place);
          return {
            businessName: p.name.trim() || "Business",
            businessAddress: p.formattedAddress,
            primaryCategory: primaryPlaceTypeLabel(p.types),
            websiteUrl: p.websiteUri,
            listingPhone: p.nationalPhoneNumber || p.internationalPhoneNumber || null,
            placeGoogleId: p.id,
          };
        })()
      : (() => {
          const url = safeTrim(payload.url);
          let host = "";
          try {
            host = new URL(/^https?:\/\//i.test(url) ? url : `https://${url}`)
              .hostname.replace(/^www\./i, "");
          } catch {
            host = "";
          }
          const title =
            typeof payload.pageTitle === "string"
              ? payload.pageTitle.trim().slice(0, 200)
              : "";
          return {
            businessName: title || host || "Website preview",
            businessAddress: null as string | null,
            primaryCategory: null as string | null,
            websiteUrl: url,
            listingPhone: null as string | null,
            placeGoogleId: null as string | null,
          };
        })();

  console.log("[prospectPreview] generate: calling LLM", { businessName: input.businessName });
  const gen = await generateProspectPreviewDocument({
    businessName: input.businessName,
    businessAddress: input.businessAddress,
    primaryCategory: input.primaryCategory,
    websiteUrl: input.websiteUrl,
    listingPhone: input.listingPhone,
  });

  if (!gen.ok) {
    console.warn("[prospectPreview] generate: LLM failed", gen.error);
    return { ok: false as const, error: gen.error };
  }
  console.log("[prospectPreview] generate: LLM ok, inserting row");

  const { data: row, error } = await auth.supabase
    .from("prospect_preview")
    .insert({
      user_id: auth.user.id,
      html: gen.html,
      place_google_id: input.placeGoogleId,
      business_name: input.businessName,
      business_address: input.businessAddress,
      primary_category: input.primaryCategory,
      screenshot_status: "pending",
    })
    .select("id, business_name, screenshot_status, screenshot_url")
    .single();

  if (error) {
    console.error("[prospectPreview] generate: insert failed", error.code, error.message);
    if (error.message.includes("does not exist") || error.code === "42P01") {
      return {
        ok: false as const,
        error:
          "Preview storage missing. Apply migration supabase/migrations/20260506120000_prospect_preview_lead_category.sql.",
      };
    }
    return { ok: false as const, error: error.message };
  }

  const id = row?.id as string | undefined;
  if (!id) {
    console.error("[prospectPreview] generate: insert returned no id");
    return {
      ok: false as const,
      error: "Could not save preview (database returned no id).",
    };
  }
  console.log("[prospectPreview] generate: success", { previewId: id });
  void captureProspectPreviewScreenshot(id).catch(() => {
    /* logged in screenshot helper path */
  });

  return {
    ok: true as const,
    previewId: id,
    previewUrl: prospectPreviewPageUrl(id),
    businessName: (row.business_name as string) || input.businessName,
    screenshotStatus: row.screenshot_status as string,
    screenshotUrl: (row.screenshot_url as string | null) ?? null,
  };
}

export async function getProspectPreviewStatusAction(previewId: string) {
  const auth = await requireAgencyStaff();
  if (auth.error || !auth.supabase) {
    return { ok: false as const, error: auth.error ?? "Unauthorized" };
  }
  const id = previewId.trim();
  if (!id) return { ok: false as const, error: "Missing preview id." };

  const { data, error } = await auth.supabase
    .from("prospect_preview")
    .select("screenshot_url, screenshot_status, business_name")
    .eq("id", id)
    .maybeSingle();

  if (error) return { ok: false as const, error: error.message };
  if (!data) return { ok: false as const, error: "Preview not found." };

  return {
    ok: true as const,
    screenshotUrl: data.screenshot_url as string | null,
    screenshotStatus: data.screenshot_status as string,
    businessName: data.business_name as string,
    previewUrl: prospectPreviewPageUrl(id),
  };
}
