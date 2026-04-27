import { randomUUID } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { prospectPreviewSlugFromBusiness } from "@/lib/crm/prospect-preview-slug";

const MAX_SLUG_COLLISION_RETRIES = 8;

export type InsertProspectPreviewResult =
  | { ok: true; id: string; slug: string }
  | { ok: false; error: string; code?: string };

/**
 * Inserts a prospect_preview row with `id` and `slug` set in one request so public
 * URLs (e.g. preview.zenpho.com/{slug}) always resolve. A separate slug UPDATE can
 * fail silently while the API still returned a pretty link — that produced 404s.
 */
export async function insertProspectPreviewWithSlug(params: {
  supabase: SupabaseClient;
  userId: string;
  html: string;
  placeGoogleId: string | null;
  businessName: string;
  businessAddress: string | null;
  primaryCategory: string | null;
  /** MOBILE: public preview URL uses a phone-width iframe shell. */
  previewDeviceType?: "MOBILE" | "DESKTOP" | null;
  /** Stitch / UX target for this row — website vs web app vs mobile. */
  previewTarget?: "website" | "webapp" | "mobile" | null;
}): Promise<InsertProspectPreviewResult> {
  const nameForSlug = params.businessName.trim() || "preview";

  for (let attempt = 0; attempt < MAX_SLUG_COLLISION_RETRIES; attempt++) {
    const id = randomUUID();
    const slug = prospectPreviewSlugFromBusiness(nameForSlug, id);

    const { data, error } = await params.supabase
      .from("prospect_preview")
      .insert({
        id,
        user_id: params.userId,
        html: params.html,
        place_google_id: params.placeGoogleId,
        business_name: params.businessName,
        business_address: params.businessAddress,
        primary_category: params.primaryCategory,
        preview_device_type: params.previewDeviceType ?? null,
        preview_target: params.previewTarget ?? null,
        screenshot_status: "pending",
        slug,
      })
      .select("id")
      .single();

    if (!error && data?.id) {
      return { ok: true, id: data.id as string, slug };
    }

    if (error?.code === "23505") {
      continue;
    }

    console.warn("[prospect_preview] insert failed", error?.message);
    return {
      ok: false,
      error: error?.message ?? "Insert failed",
      code: error?.code,
    };
  }

  console.warn("[prospect_preview] insert failed: slug unique conflicts exhausted");
  return { ok: false, error: "Could not allocate a unique preview slug." };
}
