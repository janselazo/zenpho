import type { OutscraperPlaceRow } from "@/lib/crm/prospect-enrichment-types";

const BASE = "https://api.app.outscraper.com";

function flattenOutscraperData(data: unknown): Record<string, unknown>[] {
  if (!data) return [];
  if (Array.isArray(data)) {
    if (data.length && Array.isArray(data[0])) {
      return (data as unknown[][]).flat().filter((x) => x && typeof x === "object") as Record<
        string,
        unknown
      >[];
    }
    return data.filter((x) => x && typeof x === "object") as Record<string, unknown>[];
  }
  if (typeof data === "object") return [data as Record<string, unknown>];
  return [];
}

function pickStr(obj: Record<string, unknown>, keys: string[]): string | undefined {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return undefined;
}

/**
 * Google Maps search via Outscraper (managed scrapers). Requires OUTSCRAPER_API_KEY.
 * @see https://outscraper.com/google-maps-api/
 */
export async function outscraperMapsSearch(
  query: string,
  limit = 10
): Promise<{ ok: true; rows: OutscraperPlaceRow[] } | { ok: false; error: string }> {
  const key = process.env.OUTSCRAPER_API_KEY?.trim();
  if (!key) {
    return { ok: false, error: "Set OUTSCRAPER_API_KEY in .env.local to use Outscraper." };
  }
  const q = query.trim();
  if (!q) return { ok: false, error: "Query is empty." };

  const url = new URL(`${BASE}/maps/search-v2`);
  url.searchParams.set("query", q);
  url.searchParams.set("limit", String(Math.min(50, Math.max(1, limit))));
  url.searchParams.set("language", "en");
  url.searchParams.set("region", "us");
  url.searchParams.set("async", "false");

  let res: Response;
  try {
    res = await fetch(url.toString(), {
      method: "GET",
      headers: { "X-API-KEY": key },
      signal: AbortSignal.timeout(120_000),
    });
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Outscraper request failed." };
  }

  if (!res.ok) {
    const t = await res.text();
    return { ok: false, error: `Outscraper HTTP ${res.status}: ${t.slice(0, 200)}` };
  }

  let json: unknown;
  try {
    json = await res.json();
  } catch {
    return { ok: false, error: "Outscraper returned non-JSON." };
  }

  const data = (json as { data?: unknown }).data ?? json;
  const raw = flattenOutscraperData(data);
  const rows: OutscraperPlaceRow[] = [];
  for (const obj of raw) {
    const name =
      pickStr(obj, ["name", "title", "place_name"]) ??
      (typeof obj.query === "string" ? obj.query : undefined);
    if (!name) continue;
    rows.push({
      name,
      address: pickStr(obj, ["full_address", "address", "formatted_address"]),
      phone: pickStr(obj, ["phone", "phone_number", "telephone"]),
      site: pickStr(obj, ["site", "website", "url", "domain"]),
    });
  }

  return { ok: true, rows };
}
