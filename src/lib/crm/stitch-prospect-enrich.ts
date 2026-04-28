import { fetchBrandAssetsFromUrl } from "@/lib/crm/brand-color-extract";
import type { StitchProspectDesignPayload } from "@/lib/crm/stitch-prospect-design-types";

function stitchBrandReferenceUrl(payload: StitchProspectDesignPayload): string | null {
  const raw =
    payload.kind === "place"
      ? payload.place.websiteUri?.trim()
      : payload.url?.trim();
  return raw || null;
}

export async function enrichStitchProspectPayloadWithBrandAssets(
  payload: StitchProspectDesignPayload,
  options: { timeoutMs?: number; logPrefix?: string } = {}
): Promise<StitchProspectDesignPayload> {
  const brandUrl = stitchBrandReferenceUrl(payload);
  if (!brandUrl) return payload;

  if (payload.brandColors && payload.logoUrl && payload.sourceWebsiteFacts) {
    return payload;
  }

  const logPrefix = options.logPrefix ?? "[stitch-design]";
  const assets = await fetchBrandAssetsFromUrl(
    brandUrl,
    options.timeoutMs ?? 6000
  ).catch((e) => {
    console.warn(
      `${logPrefix} brand asset fetch failed:`,
      e instanceof Error ? e.message : e
    );
    return { colors: null, logoUrl: null, sourceFacts: null };
  });

  console.info(
    `${logPrefix} brand extraction for`,
    brandUrl,
    "-> colors:",
    assets.colors,
    "logo:",
    assets.logoUrl
  );

  return {
    ...payload,
    brandColors: payload.brandColors ?? assets.colors ?? undefined,
    logoUrl: payload.logoUrl ?? assets.logoUrl ?? undefined,
    sourceWebsiteFacts:
      payload.sourceWebsiteFacts ?? assets.sourceFacts ?? undefined,
  };
}
