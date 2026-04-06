"use server";

import {
  prospectPreviewMicrolinkUrl,
  prospectPreviewPageUrl,
} from "@/lib/crm/prospect-preview-public-url";
import {
  runGenerateProspectPreview,
  type GenerateProspectPreviewPayload,
} from "@/lib/crm/prospect-preview-run-generate";
import { requireAgencyStaff } from "@/app/(crm)/actions/prospect-preview-agency";

export type { GenerateProspectPreviewPayload };

export async function generateProspectPreviewAction(
  payload: GenerateProspectPreviewPayload,
): Promise<
  | {
      ok: true;
      previewId: string;
      previewUrl: string;
      previewFrameUrl: string;
      previewSlug: string;
      businessName: string;
      screenshotStatus: string;
      screenshotUrl: string | null;
    }
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

export async function getProspectPreviewStatusAction(previewId: string) {
  const auth = await requireAgencyStaff();
  if (auth.error || !auth.supabase) {
    return { ok: false as const, error: auth.error ?? "Unauthorized" };
  }
  const id = previewId.trim();
  if (!id) return { ok: false as const, error: "Missing preview id." };

  const { data, error } = await auth.supabase
    .from("prospect_preview")
    .select("screenshot_url, screenshot_status, business_name, slug")
    .eq("id", id)
    .maybeSingle();

  if (error) return { ok: false as const, error: error.message };
  if (!data) return { ok: false as const, error: "Preview not found." };

  const slug = (data.slug as string | null | undefined)?.trim() || null;

  return {
    ok: true as const,
    screenshotUrl: data.screenshot_url as string | null,
    screenshotStatus: data.screenshot_status as string,
    businessName: data.business_name as string,
    previewUrl: prospectPreviewPageUrl(id, slug),
    previewFrameUrl: prospectPreviewMicrolinkUrl(id),
  };
}
