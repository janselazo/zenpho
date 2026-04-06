import type { PlacesSearchPlace } from "@/lib/crm/places-types";

/** POST /api/prospecting/stitch-design — same shape as generate-preview plus `target`. */
export type StitchProspectDesignPayload =
  | {
      target: "website" | "mobile";
      kind: "place";
      place: PlacesSearchPlace;
      servicesLine?: string;
      colorVibe?: string;
    }
  | {
      target: "website" | "mobile";
      kind: "url";
      url: string;
      pageTitle?: string | null;
      metaDescription?: string | null;
      servicesLine?: string;
      colorVibe?: string;
    };

export type StitchProspectDesignResult =
  | {
      ok: true;
      projectId: string;
      screenId: string;
      projectTitle: string;
      imageUrl: string;
      htmlUrl: string;
    }
  | { ok: false; error: string; code?: "STITCH_API_KEY_MISSING" };
