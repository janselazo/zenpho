import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  apolloSearchDecisionMakers,
  apolloSearchOrganizations,
} from "@/lib/integrations/apollo";
import {
  fingerprintEcomPlatform,
  type EcomPlatform,
  type EcomPlatformFingerprint,
} from "@/lib/crm/ecom-platform-fingerprint";
import { computeEcomFitScore, type EcomFitScore } from "@/lib/crm/prospect-intel-ecom-signals";
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

const APOLLO_PRE_FILTER_PLATFORMS: ReadonlySet<EcomPlatform> = new Set([
  "shopify",
  "woocommerce",
  "magento",
  "bigcommerce",
]);

const ALL_KNOWN_PLATFORMS: ReadonlySet<EcomPlatform> = new Set([
  "shopify",
  "woocommerce",
  "magento",
  "bigcommerce",
  "wix_stores",
  "squarespace_commerce",
  "other",
  "unknown",
]);

export type EcomBrandResult = {
  org: TechStartupOrgRow;
  platform: EcomPlatform;
  evidence: string[];
  fit: EcomFitScore;
  founders: ApolloPersonRow[];
};

type SearchBody = Omit<TechStartupOrgFilters, "technologyUids"> & {
  /** Platforms the user wants to find. Drives Apollo's tech filter and post-fingerprint filtering. */
  platforms?: EcomPlatform[];
  limit?: number;
  /** When true, fetches founder people rows from Apollo per top domain. Costs credits. */
  includeFounders?: boolean;
  /** When true and `includeFounders` is true, the API only returns rows that have ≥1 founder. */
  linkedinFoundersOnly?: boolean;
};

function takeStrings(xs: unknown): string[] {
  return Array.isArray(xs)
    ? xs.filter((x): x is string => typeof x === "string" && x.trim().length > 0)
    : [];
}

function normalizePlatforms(xs: unknown): EcomPlatform[] {
  return takeStrings(xs).filter((x): x is EcomPlatform =>
    ALL_KNOWN_PLATFORMS.has(x as EcomPlatform)
  );
}

function normalizeFilters(
  body: SearchBody,
  platforms: EcomPlatform[]
): TechStartupOrgFilters {
  const apolloUids = platforms.filter((p) => APOLLO_PRE_FILTER_PLATFORMS.has(p));
  return {
    keyword: typeof body.keyword === "string" ? body.keyword.trim() : undefined,
    organizationName:
      typeof body.organizationName === "string" ? body.organizationName.trim() : undefined,
    industries: takeStrings(body.industries),
    locations: takeStrings(body.locations),
    employeeRanges: takeStrings(body.employeeRanges),
    fundingStages: takeStrings(body.fundingStages),
    technologyUids: apolloUids.length ? apolloUids : undefined,
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

  const requestedPlatforms = normalizePlatforms(body.platforms);
  const platforms = requestedPlatforms.length
    ? requestedPlatforms
    : (["shopify", "woocommerce", "magento", "bigcommerce"] as EcomPlatform[]);

  const filters = normalizeFilters(body, platforms);
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
        error:
          "Add at least one filter (keyword, industry, employees, location, stage, or platform).",
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
    return NextResponse.json({ results: [], warning: apollo.error }, { status: 200 });
  }

  const orgs = apollo.organizations;

  const fingerprintTargets = orgs.slice(0, MAX_FINGERPRINTS);
  const fingerprintsByIdx: EcomPlatformFingerprint[] = await Promise.all(
    fingerprintTargets.map(async (o) => {
      const url = o.websiteUrl ?? (o.domain ? `https://${o.domain}` : null);
      if (!url) {
        return {
          platform: "unknown" as const,
          isVerifiedEcom: false,
          evidence: ["no website URL"],
          generator: null,
        };
      }
      try {
        return await fingerprintEcomPlatform(url);
      } catch {
        return {
          platform: "unknown" as const,
          isVerifiedEcom: false,
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

  const platformSet = new Set(platforms);
  let results: EcomBrandResult[] = orgs.map((o, idx) => {
    const fp: EcomPlatformFingerprint =
      idx < fingerprintsByIdx.length
        ? fingerprintsByIdx[idx]
        : {
            platform: "unknown",
            isVerifiedEcom: false,
            evidence: ["not fingerprinted"],
            generator: null,
          };
    const founders = idx < foundersByIdx.length ? foundersByIdx[idx] : [];
    return {
      org: o,
      platform: fp.platform,
      evidence: fp.evidence,
      fit: computeEcomFitScore(o, fp),
      founders,
    };
  });

  // Keep rows whose confirmed platform matches the requested set, plus rows that were
  // fingerprinted as `unknown` (e.g. fetch was blocked) so Apollo's pre-filter still
  // surfaces them — the UI shows the platform pill so the operator can filter visually.
  if (platformSet.size > 0) {
    results = results.filter(
      (r) => platformSet.has(r.platform) || r.platform === "unknown"
    );
  }

  if (includeFounders && body.linkedinFoundersOnly) {
    results = results.filter((r) => r.founders.length > 0);
  }

  results.sort((a, b) => b.fit.score - a.fit.score);

  return NextResponse.json({ results });
}
