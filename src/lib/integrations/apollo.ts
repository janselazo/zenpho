import type { ApolloPersonRow } from "@/lib/crm/prospect-enrichment-types";

const APOLLO_PEOPLE_SEARCH_URL =
  "https://api.apollo.io/api/v1/mixed_people/api_search";
const APOLLO_PEOPLE_MATCH_URL = "https://api.apollo.io/api/v1/people/match";

function pickPhone(p: Record<string, unknown>): string | null {
  if (typeof p.sanitized_phone === "string" && p.sanitized_phone.trim()) {
    return p.sanitized_phone.trim();
  }
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
 * Uses People API Search (`mixed_people/api_search`). Names/titles often have redacted contact fields;
 * follow with `apolloEnrichPeopleById` (`/people/match` + `reveal_personal_emails`) for email, LinkedIn, and phone when Apollo returns them.
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
    const apolloPersonId =
      typeof p.id === "string" && p.id.trim()
        ? p.id.trim()
        : typeof p.person_id === "string" && p.person_id.trim()
          ? p.person_id.trim()
          : null;
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
      apolloPersonId,
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

export type ApolloEnrichmentById = {
  email: string | null;
  phone: string | null;
  linkedinUrl: string | null;
};

function firstEmailFromContactEmails(obj: Record<string, unknown>): string | null {
  const arr = obj.contact_emails;
  if (!Array.isArray(arr) || !arr.length) return null;
  const first = arr[0];
  if (!first || typeof first !== "object") return null;
  const e = (first as { email?: string }).email;
  return typeof e === "string" && e.includes("@") ? e.trim() : null;
}

function enrichmentFromMatchJson(json: Record<string, unknown>): ApolloEnrichmentById {
  const person = json.person;
  if (!person || typeof person !== "object") {
    return { email: null, phone: null, linkedinUrl: null };
  }
  const p = person as Record<string, unknown>;
  const contact =
    p.contact && typeof p.contact === "object" ? (p.contact as Record<string, unknown>) : null;

  let email: string | null =
    typeof p.email === "string" && p.email.includes("@") ? p.email.trim() : null;
  if (!email && contact) {
    if (typeof contact.email === "string" && contact.email.includes("@")) {
      email = contact.email.trim();
    } else {
      email = firstEmailFromContactEmails(contact);
    }
  }

  let linkedinUrl: string | null =
    typeof p.linkedin_url === "string"
      ? p.linkedin_url
      : typeof p.linkedin === "string"
        ? p.linkedin
        : null;
  if (!linkedinUrl && contact) {
    linkedinUrl =
      typeof contact.linkedin_url === "string"
        ? contact.linkedin_url
        : typeof contact.linkedin === "string"
          ? contact.linkedin
          : null;
  }

  let phone = pickPhone(p);
  if (!phone && contact) {
    phone = pickPhone(contact);
  }

  return { email, phone, linkedinUrl };
}

/**
 * People Enrichment (`/people/match`) per Apollo id — reveals work email (and phone when present on the
 * enriched record). Uses `reveal_personal_emails=true` (consumes credits per Apollo pricing). Mobile
 * direct-dial via `reveal_phone_number` requires a webhook in Apollo’s API and is not used here.
 *
 * @see https://docs.apollo.io/reference/people-enrichment
 */
export async function apolloEnrichPeopleById(
  domain: string,
  personIds: string[]
): Promise<
  { ok: true; byId: Record<string, ApolloEnrichmentById> } | { ok: false; error: string }
> {
  const key = process.env.APOLLO_API_KEY?.trim();
  if (!key) {
    return { ok: false, error: "Set APOLLO_API_KEY in .env.local to use Apollo." };
  }
  const dom = domain.trim().replace(/^www\./i, "");
  if (!dom || !dom.includes(".")) {
    return { ok: false, error: "Valid company domain required (e.g. example.com)." };
  }

  const unique = [...new Set(personIds.map((x) => x.trim()).filter(Boolean))];
  if (unique.length === 0) {
    return { ok: true, byId: {} };
  }

  const byId: Record<string, ApolloEnrichmentById> = {};
  let lastHttpError: string | null = null;

  for (const id of unique) {
    const params = new URLSearchParams();
    params.set("id", id);
    params.set("domain", dom);
    params.set("reveal_personal_emails", "true");

    let res: Response;
    try {
      res = await fetch(`${APOLLO_PEOPLE_MATCH_URL}?${params.toString()}`, {
        method: "POST",
        headers: {
          "Cache-Control": "no-cache",
          "Content-Type": "application/json",
          "x-api-key": key,
        },
        body: "{}",
        signal: AbortSignal.timeout(45_000),
      });
    } catch (e) {
      return {
        ok: false,
        error: e instanceof Error ? e.message : "Apollo enrichment request failed.",
      };
    }

    const text = await res.text();
    if (!res.ok) {
      lastHttpError = `Apollo enrich HTTP ${res.status}: ${text.slice(0, 200)}`;
      continue;
    }

    try {
      const json = JSON.parse(text) as Record<string, unknown>;
      byId[id] = enrichmentFromMatchJson(json);
    } catch {
      lastHttpError = "Apollo enrichment returned invalid JSON.";
    }
  }

  if (Object.keys(byId).length === 0 && lastHttpError) {
    return { ok: false, error: lastHttpError };
  }

  return { ok: true, byId };
}
