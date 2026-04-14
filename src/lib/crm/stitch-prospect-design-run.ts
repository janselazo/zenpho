import { Stitch, StitchToolClient, StitchError } from "@google/stitch-sdk";
import { requireAgencyStaff } from "@/app/(crm)/actions/prospect-preview-agency";
import { buildStitchProspectGenerationBundle } from "@/lib/crm/stitch-prospect-bundle";
import {
  getStitchServerApiKey,
  STITCH_API_KEY_MISSING_USER_MESSAGE,
} from "@/lib/crm/stitch-server-key";
import { persistStitchHtmlAsProspectPreview } from "@/lib/crm/stitch-prospect-host-preview";
import { getStitchLinkedProjectId } from "@/lib/crm/stitch-linked-project";
import { fetchBrandAssetsFromUrl } from "@/lib/crm/brand-color-extract";
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
  if (brandUrl && (!payload.brandColors || !payload.logoUrl)) {
    const assets = await fetchBrandAssetsFromUrl(brandUrl, 6000).catch((e) => {
      console.warn("[stitch-design] brand asset fetch failed:", e instanceof Error ? e.message : e);
      return { colors: null, logoUrl: null };
    });
    console.info("[stitch-design] brand extraction for", brandUrl, "→ colors:", assets.colors, "logo:", assets.logoUrl);
    enrichedPayload = {
      ...payload,
      brandColors: payload.brandColors ?? assets.colors ?? undefined,
      logoUrl: payload.logoUrl ?? assets.logoUrl ?? undefined,
    };
  }

  const { prompt, projectTitle, deviceType } = buildStitchProspectGenerationBundle(enrichedPayload);

  const linkedProjectId = getStitchLinkedProjectId();

  const toolClient = new StitchToolClient({
    apiKey,
    timeout: 280_000,
  });
  const sdk = new Stitch(toolClient);

  try {
    const project = linkedProjectId
      ? sdk.project(linkedProjectId)
      : await sdk.createProject(projectTitle);

    // Step 1: Generate — if this succeeds server-side, the screen exists in Stitch even
    // if the SDK throws while parsing the response.
    let screen: Awaited<ReturnType<typeof project.generate>>;
    try {
      screen = await project.generate(
        prompt,
        deviceType,
        STITCH_GEMINI_3_1_PRO_MODEL_ID,
      );
    } catch (genErr) {
      const errText = genErr instanceof Error ? genErr.message : String(genErr);
      console.error("[stitch-design] generate failed:", errText);
      if (genErr instanceof StitchError) {
        const base = `${genErr.code}: ${genErr.message}`.trim();
        const permissionHint =
          linkedProjectId &&
          (genErr.code === "PERMISSION_DENIED" || /permission|403|forbidden/i.test(genErr.message))
            ? " Your STITCH_PROJECT_ID must be a project the same Stitch API key can edit."
            : "";
        return { ok: false as const, error: `${base}${permissionHint}`.trim() };
      }
      return { ok: false as const, error: errText || "Stitch generation failed." };
    }

    // Step 2: Retrieve image + HTML URLs (separate from generate so a parse error in
    // generate doesn't lose the screen). Retry URL retrieval up to 3 times.
    let img = "";
    let html = "";
    for (let urlAttempt = 0; urlAttempt < 3; urlAttempt++) {
      try {
        const [imageUrl, htmlUrl] = await Promise.all([screen.getImage(), screen.getHtml()]);
        img = typeof imageUrl === "string" ? imageUrl.trim() : "";
        html = typeof htmlUrl === "string" ? htmlUrl.trim() : "";
        if (img && html) break;
      } catch (urlErr) {
        console.warn(`[stitch-design] URL retrieval attempt ${urlAttempt + 1} failed:`, urlErr instanceof Error ? urlErr.message : urlErr);
        if (urlAttempt < 2) await new Promise((r) => setTimeout(r, 2000));
      }
    }

    if (!img || !html) {
      return {
        ok: false as const,
        error: `Stitch created the screen (project ${project.projectId}, screen ${screen.screenId}) but could not retrieve the image/HTML URLs. Open it directly in Stitch.`,
      };
    }

    // Step 3: Persist HTML as hosted preview (non-fatal if it fails).
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
      return { ok: false as const, error: `${base}${permissionHint}`.trim() };
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
