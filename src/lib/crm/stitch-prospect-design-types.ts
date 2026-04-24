import type { PlacesSearchPlace } from "@/lib/crm/places-types";
import type { BrandColorResult, WebsiteBrandFacts } from "@/lib/crm/brand-color-extract";

/** POST /api/prospecting/stitch-design — same shape as generate-preview plus `target`. */
export type StitchProspectDesignPayload =
  | {
      target: "website" | "webapp" | "mobile";
      kind: "place";
      place: PlacesSearchPlace;
      servicesLine?: string;
      colorVibe?: string;
      /** Extracted from the business's existing website, if available. */
      brandColors?: BrandColorResult | null;
      /** Official logo image URL scraped from the business's website. */
      logoUrl?: string | null;
      /** Extracted source-site copy/sections/images used to keep redesigns brand-faithful. */
      sourceWebsiteFacts?: WebsiteBrandFacts | null;
    }
  | {
      target: "website" | "webapp" | "mobile";
      kind: "url";
      url: string;
      pageTitle?: string | null;
      metaDescription?: string | null;
      servicesLine?: string;
      colorVibe?: string;
      /** Extracted from the provided URL, if available. */
      brandColors?: BrandColorResult | null;
      /** Official logo image URL scraped from the provided URL. */
      logoUrl?: string | null;
      /** Extracted source-site copy/sections/images used to keep redesigns brand-faithful. */
      sourceWebsiteFacts?: WebsiteBrandFacts | null;
    };

export type StitchProspectDesignResult =
  | {
      ok: true;
      projectId: string;
      screenId: string;
      projectTitle: string;
      imageUrl: string;
      htmlUrl: string;
      /** When hosting succeeded: same public URLs as LLM prospect previews (e.g. preview.zenpho.com/{slug}). */
      hostedPreviewUrl?: string;
      hostedPreviewSlug?: string;
      hostedPreviewId?: string;
    }
  | { ok: false; error: string; code?: "STITCH_API_KEY_MISSING" };
