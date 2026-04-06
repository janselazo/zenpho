import {
  buildStitchMobilePrompt,
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
  const isWebsite = filled.target === "website";
  const prompt = isWebsite ? buildStitchWebsitePrompt(filled) : buildStitchMobilePrompt(filled);
  const deviceType = isWebsite ? "DESKTOP" : "MOBILE";

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

  const projectTitle = `Zenpho — ${businessLabel} (${isWebsite ? "web" : "mobile"})`.slice(0, 120);

  return { prompt, projectTitle, deviceType };
}
