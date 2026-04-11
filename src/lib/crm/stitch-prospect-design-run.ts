import { Stitch, StitchToolClient, StitchError } from "@google/stitch-sdk";
import { requireAgencyStaff } from "@/app/(crm)/actions/prospect-preview-agency";
import { buildStitchProspectGenerationBundle } from "@/lib/crm/stitch-prospect-bundle";
import {
  getStitchServerApiKey,
  STITCH_API_KEY_MISSING_USER_MESSAGE,
} from "@/lib/crm/stitch-server-key";
import { persistStitchHtmlAsProspectPreview } from "@/lib/crm/stitch-prospect-host-preview";
import { getStitchLinkedProjectId } from "@/lib/crm/stitch-linked-project";
import { fetchAndExtractBrandColors } from "@/lib/crm/brand-color-extract";
import type {
  StitchProspectDesignPayload,
  StitchProspectDesignResult,
} from "@/lib/crm/stitch-prospect-design-types";

/** Stitch “Thinking with 3.1 Pro” (Gemini 3.1 Pro) — website, web app, and mobile API generations. */
const STITCH_GEMINI_3_1_PRO_MODEL_ID = "GEMINI_3_1_PRO" as const;

function safeTrim(s: unknown): string {
  return typeof s === "string" ? s.trim() : "";
}

export { STITCH_API_KEY_MISSING_USER_MESSAGE };

export async function runStitchProspectDesign(
  payload: StitchProspectDesignPayload
): Promise<StitchProspectDesignResult> {
  const auth = await requireAgencyStaff();
  if (auth.error || !auth.user || !auth.supabase) {
    return { ok: false as const, error: auth.error ?? "Unauthorized" };
  }

  const apiKey = getStitchServerApiKey();
  if (!apiKey) {
    return {
      ok: false as const,
      code: "STITCH_API_KEY_MISSING" as const,
      error: STITCH_API_KEY_MISSING_USER_MESSAGE,
    };
  }

  if (payload.kind === "url" && !safeTrim(payload.url)) {
    return { ok: false as const, error: "Missing URL for Stitch design." };
  }
  if (payload.kind === "place") {
    const id = safeTrim(payload.place?.id);
    const name = safeTrim(payload.place?.name);
    if (!id || !name) {
      return { ok: false as const, error: "Invalid place payload for Stitch design." };
    }
  }

  const brandUrl =
    payload.kind === "place"
      ? payload.place.websiteUri?.trim() || null
      : payload.url?.trim() || null;

  let enrichedPayload = payload;
  if (brandUrl && !payload.brandColors) {
    const colors = await fetchAndExtractBrandColors(brandUrl).catch(() => null);
    if (colors) {
      enrichedPayload = { ...payload, brandColors: colors };
    }
  }

  const { prompt, projectTitle, deviceType } = buildStitchProspectGenerationBundle(enrichedPayload);

  const toolClient = new StitchToolClient({
    apiKey,
    timeout: 280_000,
  });
  const sdk = new Stitch(toolClient);

  const linkedProjectId = getStitchLinkedProjectId();

  try {
    const project = linkedProjectId
      ? sdk.project(linkedProjectId)
      : await sdk.createProject(projectTitle);
    const screen = await project.generate(
      prompt,
      deviceType,
      STITCH_GEMINI_3_1_PRO_MODEL_ID,
    );
    const [imageUrl, htmlUrl] = await Promise.all([screen.getImage(), screen.getHtml()]);
    const img = typeof imageUrl === "string" ? imageUrl.trim() : "";
    const html = typeof htmlUrl === "string" ? htmlUrl.trim() : "";
    if (!img || !html) {
      return {
        ok: false as const,
        error: "Stitch returned no screenshot or HTML URL. Try again in a minute.",
      };
    }

    const hosted = await persistStitchHtmlAsProspectPreview({
      supabase: auth.supabase,
      userId: auth.user.id,
      payload,
      htmlExportUrl: html,
    });

    return {
      ok: true as const,
      projectId: project.projectId,
      screenId: screen.screenId,
      projectTitle,
      imageUrl: img,
      htmlUrl: html,
      ...(hosted
        ? {
            hostedPreviewUrl: hosted.hostedPreviewUrl,
            hostedPreviewSlug: hosted.hostedPreviewSlug,
            hostedPreviewId: hosted.hostedPreviewId,
          }
        : {}),
    };
  } catch (e) {
    if (e instanceof StitchError) {
      const base = `${e.code}: ${e.message}`.trim();
      const permissionHint =
        linkedProjectId &&
        (e.code === "PERMISSION_DENIED" || /permission|403|forbidden/i.test(e.message))
          ? " Your STITCH_PROJECT_ID must be a project the same Stitch API key can edit."
          : "";
      return {
        ok: false as const,
        error: `${base}${permissionHint}`.trim(),
      };
    }
    const msg = e instanceof Error ? e.message : "Stitch request failed.";
    return { ok: false as const, error: msg };
  } finally {
    try {
      await toolClient.close();
    } catch {
      /* ignore */
    }
  }
}
