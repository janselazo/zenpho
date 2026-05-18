import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  decodeFetchedHtmlBuffer,
  normalizeUrlForFetch,
} from "@/lib/crm/safe-url-fetch";
import {
  classifyMetaAdSignal,
  fetchMetaAdLibrary,
  fetchMetaAdLibraryBySearchTerms,
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

function decodeCommonHtmlEntities(value: string): string {
  return value
    .replace(/\\u002[fF]/g, "/")
    .replace(/\\u003[aA]/g, ":")
    .replace(/\\u0026/g, "&")
    .replace(/\\u003[dD]/g, "=")
    .replace(/\\x2[fF]/g, "/")
    .replace(/\\x3[aA]/g, ":")
    .replace(/\\x26/g, "&")
    .replace(/\\x3[dD]/g, "=")
    .replace(/\\\//g, "/")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#34;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x2F;/gi, "/")
    .replace(/&#47;/g, "/");
}

function unwrapFacebookRedirectUrl(url: URL): string | null {
  const host = url.hostname.replace(/^www\./i, "").toLowerCase();
  if (host === "l.facebook.com" || host === "lm.facebook.com") {
    return url.searchParams.get("u") || url.searchParams.get("url");
  }
  if (host === "facebook.com" || host === "fb.com") {
    const embedded = url.searchParams.get("href") || url.searchParams.get("u");
    if (embedded && /(?:facebook\.com|fb\.com)\//i.test(embedded)) {
      return embedded;
    }
  }
  return null;
}

function normalizeDiscoveredFacebookUrl(raw: string): string | null {
  const cleaned = decodeCommonHtmlEntities(raw)
    .replace(/^["']+|["')\]}>,.]+$/g, "")
    .trim();
  const pageId = cleaned.match(/^fb:\/\/page\/(\d{5,})/i)?.[1];
  if (pageId) return pageId;

  if (/%(?:2f|3a|3d|26)/i.test(cleaned)) {
    try {
      const decoded = decodeURIComponent(cleaned);
      if (decoded !== cleaned) {
        return normalizeDiscoveredFacebookUrl(decoded);
      }
    } catch {
      /* keep trying the original value */
    }
  }

  const withScheme = cleaned.startsWith("//") ? `https:${cleaned}` : cleaned;
  try {
    const url = new URL(withScheme);
    const unwrapped = unwrapFacebookRedirectUrl(url);
    if (unwrapped && unwrapped !== cleaned) {
      return normalizeDiscoveredFacebookUrl(unwrapped);
    }

    const host = url.hostname.replace(/^www\./i, "").toLowerCase();
    const facebookHosts = new Set([
      "facebook.com",
      "m.facebook.com",
      "mobile.facebook.com",
      "mbasic.facebook.com",
      "web.facebook.com",
      "business.facebook.com",
      "fb.com",
    ]);
    if (!facebookHosts.has(host)) return null;
    if (
      /(^|\/)(sharer|share\.php|dialog|plugins|tr|events|groups|marketplace|login)(\/|$|\?)/i.test(
        url.pathname,
      )
    ) {
      return null;
    }
    if (!url.pathname || url.pathname === "/") return null;
    url.hash = "";
    if (host !== "facebook.com" && host !== "fb.com") {
      url.hostname = "www.facebook.com";
    }
    return url.toString();
  } catch {
    return null;
  }
}

function pushFacebookCandidatesFromUnknown(value: unknown, out: string[]): void {
  if (typeof value === "string") {
    if (/fb:\/\/page\/\d{5,}/i.test(value) || /(?:facebook\.com|fb\.com)\//i.test(value)) {
      out.push(value);
    }
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) pushFacebookCandidatesFromUnknown(item, out);
    return;
  }
  if (value && typeof value === "object") {
    for (const entry of Object.values(value as Record<string, unknown>)) {
      pushFacebookCandidatesFromUnknown(entry, out);
    }
  }
}

function extractJsonLdFacebookCandidates(html: string): string[] {
  const out: string[] = [];
  for (const match of html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      pushFacebookCandidatesFromUnknown(JSON.parse(match[1].trim()), out);
    } catch {
      /* ignore invalid JSON-LD */
    }
  }
  return out;
}

function extractFacebookUrlFromWebsiteHtml(html: string): string | null {
  const decoded = decodeCommonHtmlEntities(html);
  const candidates: string[] = [];

  for (const match of decoded.matchAll(/fb:\/\/page\/\d{5,}/gi)) {
    candidates.push(match[0]);
  }
  for (const match of decoded.matchAll(/(?:href|src|data-href|data-src|data-url|data-share-url|content|itemprop)=["']((?:https?:)?\/\/[^"']*(?:facebook\.com|fb\.com)\/[^"']+)["']/gi)) {
    candidates.push(match[1]);
  }
  for (const match of decoded.matchAll(/https?%3A%2F%2F(?:www(?:%2E|\.)|m(?:%2E|\.)|mobile(?:%2E|\.)|mbasic(?:%2E|\.)|web(?:%2E|\.)|business(?:%2E|\.))?(?:facebook(?:%2E|\.)com|fb(?:%2E|\.)com)%2F[^"'\s<>]+/gi)) {
    candidates.push(match[0]);
  }
  for (const match of decoded.matchAll(/(?:sameAs|facebook|facebookUrl|facebook_url|profileUrl|profile_url)["']?\s*[:=]\s*["']((?:https?:)?\/\/[^"']*(?:facebook\.com|fb\.com)\/[^"']+)["']/gi)) {
    candidates.push(match[1]);
  }
  for (const match of decoded.matchAll(/https?:\/\/(?:l\.facebook\.com|lm\.facebook\.com)\/l\.php\?[^"'\s<>]+/gi)) {
    candidates.push(match[0]);
  }
  for (const match of decoded.matchAll(/https?:\/\/(?:www\.)?facebook\.com\/plugins\/page\.php\?[^"'\s<>]+/gi)) {
    candidates.push(match[0]);
  }
  for (const match of decoded.matchAll(/(?:https?:)?\/\/(?:www\.|m\.|mobile\.|mbasic\.|web\.|business\.)?(?:facebook\.com|fb\.com)\/[^\s"'<>\\]+/gi)) {
    candidates.push(match[0]);
  }

  candidates.push(...extractJsonLdFacebookCandidates(decoded));

  const seen = new Set<string>();
  const uniqueCandidates = candidates.filter((candidate) => {
    const key = candidate.trim();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const ranked = uniqueCandidates.sort((a, b) => {
    const score = (value: string) => {
      let n = 0;
      if (/fb:\/\/page\/\d+/i.test(value)) n -= 20;
      if (/(?:href|sameAs|facebookUrl|facebook_url)/i.test(value)) n -= 5;
      if (/plugins\/page\.php/i.test(value)) n += 3;
      if (/l\.facebook\.com|lm\.facebook\.com/i.test(value)) n += 5;
      return n;
    };
    return score(a) - score(b);
  });

  for (const candidate of ranked) {
    const normalized = normalizeDiscoveredFacebookUrl(candidate);
    if (normalized) return normalized;
  }

  return null;
}

function searchTermsForAdLibrary(
  businessName: string | undefined,
  discoveredFacebookUrl: string | null,
): string | null {
  const cleanedBusinessName = businessName?.replace(/\s+/g, " ").trim();
  if (cleanedBusinessName && cleanedBusinessName.length >= 3) {
    return cleanedBusinessName;
  }

  if (!discoveredFacebookUrl || /^\d{5,}$/.test(discoveredFacebookUrl)) {
    return null;
  }

  try {
    const url = new URL(discoveredFacebookUrl);
    const handle = url.pathname.split("/").filter(Boolean)[0];
    return handle && handle.length >= 3 ? handle : null;
  } catch {
    return null;
  }
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
  const discoveredFacebookUrl =
    facebookUrl ?? (website.html ? extractFacebookUrlFromWebsiteHtml(website.html) : null);
  if (!facebookUrl && discoveredFacebookUrl) {
    console.info("[metaAdIntel] discovered Facebook URL from website HTML");
  }

  let pageId: string | null = null;
  if (discoveredFacebookUrl && /^\d{5,}$/.test(discoveredFacebookUrl.trim())) {
    const page = await resolveMetaPageId(staff.auth.supabase, discoveredFacebookUrl);
    if (page.ok) pageId = page.pageId;
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
  } else {
    const searchTerms = searchTermsForAdLibrary(businessName, discoveredFacebookUrl);
    if (searchTerms) {
      const ads = await fetchMetaAdLibraryBySearchTerms(searchTerms);
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
    facebookUrl: discoveredFacebookUrl ?? null,
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
