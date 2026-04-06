import type { StitchProspectDesignPayload } from "@/lib/crm/stitch-prospect-design-types";

function defaultColorVibeFromEnv(): string {
  return (
    process.env.PROSPECT_PREVIEW_COLOR_VIBE?.trim() ||
    "Fresh, professional, trustworthy — light neutral background, one confident accent suited to a local service business, strong typography hierarchy."
  );
}

/**
 * Drops client-supplied services/color. Color/mood comes from PROSPECT_PREVIEW_COLOR_VIBE (or a
 * built-in default). For Local Business listings, offerings and categories are already in the
 * prompt from the Google Business Profile payload (name, types, rating, etc.).
 */
export function applyStitchProspectPayloadDefaults(
  payload: StitchProspectDesignPayload
): StitchProspectDesignPayload {
  return {
    ...payload,
    servicesLine: undefined,
    colorVibe: defaultColorVibeFromEnv(),
  };
}
