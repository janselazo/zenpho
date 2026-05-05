import { fetchGooglePlacePhotoMedia } from "@/lib/crm/places-photo-media";
import type { PlacesSearchPlace } from "@/lib/crm/places-types";
import { resolveProspectBrandAssets } from "@/lib/crm/prospect-branding-asset-resolve";
import { createAdminClient } from "@/lib/supabase/admin";

export type ProposalPdfRasterSlot = {
  caption: string;
  /** PNG/JPEG raw bytes suitable for pdf-lib embedding. */
  bytes: Uint8Array;
};

/**
 * Best-effort images for Proposal PDF exports (never throws).
 */
export async function collectProposalPdfRasters(input: {
  googlePlacesApiKey: string | null | undefined;
  place: PlacesSearchPlace | null;
  /** Fallback label for resolving brand scrape. */
  businessLabel: string;
}): Promise<ProposalPdfRasterSlot[]> {
  const key = input.googlePlacesApiKey?.trim() ?? "";
  const out: ProposalPdfRasterSlot[] = [];

  const website = input.place?.websiteUri?.trim() ?? null;
  try {
    if (website) {
      const brand = await resolveProspectBrandAssets({
        websiteUrl: website,
        businessName:
          input.businessLabel?.trim() || input.place?.name || undefined,
      });
      if (brand.logoPng?.length) {
        let caption = "Logo from website scan";
        const src = brand.logoSourceUrl?.trim();
        if (src && /^https?:\/\//i.test(src)) {
          try {
            caption = `Logo (${new URL(src).hostname})`;
          } catch {
            /* keep default */
          }
        }
        out.push({
          caption,
          bytes: new Uint8Array(brand.logoPng),
        });
      }
    }
  } catch {
    /* empty */
  }

  if (!key || !input.place?.photoRefs?.length) return out;

  for (const ref of input.place.photoRefs.slice(0, 3)) {
    try {
      const buf = await fetchGooglePlacePhotoMedia(key, ref, {
        maxPx: 900,
      });
      if (!buf?.byteLength) continue;
      out.push({
        caption: "Listing photo via Google Places",
        bytes: new Uint8Array(buf),
      });
    } catch {
      /* empty */
    }
  }

  return out;
}

const AI_VISUAL_BUCKET = "prospect-attachments";

/** Download stored GPT proposal illustrations into PDF-ready rasters (never throws). */
export async function collectProposalAiVisualRasters(input: {
  rows: readonly { path: string; caption: string }[];
}): Promise<ProposalPdfRasterSlot[]> {
  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return [];
  }

  const out: ProposalPdfRasterSlot[] = [];
  for (const row of input.rows) {
    const path = row.path.trim();
    if (!path.startsWith("proposal-ai-visuals/") || path.includes("..")) {
      continue;
    }
    try {
      const { data, error } = await admin.storage
        .from(AI_VISUAL_BUCKET)
        .download(path);
      if (error || !data) continue;
      const buf = Buffer.from(await data.arrayBuffer());
      if (!buf.byteLength || buf.byteLength < 120) continue;
      out.push({
        caption: row.caption.trim() || "AI concept visualization",
        bytes: new Uint8Array(buf),
      });
    } catch {
      /* skip */
    }
  }

  return out;
}
