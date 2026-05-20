import type {
  MetaAdCreative,
  MetaAdSignal,
} from "@/lib/crm/meta-ad-intel-types";
import { friendlyMetaApiError } from "@/lib/crm/meta-api-errors";

const META_AD_LIBRARY_URL = "https://graph.facebook.com/v19.0/ads_archive";
const META_AD_LIBRARY_LIMIT = 50;

type MetaAdLibraryApiRow = {
  id?: string;
  ad_creative_body?: string;
  ad_creative_link_title?: string;
  ad_snapshot_url?: string;
  ad_delivery_start_time?: string;
  publisher_platforms?: string[];
};

type MetaAdLibraryApiResponse = {
  data?: MetaAdLibraryApiRow[];
  error?: { message?: string; code?: number };
};

export type MetaAdLibraryResult =
  | {
      ok: true;
      adCount: number;
      oldestAdDaysActive: number | null;
      platforms: string[];
      sampleCreatives: MetaAdCreative[];
    }
  | { ok: false; error: string; missingToken?: boolean };

function unique(values: string[]): string[] {
  return [...new Set(values.map((v) => v.trim()).filter(Boolean))];
}

function daysSince(value: string): number | null {
  const time = Date.parse(value);
  if (!Number.isFinite(time)) return null;
  return Math.max(0, Math.floor((Date.now() - time) / 86_400_000));
}

function normalizeCreative(row: MetaAdLibraryApiRow): MetaAdCreative {
  return {
    id: String(row.id ?? ""),
    body: row.ad_creative_body?.trim() || null,
    linkTitle: row.ad_creative_link_title?.trim() || null,
    snapshotUrl: row.ad_snapshot_url?.trim() || null,
    startTime: row.ad_delivery_start_time?.trim() || null,
    platforms: unique(row.publisher_platforms ?? []),
  };
}

export function classifyMetaAdSignal(input: {
  pageId: string | null;
  adCount: number;
  pixelDetected: boolean;
  adQueryAttempted: boolean;
}): MetaAdSignal {
  if (!input.adQueryAttempted && !input.pixelDetected) return "UNKNOWN";
  if (input.adCount >= 5) return "RUNNING_HIGH";
  if (input.adCount > 0) return "RUNNING_LOW";
  if (input.pixelDetected) return "DORMANT_WITH_PIXEL";
  if (input.pageId || input.adQueryAttempted) return "COLD";
  return "UNKNOWN";
}

export function outreachAngleForSignal(signal: MetaAdSignal): string {
  switch (signal) {
    case "RUNNING_HIGH":
      return "You're already investing in Meta ads; the quickest lift is stronger creative testing and video hooks.";
    case "RUNNING_LOW":
      return "You have Meta ads live, but there's room to scale with stronger video concepts and retargeting.";
    case "DORMANT_WITH_PIXEL":
      return "Best opportunity: the Pixel is installed, but no active ads are running.";
    case "COLD":
      return "They are not running Meta ads yet; educate before pitching paid creative.";
    case "UNKNOWN":
    default:
      return "Ad activity could not be verified yet; lead with the website/social signal.";
  }
}

async function fetchMetaAdLibraryWithParams(
  params: URLSearchParams,
): Promise<MetaAdLibraryResult> {
  const token =
    process.env.META_ACCESS_TOKEN?.trim() ||
    process.env.META_GRAPH_ACCESS_TOKEN?.trim();
  if (!token) {
    return {
      ok: false,
      missingToken: true,
      error: "META_ACCESS_TOKEN or META_GRAPH_ACCESS_TOKEN is not configured.",
    };
  }

  params.set("access_token", token);
  params.set("ad_active_status", "ACTIVE");
  params.set("ad_type", "ALL");
  params.set(
    "fields",
    "id,ad_creative_body,ad_creative_link_title,ad_snapshot_url,ad_delivery_start_time,publisher_platforms",
  );
  params.set("ad_reached_countries", "US");
  params.set("limit", String(META_AD_LIBRARY_LIMIT));

  try {
    const res = await fetch(`${META_AD_LIBRARY_URL}?${params.toString()}`, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(15_000),
    });
    const data = (await res.json().catch(() => ({}))) as MetaAdLibraryApiResponse;
    if (!res.ok) {
      return {
        ok: false,
        error:
          friendlyMetaApiError(data.error?.message) ||
          data.error?.message ||
          `Meta Ad Library request failed with status ${res.status}.`,
      };
    }

    const rows = data.data ?? [];
    const creatives = rows.map(normalizeCreative);
    const platforms = unique(creatives.flatMap((creative) => creative.platforms));
    const ageCandidates = creatives
      .map((creative) =>
        creative.startTime ? daysSince(creative.startTime) : null,
      )
      .filter((value): value is number => value !== null);

    return {
      ok: true,
      adCount: rows.length,
      oldestAdDaysActive:
        ageCandidates.length > 0 ? Math.max(...ageCandidates) : null,
      platforms,
      sampleCreatives: creatives.slice(0, 6),
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Meta Ad Library request failed.",
    };
  }
}

export async function fetchMetaAdLibrary(
  pageId: string,
): Promise<MetaAdLibraryResult> {
  return fetchMetaAdLibraryWithParams(
    new URLSearchParams({
      search_page_ids: pageId,
    }),
  );
}

export async function fetchMetaAdLibraryBySearchTerms(
  searchTerms: string,
): Promise<MetaAdLibraryResult> {
  return fetchMetaAdLibraryWithParams(
    new URLSearchParams({
      search_terms: searchTerms,
    }),
  );
}
