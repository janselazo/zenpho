import type {
  ApolloEnrichmentById,
  ApolloPersonEnrichDescriptor,
  ApolloPersonRow,
} from "@/lib/crm/prospect-enrichment-types";

const APOLLO_PEOPLE_SEARCH_URL =
  "https://api.apollo.io/api/v1/mixed_people/api_search";
const APOLLO_PEOPLE_MATCH_URL = "https://api.apollo.io/api/v1/people/match";

function pickPhoneFromEntry(entry: unknown): string | null {
  if (typeof entry === "string" && entry.trim()) return entry.trim();
  if (!entry || typeof entry !== "object") return null;
  const o = entry as Record<string, unknown>;
  const sp = typeof o.sanitized_phone === "string" ? o.sanitized_phone.trim() : "";
  if (sp) return sp;
  const sn = typeof o.sanitized_number === "string" ? o.sanitized_number.trim() : "";
  if (sn) return sn;
  const raw = typeof o.raw_number === "string" ? o.raw_number.trim() : "";
  return raw || null;
}

function pickPhone(p: Record<string, unknown>): string | null {
  if (typeof p.sanitized_phone === "string" && p.sanitized_phone.trim()) {
    return p.sanitized_phone.trim();
  }
  const pn = p.phone_numbers;
  if (Array.isArray(pn) && pn.length) {
    for (const entry of pn) {
      const got = pickPhoneFromEntry(entry);
      if (got) return got;
    }
  }
  if (typeof p.phone === "string" && p.phone.trim()) return p.phone.trim();
  return null;
}

function orgNameFromPerson(p: Record<string, unknown>): string | null {
  const org = p.organization;
  if (!org || typeof org !== "object") return null;
  const n = (org as { name?: string }).name;
  return typeof n === "string" && n.trim() ? n.trim() : null;
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
    const firstName =
      typeof p.first_name === "string" && p.first_name.trim() ? p.first_name.trim() : null;
    const email =
      typeof p.email === "string" && p.email.includes("@") ? p.email : null;
    const linkedinUrl =
      typeof p.linkedin_url === "string"
        ? p.linkedin_url
        : typeof p.linkedin === "string"
          ? p.linkedin
          : null;
    const title = typeof p.title === "string" ? p.title : null;
    const hasEmail = typeof p.has_email === "boolean" ? p.has_email : null;
    const hasDirectPhone =
      typeof p.has_direct_phone === "string" && p.has_direct_phone.trim()
        ? p.has_direct_phone.trim()
        : null;
    const lastRefreshedAt =
      typeof p.last_refreshed_at === "string" && p.last_refreshed_at.trim()
        ? p.last_refreshed_at.trim()
        : null;
    const personCity = typeof p.city === "string" && p.city.trim() ? p.city.trim() : null;
    const personState = typeof p.state === "string" && p.state.trim() ? p.state.trim() : null;
    const personCountry =
      typeof p.country === "string" && p.country.trim() ? p.country.trim() : null;
    return {
      apolloPersonId,
      name,
      firstName,
      organizationName: orgNameFromPerson(p),
      hasEmail,
      hasDirectPhone,
      lastRefreshedAt,
      personCity,
      personState,
      personCountry,
      email,
      phone: pickPhone(p),
      linkedinUrl,
      title,
      source: "apollo" as const,
    };
  });

  return { ok: true, people };
}

function bestEmailFromContactEmails(
  ...objs: (Record<string, unknown> | null | undefined)[]
): string | null {
  type Cand = { email: string; verified: boolean };
  const cands: Cand[] = [];
  for (const obj of objs) {
    if (!obj) continue;
    const arr = obj.contact_emails;
    if (!Array.isArray(arr)) continue;
    for (const item of arr) {
      if (!item || typeof item !== "object") continue;
      const o = item as { email?: string; email_status?: string };
      const e = o.email;
      if (typeof e !== "string" || !e.includes("@")) continue;
      const st = typeof o.email_status === "string" ? o.email_status.toLowerCase() : "";
      cands.push({ email: e.trim(), verified: st === "verified" });
    }
  }
  const verified = cands.find((c) => c.verified);
  if (verified) return verified.email;
  return cands[0]?.email ?? null;
}

function enrichmentFromMatchJson(json: Record<string, unknown>): ApolloEnrichmentById {
  const empty: ApolloEnrichmentById = {
    email: null,
    phone: null,
    linkedinUrl: null,
    emailStatus: null,
    headline: null,
  };
  const person = json.person;
  if (!person || typeof person !== "object") {
    return empty;
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
      email = bestEmailFromContactEmails(p, contact);
    }
  } else if (!email) {
    email = bestEmailFromContactEmails(p);
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

  let emailStatus: string | null = null;
  if (typeof p.email_status === "string" && p.email_status.trim()) {
    emailStatus = p.email_status.trim();
  } else if (contact && typeof contact.email_status === "string" && contact.email_status.trim()) {
    emailStatus = contact.email_status.trim();
  }

  const headline =
    typeof p.headline === "string" && p.headline.trim()
      ? p.headline.trim()
      : contact && typeof contact.headline === "string" && contact.headline.trim()
        ? contact.headline.trim()
        : null;

  return { email, phone, linkedinUrl, emailStatus, headline };
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
  people: ApolloPersonEnrichDescriptor[]
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

  const deduped = new Map<string, ApolloPersonEnrichDescriptor>();
  for (const row of people) {
    const id = row.id.trim();
    if (!id || deduped.has(id)) continue;
    deduped.set(id, row);
  }
  if (deduped.size === 0) {
    return { ok: true, byId: {} };
  }

  const byId: Record<string, ApolloEnrichmentById> = {};
  let lastHttpError: string | null = null;

  for (const [id, desc] of deduped) {
    const params = new URLSearchParams();
    params.set("id", id);
    params.set("domain", dom);
    params.set("reveal_personal_emails", "true");
    const fn = desc.firstName?.trim();
    if (fn) params.set("first_name", fn);
    const org = desc.organizationName?.trim();
    if (org) params.set("organization_name", org);

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
