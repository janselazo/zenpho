import { generateProspectPreviewDocument } from "@/lib/crm/prospect-preview-generate";
import { captureProspectPreviewScreenshot } from "@/lib/crm/prospect-preview-screenshot";
import {
  prospectPreviewMicrolinkUrl,
  prospectPreviewPageUrl,
} from "@/lib/crm/prospect-preview-public-url";
import { prospectPreviewSlugFromBusiness } from "@/lib/crm/prospect-preview-slug";
import type { PlacesSearchPlace } from "@/lib/crm/places-types";
import { primaryPlaceTypeLabel } from "@/lib/crm/places-search-ui";
import { requireAgencyStaff } from "@/app/(crm)/actions/prospect-preview-agency";

export type GenerateProspectPreviewPayload =
  | {
      kind: "place";
      place: PlacesSearchPlace;
      colorVibe?: string;
      servicesLine?: string;
    }
  | {
      kind: "url";
      url: string;
      pageTitle: string | null;
      colorVibe?: string;
      servicesLine?: string;
    };

export type GenerateProspectPreviewResult =
  | {
      ok: true;
      previewId: string;
      previewUrl: string;
      /** Primary app origin + `/preview/{uuid}` — CRM iframe + Microlink (stable vs pretty share URL). */
      previewFrameUrl: string;
      /** URL path segment when using pretty links (from Google business name + id). */
      previewSlug: string;
      businessName: string;
      screenshotStatus: string;
      screenshotUrl: string | null;
    }
  | { ok: false; error: string };

function safeTrim(s: unknown): string {
  return typeof s === "string" ? s.trim() : "";
}

function humanizePlaceTypeToken(t: string): string {
  return t
    .split("_")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function buildPreviewServicesLine(
  types: string[],
  primaryCategory: string | null,
  urlPageTitle: string | null
): string {
  const skip = new Set(["point_of_interest", "establishment", "geocode"]);
  const picked = types
    .filter((t) => !skip.has(t))
    .slice(0, 6)
    .map(humanizePlaceTypeToken);
  const prim = primaryCategory?.trim() || "";
  if (prim && !picked.some((p) => p.toLowerCase() === prim.toLowerCase())) {
    const line = [prim, ...picked].filter(Boolean).join(" · ");
    return line || prim;
  }
  if (picked.length) return picked.join(" · ");
  if (prim) return prim;
  if (urlPageTitle?.trim()) {
    return `Web presence: ${urlPageTitle.trim().slice(0, 140)}`;
  }
  return "Local / web services";
}

function extractCityFromAddress(address: string | null | undefined): string | null {
  if (!address?.trim()) return null;
  const parts = address
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length >= 2) {
    return parts[parts.length - 2] ?? null;
  }
  return null;
}

function defaultPreviewColorVibe(): string {
  return (
    process.env.PROSPECT_PREVIEW_COLOR_VIBE?.trim() ||
    "Fresh, professional, trustworthy — light neutral background, one confident accent suited to a local service business, strong typography hierarchy."
  );
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

export async function runGenerateProspectPreview(
  payload: GenerateProspectPreviewPayload
): Promise<GenerateProspectPreviewResult> {
  try {
    return await runGenerateProspectPreviewCore(payload);
  } catch (e) {
    console.error("[prospectPreview] generate: unexpected throw", e);
    const msg =
      e instanceof Error ? e.message : "Preview generation failed unexpectedly.";
    return { ok: false as const, error: msg };
  }
}

async function runGenerateProspectPreviewCore(
  payload: GenerateProspectPreviewPayload
): Promise<GenerateProspectPreviewResult> {
  const auth = await requireAgencyStaff();
  if (auth.error || !auth.user || !auth.supabase) {
    console.warn("[prospectPreview] generate: auth failed", auth.error ?? "missing user/supabase");
    return { ok: false as const, error: auth.error ?? "Unauthorized" };
  }
  console.log("[prospectPreview] generate: auth ok", { userId: auth.user.id, kind: payload.kind });

  if (payload.kind === "url" && !safeTrim(payload.url)) {
    return { ok: false as const, error: "Missing website URL for preview." };
  }

  const colorVibe = safeTrim(payload.colorVibe) || defaultPreviewColorVibe();

  const input =
    payload.kind === "place"
      ? (() => {
          const p = normalizePlaceForPreview(payload.place);
          const primaryCategory = primaryPlaceTypeLabel(p.types);
          const servicesLine =
            safeTrim(payload.servicesLine) ||
            buildPreviewServicesLine(p.types, primaryCategory, null);
          return {
            businessName: p.name.trim() || "Business",
            businessAddress: p.formattedAddress,
            city: extractCityFromAddress(p.formattedAddress),
            services: servicesLine,
            colorVibe,
            primaryCategory,
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
          const servicesLine =
            safeTrim(payload.servicesLine) ||
            buildPreviewServicesLine([], null, title || host);
          return {
            businessName: title || host || "Website preview",
            businessAddress: null as string | null,
            city: null as string | null,
            services: servicesLine,
            colorVibe,
            primaryCategory: null as string | null,
            websiteUrl: url,
            listingPhone: null as string | null,
            placeGoogleId: null as string | null,
          };
        })();

  console.log("[prospectPreview] generate: calling Claude", { businessName: input.businessName });
  const gen = await generateProspectPreviewDocument({
    businessName: input.businessName,
    businessAddress: input.businessAddress,
    city: input.city,
    services: input.services,
    colorVibe: input.colorVibe,
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

  const previewSlug = prospectPreviewSlugFromBusiness(
    (row.business_name as string) || input.businessName,
    id,
  );
  const { error: slugErr } = await auth.supabase
    .from("prospect_preview")
    .update({ slug: previewSlug })
    .eq("id", id);
  if (slugErr) {
    console.warn("[prospectPreview] generate: slug update failed", slugErr.message);
  }

  const previewUrl = prospectPreviewPageUrl(id, previewSlug);
  const previewFrameUrl = prospectPreviewMicrolinkUrl(id);
  console.log("[prospectPreview] generate: success", { previewId: id, previewSlug });
  void captureProspectPreviewScreenshot(id).catch(() => {
    /* logged in screenshot helper path */
  });

  return {
    ok: true as const,
    previewId: id,
    previewUrl,
    previewFrameUrl,
    previewSlug,
    businessName: (row.business_name as string) || input.businessName,
    screenshotStatus: row.screenshot_status as string,
    screenshotUrl: (row.screenshot_url as string | null) ?? null,
  };
}

