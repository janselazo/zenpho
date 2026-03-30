"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  isIndustryId,
  isNicheId,
  nicheAllowedForIndustry,
  type IndustryId,
  type LeadMagnetFormat,
  type LeadMagnetIdea,
  type NicheId,
} from "@/lib/crm/lead-magnet-industries";

export type SavedLeadMagnetRow = {
  id: string;
  user_id: string;
  industry_id: string;
  niche_id: string;
  title: string;
  description: string;
  format: string;
  angle: string | null;
  source: "generated" | "manual";
  created_at: string;
};

const FORMATS = new Set<LeadMagnetFormat>([
  "Calculator",
  "Template",
  "Assessment",
  "Toolkit",
  "Other",
]);

function isLeadMagnetFormat(v: string): v is LeadMagnetFormat {
  return FORMATS.has(v as LeadMagnetFormat);
}

async function requireAgencyUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null as null, error: "Unauthorized" as const };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "agency_admin" && profile?.role !== "agency_member") {
    return { supabase, user: null as null, error: "Forbidden" as const };
  }

  return { supabase, user, error: null as null };
}

function validateIndustryNiche(industryId: string, nicheId: string): string | null {
  if (!isIndustryId(industryId)) return "Invalid industry.";
  if (!isNicheId(nicheId)) return "Invalid niche.";
  if (!nicheAllowedForIndustry(nicheId, industryId as IndustryId))
    return "Niche does not apply to this industry.";
  return null;
}

export async function listSavedLeadMagnets(): Promise<
  | { ok: true; items: SavedLeadMagnetRow[] }
  | { ok: false; error: string; items: [] }
> {
  const gate = await requireAgencyUser();
  if (gate.error || !gate.user) {
    return { ok: false, error: gate.error ?? "Unauthorized", items: [] };
  }

  const { data, error } = await gate.supabase
    .from("saved_lead_magnet")
    .select(
      "id, user_id, industry_id, niche_id, title, description, format, angle, source, created_at"
    )
    .eq("user_id", gate.user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return { ok: false, error: error.message, items: [] };
  }

  const items = (data ?? []) as SavedLeadMagnetRow[];
  return { ok: true, items };
}

export async function saveLeadMagnetFromIdea(input: {
  industryId: IndustryId;
  nicheId: NicheId;
  idea: LeadMagnetIdea;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const gate = await requireAgencyUser();
  if (gate.error || !gate.user) {
    return { ok: false, error: gate.error ?? "Unauthorized" };
  }

  const v = validateIndustryNiche(input.industryId, input.nicheId);
  if (v) return { ok: false, error: v };

  const title = input.idea.title.trim();
  const description = input.idea.description.trim();
  if (!title || title.length > 500) return { ok: false, error: "Invalid title." };
  if (!description || description.length > 8000)
    return { ok: false, error: "Invalid description." };
  if (!isLeadMagnetFormat(input.idea.format))
    return { ok: false, error: "Invalid format." };

  const angle = input.idea.angle?.trim() ?? "";
  const angleOut = angle.length > 0 ? angle.slice(0, 2000) : null;

  const { error } = await gate.supabase.from("saved_lead_magnet").insert({
    user_id: gate.user.id,
    industry_id: input.industryId,
    niche_id: input.nicheId,
    title,
    description,
    format: input.idea.format,
    angle: angleOut,
    source: "generated",
  });

  if (error) return { ok: false, error: error.message };
  revalidatePath("/lead-magnets");
  return { ok: true };
}

export async function addManualSavedLeadMagnet(input: {
  industryId: IndustryId;
  nicheId: NicheId;
  title: string;
  description: string;
  format: LeadMagnetFormat;
  angle?: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const gate = await requireAgencyUser();
  if (gate.error || !gate.user) {
    return { ok: false, error: gate.error ?? "Unauthorized" };
  }

  const v = validateIndustryNiche(input.industryId, input.nicheId);
  if (v) return { ok: false, error: v };

  const title = input.title.trim();
  const description = input.description.trim();
  if (!title || title.length > 500) return { ok: false, error: "Title is required." };
  if (!description || description.length > 8000)
    return { ok: false, error: "Description is required." };
  if (!isLeadMagnetFormat(input.format))
    return { ok: false, error: "Invalid format." };

  const angleRaw = (input.angle ?? "").trim();
  const angleOut = angleRaw.length > 0 ? angleRaw.slice(0, 2000) : null;

  const { error } = await gate.supabase.from("saved_lead_magnet").insert({
    user_id: gate.user.id,
    industry_id: input.industryId,
    niche_id: input.nicheId,
    title,
    description,
    format: input.format,
    angle: angleOut,
    source: "manual",
  });

  if (error) return { ok: false, error: error.message };
  revalidatePath("/lead-magnets");
  return { ok: true };
}

export async function deleteSavedLeadMagnet(
  id: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const gate = await requireAgencyUser();
  if (gate.error || !gate.user) {
    return { ok: false, error: gate.error ?? "Unauthorized" };
  }

  const uuid = id.trim();
  if (!uuid || uuid.length > 64) return { ok: false, error: "Invalid id." };

  const { data, error } = await gate.supabase
    .from("saved_lead_magnet")
    .delete()
    .eq("id", uuid)
    .eq("user_id", gate.user.id)
    .select("id");

  if (error) return { ok: false, error: error.message };
  if (!data?.length) return { ok: false, error: "Not found." };
  revalidatePath("/lead-magnets");
  return { ok: true };
}
