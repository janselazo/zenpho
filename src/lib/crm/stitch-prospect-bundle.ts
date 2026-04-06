import {
  buildStitchMobilePrompt,
  buildStitchWebAppPrompt,
  buildStitchWebsitePrompt,
} from "@/lib/crm/stitch-prospect-prompts";
import type { StitchProspectDesignPayload } from "@/lib/crm/stitch-prospect-design-types";
import { applyStitchProspectPayloadDefaults } from "@/lib/crm/stitch-prospect-payload-defaults";

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
  const filled = applyStitchProspectPayloadDefaults(payload);
  const prompt =
    filled.target === "website"
      ? buildStitchWebsitePrompt(filled)
      : filled.target === "webapp"
        ? buildStitchWebAppPrompt(filled)
        : buildStitchMobilePrompt(filled);
  const deviceType: "DESKTOP" | "MOBILE" =
    filled.target === "mobile" ? "MOBILE" : "DESKTOP";

  const businessLabel =
    filled.kind === "place"
      ? safeTrim(filled.place.name).slice(0, 60) || "Business"
      : (() => {
          try {
            return new URL(
              /^https?:\/\//i.test(filled.url) ? filled.url : `https://${filled.url}`
            ).hostname.replace(/^www\./i, "");
          } catch {
            return "Website";
          }
        })();

  const targetLabel =
    filled.target === "website" ? "website" : filled.target === "webapp" ? "webapp" : "mobile";
  const projectTitle = `Zenpho — ${businessLabel} (${targetLabel})`.slice(0, 120);

  return { prompt, projectTitle, deviceType };
}
