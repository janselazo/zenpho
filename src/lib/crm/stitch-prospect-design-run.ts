import { Stitch, StitchToolClient, StitchError } from "@google/stitch-sdk";
import { requireAgencyStaff } from "@/app/(crm)/actions/prospect-preview-agency";
import {
  buildStitchMobilePrompt,
  buildStitchWebsitePrompt,
} from "@/lib/crm/stitch-prospect-prompts";
import type {
  StitchProspectDesignPayload,
  StitchProspectDesignResult,
} from "@/lib/crm/stitch-prospect-design-types";

function safeTrim(s: unknown): string {
  return typeof s === "string" ? s.trim() : "";
}

export async function runStitchProspectDesign(
  payload: StitchProspectDesignPayload
): Promise<StitchProspectDesignResult> {
  const auth = await requireAgencyStaff();
  if (auth.error || !auth.user) {
    return { ok: false as const, error: auth.error ?? "Unauthorized" };
  }

  const apiKey = process.env.STITCH_API_KEY?.trim();
  if (!apiKey) {
    return {
      ok: false as const,
      error:
        "STITCH_API_KEY is not set. Add a Google Stitch API key to .env.local (server) and Vercel project env, then redeploy.",
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

  const isWebsite = payload.target === "website";
  const prompt = isWebsite ? buildStitchWebsitePrompt(payload) : buildStitchMobilePrompt(payload);
  const deviceType = isWebsite ? "DESKTOP" : "MOBILE";

  const businessLabel =
    payload.kind === "place"
      ? safeTrim(payload.place.name).slice(0, 60) || "Business"
      : (() => {
          try {
            return new URL(
              /^https?:\/\//i.test(payload.url) ? payload.url : `https://${payload.url}`
            ).hostname.replace(/^www\./i, "");
          } catch {
            return "Website";
          }
        })();

  const projectTitle = `Zenpho — ${businessLabel} (${isWebsite ? "web" : "mobile"})`.slice(0, 120);

  const toolClient = new StitchToolClient({
    apiKey,
    timeout: 280_000,
  });
  const sdk = new Stitch(toolClient);

  try {
    const project = await sdk.createProject(projectTitle);
    const screen = await project.generate(prompt, deviceType);
    const [imageUrl, htmlUrl] = await Promise.all([screen.getImage(), screen.getHtml()]);
    const img = typeof imageUrl === "string" ? imageUrl.trim() : "";
    const html = typeof htmlUrl === "string" ? htmlUrl.trim() : "";
    if (!img || !html) {
      return {
        ok: false as const,
        error: "Stitch returned no screenshot or HTML URL. Try again in a minute.",
      };
    }
    return {
      ok: true as const,
      projectId: project.projectId,
      screenId: screen.screenId,
      projectTitle,
      imageUrl: img,
      htmlUrl: html,
    };
  } catch (e) {
    if (e instanceof StitchError) {
      return {
        ok: false as const,
        error: `${e.code}: ${e.message}`.trim(),
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
