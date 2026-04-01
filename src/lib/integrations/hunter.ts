import type { HunterEmailRow } from "@/lib/crm/prospect-enrichment-types";

/**
 * Domain email discovery. Requires HUNTER_API_KEY.
 */
export async function hunterDomainSearch(
  domain: string,
  excludeLowercase: Set<string>,
  limit = 15
): Promise<{ ok: true; emails: HunterEmailRow[] } | { ok: false; error: string }> {
  const key = process.env.HUNTER_API_KEY?.trim();
  if (!key) {
    return { ok: false, error: "Set HUNTER_API_KEY in .env.local to use Hunter.io." };
  }
  const dom = domain.trim().replace(/^www\./i, "");
  if (!dom || !dom.includes(".")) {
    return { ok: false, error: "Valid domain required." };
  }

  const url = new URL("https://api.hunter.io/v2/domain-search");
  url.searchParams.set("domain", dom);
  url.searchParams.set("api_key", key);
  url.searchParams.set("limit", String(Math.min(50, Math.max(1, limit))));

  let res: Response;
  try {
    res = await fetch(url.toString(), { signal: AbortSignal.timeout(30_000) });
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Hunter request failed." };
  }

  const json = (await res.json()) as {
    data?: { emails?: Record<string, unknown>[] };
    errors?: { id?: string; details?: string }[];
  };

  if (!res.ok) {
    const msg = json.errors?.[0]?.details ?? JSON.stringify(json).slice(0, 200);
    return { ok: false, error: `Hunter HTTP ${res.status}: ${msg}` };
  }

  const list = json.data?.emails ?? [];
  const emails: HunterEmailRow[] = [];
  for (const row of list) {
    const email = typeof row.value === "string" ? row.value.trim().toLowerCase() : "";
    if (!email || excludeLowercase.has(email)) continue;
    emails.push({
      email,
      firstName: typeof row.first_name === "string" ? row.first_name : undefined,
      lastName: typeof row.last_name === "string" ? row.last_name : undefined,
      position: typeof row.position === "string" ? row.position : undefined,
      confidence: typeof row.confidence === "number" ? row.confidence : undefined,
      source: "hunter",
    });
  }

  return { ok: true, emails };
}
