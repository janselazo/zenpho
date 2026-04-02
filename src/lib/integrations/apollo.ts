import type { ApolloPersonRow } from "@/lib/crm/prospect-enrichment-types";

const APOLLO_PEOPLE_SEARCH_URL =
  "https://api.apollo.io/api/v1/mixed_people/api_search";

function pickPhone(p: Record<string, unknown>): string | null {
  const pn = p.phone_numbers;
  if (Array.isArray(pn) && pn.length) {
    const first = pn[0];
    if (typeof first === "string") return first;
    if (first && typeof first === "object" && "raw_number" in first) {
      return String((first as { raw_number?: string }).raw_number ?? "") || null;
    }
  }
  if (typeof p.phone === "string" && p.phone.trim()) return p.phone.trim();
  return null;
}

function displayName(p: Record<string, unknown>): string {
  const fn = typeof p.first_name === "string" ? p.first_name.trim() : "";
  const ln = typeof p.last_name === "string" ? p.last_name.trim() : "";
  const lno =
    typeof p.last_name_obfuscated === "string" ? p.last_name_obfuscated.trim() : "";
  const last = ln || lno;
  const combined = `${fn} ${last}`.trim();
  if (combined) return combined;
  return typeof p.name === "string" ? p.name : "Unknown";
}

const PERSON_TITLES = [
  "owner",
  "founder",
  "ceo",
  "president",
  "general manager",
  "managing director",
  "partner",
  "principal",
] as const;

function buildPeopleSearchUrl(domain: string, perPage: number): string {
  const params = new URLSearchParams();
  params.set("page", "1");
  params.set("per_page", String(perPage));
  params.append("q_organization_domains_list[]", domain);
  for (const t of PERSON_TITLES) {
    params.append("person_titles[]", t);
  }
  return `${APOLLO_PEOPLE_SEARCH_URL}?${params.toString()}`;
}

/**
 * People at organization by domain. Requires APOLLO_API_KEY (Apollo “master” API key for this endpoint).
 *
 * Uses People API Search (`mixed_people/api_search`). Does not return raw emails or phone numbers;
 * Apollo expects separate enrichment calls for contact details.
 *
 * @see https://docs.apollo.io/reference/people-api-search
 */
export async function apolloSearchDecisionMakers(
  domain: string,
  limit = 5
): Promise<{ ok: true; people: ApolloPersonRow[] } | { ok: false; error: string }> {
  const key = process.env.APOLLO_API_KEY?.trim();
  if (!key) {
    return { ok: false, error: "Set APOLLO_API_KEY in .env.local to use Apollo." };
  }
  const dom = domain.trim().replace(/^www\./i, "");
  if (!dom || !dom.includes(".")) {
    return { ok: false, error: "Valid company domain required (e.g. example.com)." };
  }

  const perPage = Math.min(100, Math.max(1, limit));
  const url = buildPeopleSearchUrl(dom, perPage);

  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: {
        "Cache-Control": "no-cache",
        "x-api-key": key,
      },
      signal: AbortSignal.timeout(45_000),
    });
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Apollo request failed." };
  }

  const text = await res.text();
  if (!res.ok) {
    let hint = "";
    try {
      const err = JSON.parse(text) as { error?: string; message?: string };
      const msg = String(err.error ?? err.message ?? "");
      if (msg.includes("not accessible with this api_key")) {
        hint =
          " Create a Master API key in Apollo (Settings → API) — this endpoint does not accept all key types.";
      }
    } catch {
      /* ignore */
    }
    return {
      ok: false,
      error: `Apollo HTTP ${res.status}: ${text.slice(0, 280)}${hint}`,
    };
  }

  let json: { people?: Record<string, unknown>[] };
  try {
    json = JSON.parse(text) as { people?: Record<string, unknown>[] };
  } catch {
    return { ok: false, error: "Apollo returned invalid JSON." };
  }

  const raw = json.people ?? [];
  const people: ApolloPersonRow[] = raw.slice(0, limit).map((p) => {
    const name = displayName(p);
    const email =
      typeof p.email === "string" && p.email.includes("@") ? p.email : null;
    const linkedinUrl =
      typeof p.linkedin_url === "string"
        ? p.linkedin_url
        : typeof p.linkedin === "string"
          ? p.linkedin
          : null;
    const title = typeof p.title === "string" ? p.title : null;
    return {
      name,
      email,
      phone: pickPhone(p),
      linkedinUrl,
      title,
      source: "apollo" as const,
    };
  });

  return { ok: true, people };
}
