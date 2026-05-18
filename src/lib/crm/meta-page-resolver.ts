import type { SupabaseClient } from "@supabase/supabase-js";

const FACEBOOK_HOSTS = new Set([
  "facebook.com",
  "www.facebook.com",
  "m.facebook.com",
  "mobile.facebook.com",
  "mbasic.facebook.com",
  "web.facebook.com",
  "business.facebook.com",
  "fb.com",
  "www.fb.com",
]);

const FACEBOOK_FETCH_TIMEOUT_MS = 12_000;
const PAGE_CACHE_DAYS = 30;

type PageCacheRow = {
  page_id: string | null;
  expires_at: string | null;
};

export type MetaPageResolution =
  | {
      ok: true;
      pageId: string;
      vanityHandle: string;
      source: "input" | "cache" | "graph" | "html";
    }
  | {
      ok: false;
      vanityHandle: string | null;
      error: string;
    };

function cleanHandleSegment(raw: string): string {
  return decodeURIComponent(raw)
    .replace(/^@+/, "")
    .replace(/\/+$/, "")
    .trim();
}

function normalizeFacebookInput(raw: string):
  | {
      ok: true;
      vanityHandle: string;
      fetchUrl: string;
      knownPageId: string | null;
    }
  | { ok: false; error: string } {
  const trimmed = raw.trim();
  if (!trimmed) return { ok: false, error: "Facebook URL or handle is empty." };

  if (/^\d{5,}$/.test(trimmed)) {
    return {
      ok: true,
      vanityHandle: trimmed,
      fetchUrl: `https://www.facebook.com/${trimmed}`,
      knownPageId: trimmed,
    };
  }

  const normalizedRaw = trimmed
    .replace(/^@+/, "")
    .replace(/^facebook\.com\//i, "https://facebook.com/")
    .replace(/^fb\.com\//i, "https://fb.com/");

  let url: URL;
  try {
    url = new URL(/^https?:\/\//i.test(normalizedRaw) ? normalizedRaw : `https://www.facebook.com/${normalizedRaw}`);
  } catch {
    return { ok: false, error: "Invalid Facebook URL or handle." };
  }

  const host = url.hostname.toLowerCase();
  if (!FACEBOOK_HOSTS.has(host)) {
    return { ok: false, error: "Only facebook.com and fb.com URLs are supported." };
  }

  const pathSegments = url.pathname
    .split("/")
    .map(cleanHandleSegment)
    .filter(Boolean);

  const profileId = url.searchParams.get("id")?.trim();
  if (profileId && /^\d{5,}$/.test(profileId)) {
    return {
      ok: true,
      vanityHandle: profileId,
      fetchUrl: `https://www.facebook.com/profile.php?id=${profileId}`,
      knownPageId: profileId,
    };
  }

  const numericSegment = pathSegments.find((part) => /^\d{5,}$/.test(part));
  if (numericSegment && pathSegments.includes("pages")) {
    return {
      ok: true,
      vanityHandle: numericSegment,
      fetchUrl: `https://www.facebook.com/${numericSegment}`,
      knownPageId: numericSegment,
    };
  }

  const handle = pathSegments[0] ?? "";
  if (!handle || ["ads", "adsmanager", "events", "groups", "marketplace", "pages"].includes(handle.toLowerCase())) {
    return { ok: false, error: "Enter a direct Facebook Page URL or vanity handle." };
  }

  return {
    ok: true,
    vanityHandle: handle.toLowerCase(),
    fetchUrl: `https://www.facebook.com/${encodeURIComponent(handle)}`,
    knownPageId: null,
  };
}

function extractPageIdFromHtml(html: string): string | null {
  const patterns = [
    /<meta[^>]+property=["']al:android:url["'][^>]+content=["']fb:\/\/page\/(\d+)["']/i,
    /<meta[^>]+content=["']fb:\/\/page\/(\d+)["'][^>]+property=["']al:android:url["']/i,
    /"pageID"\s*:\s*"(\d+)"/i,
    /"page_id"\s*:\s*"(\d+)"/i,
    /"pageID"\s*:\s*(\d+)/i,
    /"page_id"\s*:\s*(\d+)/i,
    /fb:\/\/page\/(\d+)/i,
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) return match[1];
  }
  return null;
}

function cacheExpiry(): string {
  const expires = new Date();
  expires.setDate(expires.getDate() + PAGE_CACHE_DAYS);
  return expires.toISOString();
}

async function resolvePageIdWithGraph(
  vanityHandle: string,
): Promise<string | null> {
  const token = process.env.META_ACCESS_TOKEN?.trim();
  if (!token || /^\d{5,}$/.test(vanityHandle)) return null;

  const params = new URLSearchParams({
    fields: "id",
    access_token: token,
  });

  try {
    const res = await fetch(
      `https://graph.facebook.com/v19.0/${encodeURIComponent(vanityHandle)}?${params.toString()}`,
      {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(FACEBOOK_FETCH_TIMEOUT_MS),
      },
    );
    if (!res.ok) return null;
    const data = (await res.json().catch(() => ({}))) as { id?: unknown };
    return typeof data.id === "string" && /^\d{5,}$/.test(data.id)
      ? data.id
      : null;
  } catch {
    return null;
  }
}

async function readCachedPageId(
  supabase: SupabaseClient,
  vanityHandle: string,
): Promise<string | null> {
  const { data, error } = await supabase
    .from("meta_page_cache")
    .select("page_id, expires_at")
    .eq("vanity_handle", vanityHandle)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();

  if (error || !data) return null;
  const row = data as PageCacheRow;
  return row.page_id?.trim() || null;
}

async function writeCachedPageId(
  supabase: SupabaseClient,
  vanityHandle: string,
  pageId: string,
): Promise<void> {
  const { error } = await supabase.from("meta_page_cache").upsert(
    {
      vanity_handle: vanityHandle,
      page_id: pageId,
      resolved_at: new Date().toISOString(),
      expires_at: cacheExpiry(),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "vanity_handle" },
  );
  if (error) {
    console.warn("[metaPageResolver] cache write failed:", error.message);
  }
}

export async function resolveMetaPageId(
  supabase: SupabaseClient,
  facebookUrl: string | null | undefined,
): Promise<MetaPageResolution> {
  const normalized = normalizeFacebookInput(facebookUrl ?? "");
  if (!normalized.ok) {
    return { ok: false, vanityHandle: null, error: normalized.error };
  }

  if (normalized.knownPageId) {
    await writeCachedPageId(supabase, normalized.vanityHandle, normalized.knownPageId);
    return {
      ok: true,
      pageId: normalized.knownPageId,
      vanityHandle: normalized.vanityHandle,
      source: "input",
    };
  }

  const cached = await readCachedPageId(supabase, normalized.vanityHandle);
  if (cached) {
    return {
      ok: true,
      pageId: cached,
      vanityHandle: normalized.vanityHandle,
      source: "cache",
    };
  }

  const graphPageId = await resolvePageIdWithGraph(normalized.vanityHandle);
  if (graphPageId) {
    await writeCachedPageId(supabase, normalized.vanityHandle, graphPageId);
    return {
      ok: true,
      pageId: graphPageId,
      vanityHandle: normalized.vanityHandle,
      source: "graph",
    };
  }

  try {
    const res = await fetch(normalized.fetchUrl, {
      headers: {
        Accept: "text/html,application/xhtml+xml",
        "User-Agent":
          "Mozilla/5.0 (compatible; ZenphoMetaAdIntel/1.0; +https://zenpho.com)",
      },
      signal: AbortSignal.timeout(FACEBOOK_FETCH_TIMEOUT_MS),
    });
    if (!res.ok) {
      return {
        ok: false,
        vanityHandle: normalized.vanityHandle,
        error: `Facebook page fetch failed with status ${res.status}.`,
      };
    }

    const html = await res.text();
    const pageId = extractPageIdFromHtml(html);
    if (!pageId) {
      return {
        ok: false,
        vanityHandle: normalized.vanityHandle,
        error: "Could not resolve a numeric Facebook Page ID from page HTML.",
      };
    }

    await writeCachedPageId(supabase, normalized.vanityHandle, pageId);
    return {
      ok: true,
      pageId,
      vanityHandle: normalized.vanityHandle,
      source: "html",
    };
  } catch (error) {
    return {
      ok: false,
      vanityHandle: normalized.vanityHandle,
      error: error instanceof Error ? error.message : "Facebook page resolution failed.",
    };
  }
}
