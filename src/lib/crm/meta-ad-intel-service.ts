import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  decodeFetchedHtmlBuffer,
  normalizeUrlForFetch,
} from "@/lib/crm/safe-url-fetch";
import {
  classifyMetaAdSignal,
  fetchMetaAdLibrary,
  outreachAngleForSignal,
} from "@/lib/crm/meta-ad-library";
import { resolveMetaPageId } from "@/lib/crm/meta-page-resolver";
import { detectMetaPixel } from "@/lib/crm/meta-pixel-detect";
import type {
  MetaAdCreative,
  MetaAdIntelInput,
  MetaAdIntelResponse,
  MetaPixelResult,
} from "@/lib/crm/meta-ad-intel-types";
import { isInternalStaffRole } from "@/lib/crm/roles";
import { createClient } from "@/lib/supabase/server";
import { fetchCurrentOrganizationId } from "@/lib/organization";

type LeadContext = {
  id: string;
  name: string | null;
  company: string | null;
  website: string | null;
  facebook: string | null;
  organization_id: string | null;
};

type AuthContext = {
  supabase: SupabaseClient;
  userId: string;
  email: string | null;
  organizationId: string | null;
};

async function requireStaff(): Promise<
  | { ok: true; auth: AuthContext }
  | { ok: false; response: NextResponse }
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  const [{ data: profile }, organizationId] = await Promise.all([
    supabase.from("profiles").select("role").eq("id", user.id).maybeSingle(),
    fetchCurrentOrganizationId(supabase),
  ]);

  if (!isInternalStaffRole(profile?.role, user.email)) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  return {
    ok: true,
    auth: {
      supabase,
      userId: user.id,
      email: user.email ?? null,
      organizationId,
    },
  };
}

function emptyPixel(): MetaPixelResult {
  return { detected: false, pixelIds: [] };
}

function cleanString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function parseInput(raw: unknown): MetaAdIntelInput {
  const body =
    raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  return {
    prospectId: cleanString(body.prospectId),
    websiteUrl: cleanString(body.websiteUrl),
    facebookUrl: cleanString(body.facebookUrl),
    businessName: cleanString(body.businessName),
  };
}

async function loadLeadContext(
  supabase: SupabaseClient,
  prospectId: string | undefined,
): Promise<LeadContext | null> {
  if (!prospectId) return null;
  const { data, error } = await supabase
    .from("lead")
    .select("id, name, company, website, facebook, organization_id")
    .eq("id", prospectId)
    .maybeSingle();
  if (error || !data) return null;
  return data as LeadContext;
}

async function fetchWebsiteHtml(websiteUrl: string | undefined): Promise<{
  html: string | null;
  normalizedUrl: string | null;
  warning: string | null;
}> {
  if (!websiteUrl) return { html: null, normalizedUrl: null, warning: null };
  const normalizedUrl = normalizeUrlForFetch(websiteUrl);
  if (!normalizedUrl) {
    return {
      html: null,
      normalizedUrl: null,
      warning: "Website URL was not safe to fetch.",
    };
  }

  try {
    const res = await fetch(normalizedUrl, {
      headers: {
        Accept: "text/html,application/xhtml+xml",
        "User-Agent":
          "Mozilla/5.0 (compatible; ZenphoMetaAdIntel/1.0; +https://zenpho.com)",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) {
      return {
        html: null,
        normalizedUrl,
        warning: `Website fetch failed with status ${res.status}.`,
      };
    }
    const contentType = res.headers.get("content-type") ?? "";
    if (contentType && !contentType.toLowerCase().includes("text/html")) {
      return {
        html: null,
        normalizedUrl,
        warning: "Website response was not HTML.",
      };
    }
    return {
      html: decodeFetchedHtmlBuffer(await res.arrayBuffer()),
      normalizedUrl,
      warning: null,
    };
  } catch (error) {
    return {
      html: null,
      normalizedUrl,
      warning: error instanceof Error ? error.message : "Website fetch failed.",
    };
  }
}

async function persistIntel(input: {
  supabase: SupabaseClient;
  organizationId: string | null;
  userId: string;
  prospectId: string | null;
  websiteUrl: string | null;
  facebookUrl: string | null;
  pageId: string | null;
  signal: string;
  adCount: number;
  oldestAdDaysActive: number | null;
  platforms: string[];
  sampleCreatives: MetaAdCreative[];
  pixel: MetaPixelResult;
  outreachAngle: string;
}): Promise<string | null> {
  if (!input.organizationId) return null;

  const { data, error } = await input.supabase
    .from("prospect_ad_intel")
    .insert({
      organization_id: input.organizationId,
      user_id: input.userId,
      prospect_id: input.prospectId,
      website_url: input.websiteUrl,
      facebook_url: input.facebookUrl,
      page_id: input.pageId,
      signal: input.signal,
      ad_count: input.adCount,
      oldest_ad_days_active: input.oldestAdDaysActive,
      platforms: input.platforms,
      sample_creatives: input.sampleCreatives,
      pixel_detected: input.pixel.detected,
      pixel_ids: input.pixel.pixelIds,
      outreach_angle: input.outreachAngle,
    })
    .select("id")
    .single();

  if (error) {
    console.warn("[metaAdIntel] persistence failed:", error.message);
    return null;
  }

  return typeof data?.id === "string" ? data.id : null;
}

export async function handleMetaAdIntelRequest(req: Request): Promise<NextResponse> {
  const staff = await requireStaff();
  if (!staff.ok) return staff.response;

  let input: MetaAdIntelInput;
  try {
    input = parseInput(await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const lead = await loadLeadContext(staff.auth.supabase, input.prospectId);
  const websiteUrl = input.websiteUrl ?? lead?.website ?? undefined;
  const facebookUrl = input.facebookUrl ?? lead?.facebook ?? undefined;
  const businessName =
    input.businessName ?? lead?.company ?? lead?.name ?? undefined;

  if (!websiteUrl && !facebookUrl && !businessName) {
    return NextResponse.json(
      { error: "Provide a website URL, Facebook URL, business name, or prospectId." },
      { status: 400 },
    );
  }

  const warnings: string[] = [];
  const website = await fetchWebsiteHtml(websiteUrl);
  if (website.warning) warnings.push(website.warning);
  const pixel = website.html ? detectMetaPixel(website.html) : emptyPixel();

  let pageId: string | null = null;
  if (facebookUrl) {
    const page = await resolveMetaPageId(staff.auth.supabase, facebookUrl);
    if (page.ok) {
      pageId = page.pageId;
    } else {
      warnings.push(page.error);
    }
  }

  let adCount = 0;
  let oldestAdDaysActive: number | null = null;
  let platforms: string[] = [];
  let sampleCreatives: MetaAdCreative[] = [];
  let adQueryAttempted = false;

  if (pageId) {
    const ads = await fetchMetaAdLibrary(pageId);
    adQueryAttempted = ads.ok || !ads.missingToken;
    if (ads.ok) {
      adCount = ads.adCount;
      oldestAdDaysActive = ads.oldestAdDaysActive;
      platforms = ads.platforms;
      sampleCreatives = ads.sampleCreatives;
    } else {
      warnings.push(ads.error);
    }
  }

  const signal = classifyMetaAdSignal({
    pageId,
    adCount,
    pixelDetected: pixel.detected,
    adQueryAttempted,
  });
  const outreachAngle = outreachAngleForSignal(signal);
  const organizationId = lead?.organization_id ?? staff.auth.organizationId;
  const prospectAdIntelId = await persistIntel({
    supabase: staff.auth.supabase,
    organizationId,
    userId: staff.auth.userId,
    prospectId: lead?.id ?? input.prospectId ?? null,
    websiteUrl: website.normalizedUrl ?? websiteUrl ?? null,
    facebookUrl: facebookUrl ?? null,
    pageId,
    signal,
    adCount,
    oldestAdDaysActive,
    platforms,
    sampleCreatives,
    pixel,
    outreachAngle,
  });

  const response: MetaAdIntelResponse = {
    pageId,
    signal,
    adCount,
    oldestAdDaysActive,
    platforms,
    sampleCreatives,
    pixel,
    outreachAngle,
    prospectAdIntelId,
    warning: warnings.length ? warnings.join(" ") : undefined,
  };

  return NextResponse.json(response);
}
