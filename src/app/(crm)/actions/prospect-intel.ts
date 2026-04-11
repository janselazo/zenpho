"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { buildMarketIntelReport, type IntelSignals } from "@/lib/crm/prospect-intel-report";
import {
  extractPageSignals,
  FETCH_TIMEOUT_MS,
  MAX_FETCH_BYTES,
  normalizeUrlForFetch,
} from "@/lib/crm/safe-url-fetch";
import {
  discoverContactPageUrls,
  extractProspectSocialUrls,
  extractPublicContactHints,
  mergeProspectSocialUrls,
  pageLabelFromUrl,
  rankEmailsUnique,
} from "@/lib/crm/prospect-contact-extract";
import type {
  ApolloPersonEnrichDescriptor,
  ApolloPersonRow,
  HunterEmailRow,
  MergedWebsiteContacts,
  OutscraperPlaceRow,
  PageContactHints,
  ProspectSocialUrls,
} from "@/lib/crm/prospect-enrichment-types";
import { assignProspectTagToLead, createLead } from "@/app/(crm)/actions/crm";
import { outscraperMapsSearch } from "@/lib/integrations/outscraper";
import { apolloSearchDecisionMakers, apolloEnrichPeopleById } from "@/lib/integrations/apollo";
import { hunterDomainSearch } from "@/lib/integrations/hunter";
import type { PlacesSearchPlace } from "@/lib/crm/places-types";
import { primaryPlaceTypeLabel } from "@/lib/crm/places-search-ui";
import { signalsFromPlace } from "@/lib/crm/prospect-intel-place-signals";
import { formatReportAsPlainNotes } from "@/lib/crm/prospect-intel-notes-format";

async function requireAgencyStaff() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" as const, supabase: null, user: null };
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  const role = profile?.role;
  if (role !== "agency_admin" && role !== "agency_member") {
    return { error: "Forbidden" as const, supabase: null, user: null };
  }
  return { error: null, supabase, user };
}

async function fetchHtmlSafe(url: string): Promise<{ ok: true; html: string } | { ok: false; error: string }> {
  const normalized = normalizeUrlForFetch(url);
  if (!normalized) return { ok: false, error: "Invalid or blocked URL." };
  let res: Response;
  try {
    res = await fetch(normalized, {
      redirect: "follow",
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      headers: {
        "User-Agent": "AgencyCRM-ProspectIntel/1.0",
        Accept: "text/html,application/xhtml+xml",
      },
    });
  } catch {
    return { ok: false, error: "Fetch failed (timeout or network)." };
  }
  if (!res.ok) return { ok: false, error: `HTTP ${res.status}` };
  const buf = await res.arrayBuffer();
  const slice = buf.byteLength > MAX_FETCH_BYTES ? buf.slice(0, MAX_FETCH_BYTES) : buf;
  const html = new TextDecoder("utf-8", { fatal: false }).decode(slice);
  return { ok: true, html };
}

export type HomepageContactHints = {
  emails: string[];
  phones: string[];
  founderName: string | null;
  socialUrls: ProspectSocialUrls;
};

export type UrlResearchResult = {
  ok: true;
  url: string;
  pageTitle: string | null;
  metaDescription: string | null;
  https: boolean;
  report: ReturnType<typeof buildMarketIntelReport>;
  signals: IntelSignals;
  homepageContactHints: HomepageContactHints;
};

export async function researchProspectFromUrl(
  rawUrl: string
): Promise<UrlResearchResult | { ok: false; error: string }> {
  const auth = await requireAgencyStaff();
  if (auth.error) return { ok: false, error: auth.error };

  const normalized = normalizeUrlForFetch(rawUrl);
  if (!normalized) {
    return { ok: false, error: "Invalid or blocked URL." };
  }

  let res: Response;
  try {
    res = await fetch(normalized, {
      redirect: "follow",
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      headers: {
        "User-Agent": "AgencyCRM-ProspectIntel/1.0",
        Accept: "text/html,application/xhtml+xml",
      },
    });
  } catch {
    return { ok: false, error: "Could not fetch URL (timeout or network error)." };
  }

  if (!res.ok) {
    return { ok: false, error: `HTTP ${res.status} when fetching page.` };
  }

  const buf = await res.arrayBuffer();
  const slice = buf.byteLength > MAX_FETCH_BYTES ? buf.slice(0, MAX_FETCH_BYTES) : buf;
  const html = new TextDecoder("utf-8", { fatal: false }).decode(slice);
  const { pageTitle, metaDescription } = extractPageSignals(html);
  const hints = extractPublicContactHints(html);
  const socialUrls = extractProspectSocialUrls(html, normalized);

  const urlObj = new URL(normalized);
  const https = urlObj.protocol === "https:";
  const signals: IntelSignals = {
    name: pageTitle || urlObj.hostname.replace(/^www\./, ""),
    hasWebsite: true,
    websiteUrl: normalized,
    https,
    pageTitle,
    metaDescription,
    rating: null,
    reviewCount: null,
    placeTypes: null,
    formattedAddress: null,
  };

  const report = buildMarketIntelReport(signals);
  return {
    ok: true,
    url: normalized,
    pageTitle,
    metaDescription,
    https,
    report,
    signals,
    homepageContactHints: { ...hints, socialUrls },
  };
}

const MAX_CONTACT_PAGES = 5;

export async function enrichWebsiteContactsDeepAction(
  rawUrl: string
): Promise<{ ok: true; contacts: MergedWebsiteContacts } | { ok: false; error: string }> {
  const auth = await requireAgencyStaff();
  if (auth.error) return { ok: false, error: auth.error };

  const root = normalizeUrlForFetch(rawUrl);
  if (!root) return { ok: false, error: "Invalid or blocked URL." };

  const first = await fetchHtmlSafe(root);
  if (!first.ok) return { ok: false, error: first.error };

  const byPage: PageContactHints[] = [];
  const h0 = extractPublicContactHints(first.html);
  let socialUrls = extractProspectSocialUrls(first.html, root);
  byPage.push({
    pageLabel: pageLabelFromUrl(root, root),
    url: root,
    emails: h0.emails,
    phones: h0.phones,
    founderName: h0.founderName,
  });

  const extra = discoverContactPageUrls(first.html, root, MAX_CONTACT_PAGES);
  const extraResults = await Promise.allSettled(extra.map((u) => fetchHtmlSafe(u)));
  for (let i = 0; i < extra.length; i++) {
    const result = extraResults[i];
    if (result.status !== "fulfilled" || !result.value.ok) continue;
    const pg = result.value;
    const u = extra[i];
    const hx = extractPublicContactHints(pg.html);
    socialUrls = mergeProspectSocialUrls(socialUrls, extractProspectSocialUrls(pg.html, u));
    byPage.push({
      pageLabel: pageLabelFromUrl(u, root),
      url: u,
      emails: hx.emails,
      phones: hx.phones,
      founderName: hx.founderName,
    });
  }

  const allEmails = byPage.flatMap((p) => p.emails);
  const allPhones = new Set<string>();
  byPage.forEach((p) => p.phones.forEach((ph) => allPhones.add(ph)));
  let founderName: string | null = null;
  for (const p of byPage) {
    if (p.founderName) {
      founderName = p.founderName;
      break;
    }
  }

  return {
    ok: true,
    contacts: {
      byPage,
      emailsRanked: rankEmailsUnique(allEmails),
      phones: [...allPhones],
      founderName,
      socialUrls,
    },
  };
}

export async function outscraperProspectSearchAction(
  query: string
): Promise<{ ok: true; rows: OutscraperPlaceRow[] } | { ok: false; error: string }> {
  const auth = await requireAgencyStaff();
  if (auth.error) return { ok: false, error: auth.error };
  return outscraperMapsSearch(query, 10);
}

export async function apolloProspectPeopleAction(
  domain: string
): Promise<{ ok: true; people: ApolloPersonRow[] } | { ok: false; error: string }> {
  const auth = await requireAgencyStaff();
  if (auth.error) return { ok: false, error: auth.error };
  return apolloSearchDecisionMakers(domain, 5);
}

/** People Enrichment after search — email / LinkedIn / phone when Apollo returns them (uses credits). */
export async function apolloEnrichProspectPeopleAction(
  domain: string,
  people: ApolloPersonEnrichDescriptor[]
): ReturnType<typeof apolloEnrichPeopleById> {
  const auth = await requireAgencyStaff();
  if (auth.error) return { ok: false, error: auth.error };
  return apolloEnrichPeopleById(domain, people);
}

export async function hunterProspectDomainAction(
  domain: string,
  knownEmails: string[]
): Promise<{ ok: true; emails: HunterEmailRow[] } | { ok: false; error: string }> {
  const auth = await requireAgencyStaff();
  if (auth.error) return { ok: false, error: auth.error };
  const ex = new Set(knownEmails.map((e) => e.trim().toLowerCase()).filter(Boolean));
  return hunterDomainSearch(domain, ex, 15);
}

export async function saveProspectIntelReportAction(payload: Record<string, unknown>) {
  const auth = await requireAgencyStaff();
  if (auth.error || !auth.user || !auth.supabase) {
    return { error: auth.error ?? "Unauthorized" };
  }

  const { data, error } = await auth.supabase
    .from("prospect_intel_report")
    .insert({
      user_id: auth.user.id,
      payload: payload as never,
      lead_id: null,
    })
    .select("id")
    .single();

  if (error) {
    if (error.message.includes("does not exist") || error.code === "42P01") {
      return {
        error:
          "Reports table not installed. Apply migration supabase/migrations/20260403120000_prospect_intel_report.sql.",
      };
    }
    return { error: error.message };
  }

  revalidatePath("/prospecting/prospects");
  return { ok: true as const, id: data.id as string };
}

/** Create a CRM lead from a Google Places row (same notes/tag path as the full Prospects form). */
export async function createLeadFromPlacesListingAction(
  place: PlacesSearchPlace,
  project_type: string
) {
  const auth = await requireAgencyStaff();
  if (auth.error) return { error: auth.error };

  const normalized: PlacesSearchPlace = {
    ...place,
    businessStatus: place.businessStatus ?? null,
  };
  const report = buildMarketIntelReport(signalsFromPlace(normalized));
  const listingPhone =
    normalized.nationalPhoneNumber?.trim() ||
    normalized.internationalPhoneNumber?.trim() ||
    "";
  const contactLines: string[] = [];
  if (listingPhone) contactLines.push(`Google listing phone: ${listingPhone}`);
  const maps = normalized.googleMapsUri?.trim();
  if (maps) contactLines.push(`Google Maps: ${maps}`);
  const extra = [normalized.formattedAddress, normalized.websiteUri].filter(Boolean).join("\n");
  const notes = formatReportAsPlainNotes(
    report,
    extra || undefined,
    contactLines.join("\n") || undefined
  );

  return createLeadFromProspectIntelAction({
    name: normalized.name.trim() || "Unknown",
    company: normalized.name.trim() || undefined,
    phone: listingPhone || undefined,
    email: undefined,
    website: normalized.websiteUri?.trim() || undefined,
    notes,
    project_type,
    google_business_category: primaryPlaceTypeLabel(normalized.types),
    google_place_types:
      normalized.types.length > 0 ? [...normalized.types] : undefined,
  });
}

export async function createLeadFromProspectIntelAction(input: {
  name: string;
  company?: string;
  email?: string;
  phone?: string;
  website?: string;
  facebook?: string;
  instagram?: string;
  notes: string;
  project_type: string;
  google_business_category?: string;
  google_place_types?: string[];
}) {
  const auth = await requireAgencyStaff();
  if (auth.error) return { error: auth.error };

  let notes = input.notes.trim();
  const web = input.website?.trim();
  if (web && !notes.includes(web)) {
    notes = notes ? `${notes}\n\nWebsite: ${web}` : `Website: ${web}`;
  }

  const fd = new FormData();
  fd.set("name", input.name.trim());
  if (input.company?.trim()) fd.set("company", input.company.trim());
  if (input.email?.trim()) fd.set("email", input.email.trim());
  if (input.phone?.trim()) fd.set("phone", input.phone.trim());
  if (input.facebook?.trim()) fd.set("facebook", input.facebook.trim());
  if (input.instagram?.trim()) fd.set("instagram", input.instagram.trim());
  if (input.google_business_category?.trim()) {
    fd.set("google_business_category", input.google_business_category.trim());
  }
  if (input.google_place_types?.length) {
    fd.set("google_place_types_json", JSON.stringify(input.google_place_types));
  }
  fd.set("source", "Prospects");
  fd.set("notes", notes);
  fd.set("project_type", input.project_type.trim());

  const res = await createLead(fd);
  if ("error" in res && res.error) return res;
  if ("id" in res && typeof res.id === "string") {
    const tagRes = await assignProspectTagToLead(res.id);
    if (tagRes && "error" in tagRes) {
      console.error("assignProspectTagToLead:", tagRes.error);
    }
  }
  revalidatePath("/prospecting/prospects");
  return res;
}
