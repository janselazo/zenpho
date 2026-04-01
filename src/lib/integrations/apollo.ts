import type { ApolloPersonRow } from "@/lib/crm/prospect-enrichment-types";

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

/**
 * People at organization by domain. Requires APOLLO_API_KEY.
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

  const body = {
    page: 1,
    per_page: Math.min(10, Math.max(1, limit)),
    q_organization_domains: dom,
    person_titles: [
      "owner",
      "founder",
      "ceo",
      "president",
      "general manager",
      "managing director",
      "partner",
      "principal",
    ],
  };

  let res: Response;
  try {
    res = await fetch("https://api.apollo.io/v1/people/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache",
        "X-Api-Key": key,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(45_000),
    });
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Apollo request failed." };
  }

  const text = await res.text();
  if (!res.ok) {
    return { ok: false, error: `Apollo HTTP ${res.status}: ${text.slice(0, 240)}` };
  }

  let json: { people?: Record<string, unknown>[] };
  try {
    json = JSON.parse(text) as { people?: Record<string, unknown>[] };
  } catch {
    return { ok: false, error: "Apollo returned invalid JSON." };
  }

  const raw = json.people ?? [];
  const people: ApolloPersonRow[] = raw.slice(0, limit).map((p) => {
    const fn = typeof p.first_name === "string" ? p.first_name : "";
    const ln = typeof p.last_name === "string" ? p.last_name : "";
    const name = `${fn} ${ln}`.trim() || (typeof p.name === "string" ? p.name : "Unknown");
    const email = typeof p.email === "string" && p.email.includes("@") ? p.email : null;
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
