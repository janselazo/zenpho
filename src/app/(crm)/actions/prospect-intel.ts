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
import { createLead } from "@/app/(crm)/actions/crm";

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

export type UrlResearchResult = {
  ok: true;
  url: string;
  pageTitle: string | null;
  metaDescription: string | null;
  https: boolean;
  report: ReturnType<typeof buildMarketIntelReport>;
  signals: IntelSignals;
};

export async function researchProspectFromUrl(
  rawUrl: string
): Promise<
  | UrlResearchResult
  | { ok: false; error: string }
> {
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
  };
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

export async function createLeadFromProspectIntelAction(input: {
  name: string;
  company?: string;
  email?: string;
  phone?: string;
  website?: string;
  notes: string;
  project_type: string;
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
  fd.set("source", "Prospecting — Research");
  fd.set("notes", notes);
  fd.set("project_type", input.project_type.trim());

  return createLead(fd);
}
