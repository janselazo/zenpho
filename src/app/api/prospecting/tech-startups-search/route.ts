import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  apolloSearchDecisionMakers,
  apolloSearchOrganizations,
} from "@/lib/integrations/apollo";
import {
  fingerprintSiteStack,
  type StackFingerprint,
} from "@/lib/crm/tech-stack-fingerprint";
import {
  computeTechFitScore,
  type TechFitScore,
} from "@/lib/crm/prospect-intel-tech-signals";
import type {
  ApolloPersonRow,
  TechStartupOrgFilters,
  TechStartupOrgRow,
} from "@/lib/crm/prospect-enrichment-types";

export const runtime = "nodejs";

const MAX_RESULTS = 25;
const MAX_FINGERPRINTS = 12;
const MAX_FOUNDER_LOOKUPS = 10;
const FOUNDER_TITLE_RE = /founder|co-?founder|ceo|cto|president|owner/i;

type TechStartupResult = {
  org: TechStartupOrgRow;
  stack: StackFingerprint;
  fit: TechFitScore;
  founders: ApolloPersonRow[];
};

type SearchBody = TechStartupOrgFilters & {
  limit?: number;
  /** When true, fetches founder people rows from Apollo per top domain. Costs credits. */
  includeFounders?: boolean;
  /** When true and `includeFounders` is true, the API only returns rows that have ≥1 founder. */
  linkedinFoundersOnly?: boolean;
};

function normalizeFilters(body: SearchBody): TechStartupOrgFilters {
  const take = <T>(xs: unknown): T[] =>
    Array.isArray(xs)
      ? (xs.filter((x): x is T => typeof x === "string" && (x as string).trim().length > 0) as T[])
      : [];
  return {
    keyword: typeof body.keyword === "string" ? body.keyword.trim() : undefined,
    organizationName:
      typeof body.organizationName === "string" ? body.organizationName.trim() : undefined,
    industries: take<string>(body.industries),
    locations: take<string>(body.locations),
    employeeRanges: take<string>(body.employeeRanges),
    fundingStages: take<string>(body.fundingStages),
    technologyUids: take<string>(body.technologyUids),
    page: typeof body.page === "number" ? body.page : 1,
  };
}

async function foundersForDomain(domain: string): Promise<ApolloPersonRow[]> {
  const res = await apolloSearchDecisionMakers(domain, 5).catch(() => null);
  if (!res || !res.ok) return [];
  return res.people.filter(
    (p) => p.linkedinUrl && p.title && FOUNDER_TITLE_RE.test(p.title)
  );
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized", results: [] }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "agency_admin" && profile?.role !== "agency_member") {
    return NextResponse.json({ error: "Forbidden", results: [] }, { status: 403 });
  }

  let body: SearchBody;
  try {
    body = (await req.json()) as SearchBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON", results: [] }, { status: 400 });
  }

  const filters = normalizeFilters(body);
  const hasFilter = Boolean(
    filters.keyword ||
      filters.organizationName ||
      (filters.industries && filters.industries.length) ||
      (filters.locations && filters.locations.length) ||
      (filters.employeeRanges && filters.employeeRanges.length) ||
      (filters.fundingStages && filters.fundingStages.length) ||
      (filters.technologyUids && filters.technologyUids.length)
  );
  if (!hasFilter) {
    return NextResponse.json(
      {
        error: "Add at least one filter (keyword, industry, employees, location, or stage).",
        results: [],
      },
      { status: 400 }
    );
  }

  const limit = Math.max(
    1,
    Math.min(MAX_RESULTS, typeof body.limit === "number" ? body.limit : MAX_RESULTS)
  );

  const apollo = await apolloSearchOrganizations(filters, limit);
  if (!apollo.ok) {
    return NextResponse.json(
      { results: [], warning: apollo.error },
      { status: 200 }
    );
  }

  const orgs = apollo.organizations;

  // Fingerprint top-N sites in parallel, best-effort.
  const fingerprintTargets = orgs.slice(0, MAX_FINGERPRINTS);
  const stackByIdx = await Promise.all(
    fingerprintTargets.map(async (o) => {
      const url = o.websiteUrl ?? (o.domain ? `https://${o.domain}` : null);
      if (!url) {
        return {
          kind: "unknown" as const,
          isNoCode: false,
          evidence: ["no website URL"],
          generator: null,
        };
      }
      try {
        return await fingerprintSiteStack(url);
      } catch {
        return {
          kind: "unknown" as const,
          isNoCode: false,
          evidence: ["fingerprint failed"],
          generator: null,
        };
      }
    })
  );

  const includeFounders = Boolean(body.includeFounders);
  const foundersByIdx: ApolloPersonRow[][] = [];
  if (includeFounders) {
    const targets = orgs.slice(0, MAX_FOUNDER_LOOKUPS);
    const res = await Promise.all(
      targets.map((o) => (o.domain ? foundersForDomain(o.domain) : Promise.resolve([])))
    );
    for (let i = 0; i < orgs.length; i++) {
      foundersByIdx.push(i < res.length ? res[i] : []);
    }
  }

  let results: TechStartupResult[] = orgs.map((o, idx) => {
    const stack: StackFingerprint =
      idx < stackByIdx.length
        ? stackByIdx[idx]
        : {
            kind: "unknown",
            isNoCode: false,
            evidence: ["not fingerprinted"],
            generator: null,
          };
    const founders = idx < foundersByIdx.length ? foundersByIdx[idx] : [];
    return {
      org: o,
      stack,
      fit: computeTechFitScore(o, stack),
      founders,
    };
  });

  if (includeFounders && body.linkedinFoundersOnly) {
    results = results.filter((r) => r.founders.length > 0);
  }

  results.sort((a, b) => b.fit.score - a.fit.score);

  return NextResponse.json({ results });
}
