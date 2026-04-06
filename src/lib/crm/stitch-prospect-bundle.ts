import {
  buildStitchMobilePrompt,
  buildStitchWebsitePrompt,
} from "@/lib/crm/stitch-prospect-prompts";
import type { StitchProspectDesignPayload } from "@/lib/crm/stitch-prospect-design-types";

function safeTrim(s: unknown): string {
  return typeof s === "string" ? s.trim() : "";
}

export type StitchProspectGenerationBundle = {
  prompt: string;
  projectTitle: string;
  deviceType: "DESKTOP" | "MOBILE";
};

/** Shared by Stitch SDK run and manual “copy prompt” flow. */
export function buildStitchProspectGenerationBundle(
  payload: StitchProspectDesignPayload
): StitchProspectGenerationBundle {
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

  return { prompt, projectTitle, deviceType };
}
