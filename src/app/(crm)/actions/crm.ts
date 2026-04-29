"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  leadSourceSet,
  projectTypeSet,
  contactCategorySet,
  validateFieldOptionsForSave,
  type CrmFieldOptionsSaveInput,
} from "@/lib/crm/field-options";
import { mergedFieldOptionsFromSupabase } from "@/lib/crm/merged-field-options-from-supabase";
import {
  mergeDealPipelineFromDb,
  mergeLeadPipelineFromDb,
  ensureDealPipelineRequiredSlugs,
  ensureLeadPipelineRequiredSlugs,
  validatePipelineColumnArrayForSave,
  type PipelineColumnDef,
} from "@/lib/crm/pipeline-columns";
import type { LeadFollowUpAppointment } from "@/lib/crm/lead-follow-up-appointment";
import { parseAppointmentStatus } from "@/lib/crm/appointment-status";
import { uploadBrandingFunnelPdf } from "@/lib/crm/branding-funnel-pdf-storage";
import {
  PROJECT_SOURCE_LEAD_ID_KEY,
  prospectShellLine,
  stripProspectShellMarkerAndAppend,
} from "@/lib/crm/prospect-client-shell";

type SupabaseServer = Awaited<ReturnType<typeof createClient>>;

/** Supabase returns schema-cache errors when `crm_settings` was never migrated. */
function explainMissingCrmSettingsTable(message: string): string {
  const m = message.toLowerCase();
  if (
    m.includes("crm_field_options") &&
    (m.includes("schema cache") ||
      m.includes("could not find") ||
      m.includes("column") ||
      m.includes("does not exist"))
  ) {
    return (
      "The field options column (crm_field_options) is missing on crm_settings. " +
      "In the Supabase SQL editor, run supabase/migrations/20260502120000_crm_field_options.sql, " +
      "or from the repo root run `npx supabase db push` after `supabase link`, then try Save again."
    );
  }
  const mentionsTable =
    m.includes("crm_settings") || m.includes("crm settings");
  const looksMissing =
    mentionsTable &&
    (m.includes("schema cache") ||
      m.includes("could not find") ||
      m.includes("does not exist") ||
      (m.includes("relation") && m.includes("does not exist")));
  if (!looksMissing) return message;
  return (
    "The pipeline settings table (crm_settings) is missing in your database. " +
    "Apply repo migrations: run `npx supabase db push` from the project root, " +
    "or open the Supabase SQL editor and run the file " +
    "supabase/migrations/20260410120000_crm_pipeline_settings.sql, then try Save again."
  );
}

async function leadStageSlugSet(supabase: SupabaseServer): Promise<Set<string>> {
  const { data, error } = await supabase
    .from("crm_settings")
    .select("lead_pipeline")
    .eq("id", 1)
    .maybeSingle();
  if (error) {
    return new Set(
      mergeLeadPipelineFromDb(null).map((c) => c.slug)
    );
  }
  return new Set(
    mergeLeadPipelineFromDb(data?.lead_pipeline).map((c) => c.slug)
  );
}

async function dealStageSlugSet(supabase: SupabaseServer): Promise<Set<string>> {
  const { data, error } = await supabase
    .from("crm_settings")
    .select("deal_pipeline")
    .eq("id", 1)
    .maybeSingle();
  if (error) {
    return new Set(
      mergeDealPipelineFromDb(null).map((c) => c.slug)
    );
  }
  return new Set(
    mergeDealPipelineFromDb(data?.deal_pipeline).map((c) => c.slug)
  );
}

function parseProjectTypeForCreate(
  formData: FormData,
  allowed: Set<string>
): string | null {
  const raw = String(formData.get("project_type") ?? "").trim();
  if (!raw || !allowed.has(raw)) return null;
  return raw;
}

function parseProjectTypeForUpdate(
  formData: FormData,
  allowed: Set<string>,
  existing: string | null
): string | null {
  const raw = String(formData.get("project_type") ?? "").trim();
  if (!raw) return null;
  if (allowed.has(raw)) return raw;
  const ex = existing?.trim() || "";
  if (ex && raw === ex) return raw;
  return null;
}

function parseContactCategoryForCreate(
  formData: FormData,
  allowed: Set<string>
): string | null {
  const raw = String(formData.get("contact_category") ?? "").trim();
  if (!raw || !allowed.has(raw)) return null;
  return raw;
}

function parseContactCategoryForUpdate(
  formData: FormData,
  allowed: Set<string>,
  existing: string | null
): string | null {
  const raw = String(formData.get("contact_category") ?? "").trim();
  if (!raw) return null;
  if (allowed.has(raw)) return raw;
  const ex = existing?.trim() || "";
  if (ex && raw === ex) return raw;
  return null;
}

function resolveLeadSourceForCreate(
  raw: string,
  allowed: Set<string>
): { source: string | null } | { error: string } {
  const t = raw.trim();
  if (!t) return { source: null };
  if (allowed.has(t)) return { source: t };
  return { error: "Pick a source from the list." };
}

function resolveLeadSourceForUpdate(
  raw: string,
  allowed: Set<string>,
  existingTrimmed: string | null
): { source: string | null } | { error: string } {
  const t = raw.trim();
  if (!t) return { source: null };
  if (allowed.has(t)) return { source: t };
  if (existingTrimmed && t === existingTrimmed) return { source: t };
  return { error: "Invalid source." };
}

export async function createLead(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const fieldOpts = await mergedFieldOptionsFromSupabase(supabase);
  const ptSet = projectTypeSet(fieldOpts);
  const catSet = contactCategorySet(fieldOpts);
  const srcSet = leadSourceSet(fieldOpts);

  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const company = String(formData.get("company") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const website = String(formData.get("website") ?? "").trim();
  const facebook = String(formData.get("facebook") ?? "").trim();
  const instagram = String(formData.get("instagram") ?? "").trim();
  const google_business_category = String(
    formData.get("google_business_category") ?? ""
  ).trim();
  let google_place_types: string[] | null = null;
  const typesJson = String(formData.get("google_place_types_json") ?? "").trim();
  if (typesJson) {
    try {
      const parsed = JSON.parse(typesJson) as unknown;
      if (Array.isArray(parsed) && parsed.every((x) => typeof x === "string")) {
        google_place_types = parsed;
      }
    } catch {
      /* ignore */
    }
  }
  const sourceRaw = String(formData.get("source") ?? "");
  const notes = String(formData.get("notes") ?? "").trim();
  const project_type = parseProjectTypeForCreate(formData, ptSet);
  const contact_category = parseContactCategoryForCreate(formData, catSet);
  const srcRes = resolveLeadSourceForCreate(sourceRaw, srcSet);
  if ("error" in srcRes) return { error: srcRes.error };
  const source = srcRes.source;

  const prospectPreviewIdRaw = String(formData.get("prospect_preview_id") ?? "").trim();
  let prospect_preview_id: string | null = null;
  const uuidPat =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (prospectPreviewIdRaw && uuidPat.test(prospectPreviewIdRaw)) {
    prospect_preview_id = prospectPreviewIdRaw.toLowerCase();
  }

  if (!name && !email) {
    return { error: "Add at least a name or email." };
  }

  if (!project_type) {
    return { error: "Please select a project type." };
  }

  const leadStages = await leadStageSlugSet(supabase);
  const initialStage = leadStages.has("open") ? "open" : "contacted";

  let validatedPreviewFk: string | null = prospect_preview_id;
  if (prospect_preview_id) {
    const { data: pv } = await supabase
      .from("prospect_preview")
      .select("id")
      .eq("id", prospect_preview_id)
      .maybeSingle();
    if (!pv) validatedPreviewFk = null;
  }

  const { data: created, error } = await supabase
    .from("lead")
    .insert({
      name: name || null,
      email: email || null,
      company: company || null,
      phone: phone || null,
      website: website || null,
      facebook: facebook || null,
      instagram: instagram || null,
      google_business_category: google_business_category || null,
      google_place_types:
        google_place_types && google_place_types.length > 0 ? google_place_types : null,
      source: source || null,
      notes: notes || null,
      project_type,
      contact_category,
      stage: initialStage,
      owner_id: user.id,
      ...(validatedPreviewFk ? { prospect_preview_id: validatedPreviewFk } : {}),
    })
    .select("id")
    .single();

  if (error) return { error: error.message };
  const id = created?.id as string | undefined;
  if (!id) return { error: "Lead created but id missing." };

  revalidatePath("/leads");
  revalidatePath("/dashboard");
  return { ok: true as const, id };
}

/** Lead fields only (e.g. table inline edit and lead detail contact tab). */
export async function updateLeadRow(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const id = String(formData.get("id") ?? "").trim();
  if (!id) return { error: "Missing lead id" };

  const fieldOpts = await mergedFieldOptionsFromSupabase(supabase);
  const ptSet = projectTypeSet(fieldOpts);
  const catSet = contactCategorySet(fieldOpts);
  const srcSet = leadSourceSet(fieldOpts);

  const { data: existingLead } = await supabase
    .from("lead")
    .select("source, project_type, contact_category, stage, converted_client_id")
    .eq("id", id)
    .maybeSingle();
  const existingSource = (existingLead?.source as string | null)?.trim() || null;
  const existingProjectType =
    (existingLead?.project_type as string | null)?.trim() || null;
  const existingContactCategory =
    (existingLead?.contact_category as string | null)?.trim() || null;

  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const company = String(formData.get("company") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const website = String(formData.get("website") ?? "").trim();
  const facebook = String(formData.get("facebook") ?? "").trim();
  const instagram = String(formData.get("instagram") ?? "").trim();
  const google_business_category = String(
    formData.get("google_business_category") ?? ""
  ).trim();
  let google_place_types: string[] | null = null;
  const typesJsonUp = String(formData.get("google_place_types_json") ?? "").trim();
  if (typesJsonUp) {
    try {
      const parsed = JSON.parse(typesJsonUp) as unknown;
      if (Array.isArray(parsed) && parsed.every((x) => typeof x === "string")) {
        google_place_types = parsed;
      }
    } catch {
      /* ignore */
    }
  }
  const sourceRaw = String(formData.get("source") ?? "");
  const stage = String(formData.get("stage") ?? "contacted").trim();
  const notes = String(formData.get("notes") ?? "").trim();
  const rawProjectType = String(formData.get("project_type") ?? "").trim();
  const project_type = parseProjectTypeForUpdate(
    formData,
    ptSet,
    existingProjectType
  );
  if (rawProjectType && project_type === null) {
    return { error: "Invalid project type." };
  }

  const rawContactCategory = String(
    formData.get("contact_category") ?? ""
  ).trim();
  const contact_category = parseContactCategoryForUpdate(
    formData,
    catSet,
    existingContactCategory
  );
  if (rawContactCategory && contact_category === null) {
    return { error: "Invalid contact category." };
  }

  const srcRes = resolveLeadSourceForUpdate(sourceRaw, srcSet, existingSource);
  if ("error" in srcRes) return { error: srcRes.error };
  const source = srcRes.source;

  const leadStages = await leadStageSlugSet(supabase);
  if (!leadStages.has(stage)) {
    return { error: "Invalid stage" };
  }

  const prevStage = (existingLead?.stage as string | null)?.trim() || "";

  const leadUpdate: Record<string, unknown> = {
    name: name || null,
    email: email || null,
    company: company || null,
    phone: phone || null,
    source: source || null,
    stage,
    notes: notes || null,
    project_type,
    contact_category,
  };
  if (formData.has("website")) {
    leadUpdate.website = website || null;
  }
  if (formData.has("facebook")) {
    leadUpdate.facebook = facebook || null;
  }
  if (formData.has("instagram")) {
    leadUpdate.instagram = instagram || null;
  }
  if (formData.has("google_business_category")) {
    leadUpdate.google_business_category = google_business_category || null;
  }
  if (formData.has("google_place_types_json")) {
    leadUpdate.google_place_types =
      google_place_types && google_place_types.length > 0 ? google_place_types : null;
  }

  if (prevStage === "closed_won" && stage !== "closed_won") {
    leadUpdate.converted_client_id = null;
  }

  const { error } = await supabase.from("lead").update(leadUpdate).eq("id", id);

  if (error) return { error: error.message };

  await ensureClientFromWonLeadStage(supabase, id);
  revalidatePath("/leads");
  revalidatePath(`/leads/${id}`);
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function updateClientRow(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const id = String(formData.get("id") ?? "").trim();
  if (!id) return { error: "Missing client id" };

  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const company = String(formData.get("company") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();

  if (!name) {
    return { error: "Name is required." };
  }

  const { error } = await supabase
    .from("client")
    .update({
      name,
      email: email || null,
      company: company || null,
      phone: phone || null,
      notes: notes || null,
    })
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/leads");
  revalidatePath("/products");
  revalidatePath("/projects");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function deleteClient(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const trimmed = id.trim();
  if (!trimmed) return { error: "Missing client id" };

  const { error } = await supabase.from("client").delete().eq("id", trimmed);
  if (error) return { error: error.message };

  revalidatePath("/products");
  revalidatePath("/projects");
  revalidatePath("/leads");
  revalidatePath("/dashboard");
  return { ok: true };
}

/** Updates only `lead.notes` (e.g. notes modal). Does not touch linked deal rows. */
export async function updateLeadNotes(leadId: string, notes: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const id = String(leadId ?? "").trim();
  if (!id) return { error: "Missing lead id" };

  const trimmed = notes.trim();
  const notesValue = trimmed === "" ? null : trimmed;

  const { error } = await supabase
    .from("lead")
    .update({ notes: notesValue })
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/leads");
  revalidatePath(`/leads/${id}`);
  revalidatePath("/dashboard");
  return { ok: true };
}

/** Updates `lead.temperature` (cold / warm / hot) for pipeline triage. */
export async function updateLeadTemperature(
  leadId: string,
  temperature: string | null
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const id = String(leadId ?? "").trim();
  if (!id) return { error: "Missing lead id" };

  const raw =
    temperature == null ? null : String(temperature).trim().toLowerCase();
  if (raw !== null && raw !== "cold" && raw !== "warm" && raw !== "hot") {
    return { error: "Invalid temperature" };
  }

  const { error } = await supabase
    .from("lead")
    .update({ temperature: raw })
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/leads");
  revalidatePath(`/leads/${id}`);
  revalidatePath("/dashboard");
  return { ok: true as const };
}

function appendLostReasonToLeadNotes(
  existing: string | null | undefined,
  reason: string
): string {
  const stamp = new Date().toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const block = `Lost reason (${stamp}): ${reason}`;
  const prev = (existing ?? "").trim();
  if (!prev) return block;
  return `${prev}\n\n${block}`;
}

/** Updates only `lead.stage` (e.g. Kanban drag). Does not touch linked deal rows. */
export async function updateLeadStage(
  leadId: string,
  stage: string,
  options?: { lostReason?: string }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const id = String(leadId ?? "").trim();
  if (!id) return { error: "Missing lead id" };

  const s = String(stage ?? "").trim();

  const { data: prior, error: priorErr } = await supabase
    .from("lead")
    .select("stage")
    .eq("id", id)
    .maybeSingle();
  if (priorErr) return { error: priorErr.message };
  const prevStage = (prior?.stage as string | null)?.trim() || "";

  const leadStages = await leadStageSlugSet(supabase);
  if (!leadStages.has(s)) {
    return { error: "Invalid stage" };
  }

  const lostReason = String(options?.lostReason ?? "").trim();
  let notesPayload: string | null | undefined;
  if (lostReason) {
    const { data: row, error: fetchErr } = await supabase
      .from("lead")
      .select("notes")
      .eq("id", id)
      .maybeSingle();
    if (fetchErr) return { error: fetchErr.message };
    notesPayload = appendLostReasonToLeadNotes(
      row?.notes as string | null | undefined,
      lostReason
    );
  }

  const updateBody: {
    stage: string;
    notes?: string | null;
    converted_client_id?: string | null;
  } = { stage: s };
  if (notesPayload !== undefined) updateBody.notes = notesPayload;

  if (prevStage === "closed_won" && s !== "closed_won") {
    updateBody.converted_client_id = null;
  }

  const { error } = await supabase.from("lead").update(updateBody).eq("id", id);

  if (error) return { error: error.message };

  await ensureClientFromWonLeadStage(supabase, id);
  revalidatePath("/leads");
  revalidatePath(`/leads/${id}`);
  revalidatePath("/dashboard");
  return { ok: true };
}

/** Updates only `lead.project_type` (e.g. Leads table quick edit). */
export async function updateLeadProjectType(
  leadId: string,
  projectTypeRaw: string
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const id = String(leadId ?? "").trim();
  if (!id) return { error: "Missing lead id" };

  const fieldOpts = await mergedFieldOptionsFromSupabase(supabase);
  const ptSet = projectTypeSet(fieldOpts);

  const { data: row } = await supabase
    .from("lead")
    .select("project_type")
    .eq("id", id)
    .maybeSingle();
  const existing =
    (row?.project_type as string | null)?.trim() || null;

  const raw = String(projectTypeRaw ?? "").trim();
  let project_type: string | null;
  if (!raw) project_type = null;
  else if (ptSet.has(raw)) project_type = raw;
  else if (existing && raw === existing) project_type = raw;
  else return { error: "Invalid project type." };

  const { error } = await supabase
    .from("lead")
    .update({ project_type })
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/leads");
  revalidatePath(`/leads/${id}`);
  revalidatePath("/dashboard");
  return { ok: true };
}

/** Updates only `lead.source` (e.g. Leads table quick edit). */
export async function updateLeadSourceField(leadId: string, sourceRaw: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const id = String(leadId ?? "").trim();
  if (!id) return { error: "Missing lead id" };

  const fieldOpts = await mergedFieldOptionsFromSupabase(supabase);
  const srcSet = leadSourceSet(fieldOpts);

  const { data: row } = await supabase
    .from("lead")
    .select("source")
    .eq("id", id)
    .maybeSingle();
  const existing = (row?.source as string | null)?.trim() || null;

  const srcRes = resolveLeadSourceForUpdate(sourceRaw, srcSet, existing);
  if ("error" in srcRes) return { error: srcRes.error };
  const source = srcRes.source;

  const { error } = await supabase
    .from("lead")
    .update({ source })
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/leads");
  revalidatePath(`/leads/${id}`);
  revalidatePath("/dashboard");
  return { ok: true };
}

const LEAD_TAG_COLOR_HEX = /^#[0-9A-Fa-f]{6}$/;

/** Create a lead tag (catalog entry). Assign tags on each lead’s detail page or via API. */
export async function createLeadTag(nameRaw: string, colorRaw: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const name = String(nameRaw ?? "").trim();
  if (!name) return { error: "Enter a tag name." };
  if (name.length > 120) return { error: "Tag name is too long." };

  const color = String(colorRaw ?? "").trim();
  if (!LEAD_TAG_COLOR_HEX.test(color)) {
    return { error: "Invalid color." };
  }

  const { error } = await supabase
    .from("lead_tag")
    .insert({ name, color });

  if (error) {
    if (error.code === "23505") {
      return { error: "A tag with that name already exists." };
    }
    return { error: error.message };
  }

  revalidatePath("/leads");
  revalidatePath("/dashboard");
  return { ok: true };
}

/** Delete a tag and all lead assignments (cascade). */
export async function deleteLeadTag(tagId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const id = String(tagId ?? "").trim();
  if (!id) return { error: "Missing tag id" };

  const { error } = await supabase.from("lead_tag").delete().eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/leads");
  revalidatePath("/dashboard");
  return { ok: true };
}

/** Add or remove a single tag on a lead (for lead detail toggles). */
export async function setLeadTagAssigned(
  leadId: string,
  tagId: string,
  assigned: boolean
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const lid = String(leadId ?? "").trim();
  const tid = String(tagId ?? "").trim();
  if (!lid || !tid) return { error: "Missing lead or tag id" };

  if (assigned) {
    const { error } = await supabase
      .from("lead_tag_assignment")
      .insert({ lead_id: lid, tag_id: tid });
    if (error) {
      if (error.code === "23505") {
        return { ok: true };
      }
      return { error: error.message };
    }
  } else {
    const { error } = await supabase
      .from("lead_tag_assignment")
      .delete()
      .eq("lead_id", lid)
      .eq("tag_id", tid);
    if (error) return { error: error.message };
  }

  revalidatePath("/leads");
  revalidatePath(`/leads/${lid}`);
  revalidatePath("/dashboard");
  return { ok: true };
}

/** Catalog name for leads sourced from Prospecting (intel, etc.). */
const PROSPECT_LEAD_TAG_NAME = "Prospect";
/** Light sky blue for new tag rows only; existing `lead_tag` rows are not updated on read. */
const PROSPECT_LEAD_TAG_COLOR = "#7dd3fc";

async function ensureProspectLeadTagId(
  supabase: SupabaseServer
): Promise<{ id: string } | { error: string }> {
  const { data: existing, error: selErr } = await supabase
    .from("lead_tag")
    .select("id")
    .ilike("name", PROSPECT_LEAD_TAG_NAME)
    .maybeSingle();

  if (selErr) return { error: selErr.message };
  if (existing?.id) return { id: existing.id as string };

  const { data: inserted, error: insErr } = await supabase
    .from("lead_tag")
    .insert({ name: PROSPECT_LEAD_TAG_NAME, color: PROSPECT_LEAD_TAG_COLOR })
    .select("id")
    .single();

  if (insErr) {
    if (insErr.code === "23505") {
      const { data: again } = await supabase
        .from("lead_tag")
        .select("id")
        .ilike("name", PROSPECT_LEAD_TAG_NAME)
        .maybeSingle();
      if (again?.id) return { id: again.id as string };
    }
    return { error: insErr.message };
  }
  if (!inserted?.id) return { error: "Could not create Prospect tag." };
  return { id: inserted.id as string };
}

/** Assign the Prospect catalog tag (create tag row if missing). Best-effort for prospecting flows. */
export async function assignProspectTagToLead(leadId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const lid = String(leadId ?? "").trim();
  if (!lid) return { error: "Missing lead id" };

  const tag = await ensureProspectLeadTagId(supabase);
  if ("error" in tag) return tag;

  return setLeadTagAssigned(lid, tag.id, true);
}

function isClosedDealStage(stage: string) {
  return stage === "closed_won" || stage === "closed_lost";
}

/**
 * Create a `client` from a lead and set `converted_client_id` (idempotent if already linked).
 */
async function insertClientFromLeadAndLink(
  supabase: SupabaseServer,
  lead: {
    id: string;
    name: string | null;
    email: string | null;
    phone: string | null;
    company: string | null;
    notes: string | null;
    converted_client_id: string | null;
  },
  conversionLine: string,
  companyHint?: string | null
): Promise<boolean> {
  if (lead.converted_client_id) return false;

  const name =
    lead.name?.trim() ||
    lead.email?.trim() ||
    lead.company?.trim() ||
    "Unnamed client";

  const company =
    lead.company?.trim() ||
    (companyHint && String(companyHint).trim()) ||
    null;

  const notesBase = (lead.notes ?? "").trim();
  const notes = notesBase ? `${notesBase}\n${conversionLine}` : conversionLine;

  const { data: client, error: insErr } = await supabase
    .from("client")
    .insert({
      name,
      email: lead.email?.trim() || null,
      phone: lead.phone?.trim() || null,
      company,
      notes,
    })
    .select("id")
    .single();

  if (insErr || !client?.id) return false;

  const { error: updErr } = await supabase
    .from("lead")
    .update({ converted_client_id: client.id })
    .eq("id", lead.id);

  return !updErr;
}

/** Root product created from lead flow: find existing `client_id` when metadata links the lead. */
async function findProvisionalClientIdFromLeadProjects(
  supabase: SupabaseServer,
  leadId: string
): Promise<string | null> {
  const { data: rows } = await supabase
    .from("project")
    .select("client_id")
    .is("parent_project_id", null)
    .contains("metadata", { [PROJECT_SOURCE_LEAD_ID_KEY]: leadId })
    .limit(5);
  const first = rows?.find((r) => (r.client_id as string | null)?.trim());
  const cid = (first?.client_id as string | null)?.trim();
  return cid ?? null;
}

/** Create a standalone `client` for product FK without converting the lead (`converted_client_id` unset). */
async function insertProspectShellClientForLead(
  supabase: SupabaseServer,
  lead: {
    id: string;
    name: string | null;
    email: string | null;
    phone: string | null;
    company: string | null;
    notes: string | null;
  },
  hints?: { company?: string | null; email?: string | null }
): Promise<string | null> {
  const stamp = new Date().toISOString().slice(0, 10);
  const prospectLine = prospectShellLine();
  const name =
    lead.name?.trim() ||
    lead.email?.trim() ||
    lead.company?.trim() ||
    "Unnamed prospect";
  const email = hints?.email?.trim() || lead.email?.trim() || null;
  const company =
    (hints?.company?.trim() ?? lead.company)?.trim() || null;

  const notesBase = (lead.notes ?? "").trim();
  const prepend = `[${stamp}] Project record — prospect not converted until Won.\n${prospectLine}`;
  const notes = notesBase ? `${notesBase}\n${prepend}` : prepend;

  const { data: client, error: insErr } = await supabase
    .from("client")
    .insert({
      name,
      email,
      phone: lead.phone?.trim() || null,
      company,
      notes,
    })
    .select("id")
    .single();

  if (insErr || !client?.id) return null;
  return client.id as string;
}

/**
 * Resolve `client` for a lead: return existing converted client or prospect shell /
 * provisional client tied to root products (`metadata.sourceLeadId`).
 * Does **not** set `converted_client_id`; Won move links the convert.
 */
export async function resolveOrCreateClientForLead(
  leadId: string,
  hints?: { company?: string | null; email?: string | null }
): Promise<{ clientId: string } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const id = leadId.trim();
  if (!id) return { error: "Missing lead id" };

  const { data: lead, error: leadErr } = await supabase
    .from("lead")
    .select(
      "id, name, email, phone, company, notes, converted_client_id"
    )
    .eq("id", id)
    .maybeSingle();

  if (leadErr || !lead) return { error: "Lead not found" };

  if (lead.converted_client_id?.trim()) {
    const cid = lead.converted_client_id.trim();
    const email = hints?.email?.trim();
    const company = hints?.company?.trim();
    if (email || company) {
      const patch: Record<string, string | null> = {};
      if (email) patch.email = email;
      if (company) patch.company = company;
      if (Object.keys(patch).length > 0) {
        await supabase.from("client").update(patch).eq("id", cid);
      }
    }
    return { clientId: cid };
  }

  const existingFromProject = await findProvisionalClientIdFromLeadProjects(
    supabase,
    id
  );
  if (existingFromProject) {
    const email = hints?.email?.trim();
    const company = hints?.company?.trim();
    if (email || company) {
      const patch: Record<string, string | null> = {};
      if (email) patch.email = email;
      if (company) patch.company = company;
      if (Object.keys(patch).length > 0) {
        await supabase.from("client").update(patch).eq("id", existingFromProject);
      }
    }
    return { clientId: existingFromProject };
  }

  const createdId = await insertProspectShellClientForLead(supabase, lead, hints);
  if (!createdId) {
    return { error: "Could not create prospect account for project." };
  }
  return { clientId: createdId };
}

/**
 * First time a lead's deal reaches Won / Lost, copy lead → `client`
 * and set `lead.converted_client_id` (idempotent per lead).
 */
async function ensureClientFromClosedDeal(
  supabase: SupabaseServer,
  leadId: string,
  dealStage: string,
  dealCompanyHint?: string | null
): Promise<boolean> {
  if (!isClosedDealStage(dealStage)) return false;

  const { data: lead, error: leadErr } = await supabase
    .from("lead")
    .select("id, name, email, phone, company, notes, converted_client_id")
    .eq("id", leadId)
    .maybeSingle();

  if (leadErr || !lead) return false;

  const outcome = dealStage === "closed_won" ? "Won" : "Lost";
  const stamp = new Date().toISOString().slice(0, 10);
  const conversionLine = `[${stamp}] Deal ${outcome} — converted from lead.`;

  return insertClientFromLeadAndLink(
    supabase,
    lead,
    conversionLine,
    dealCompanyHint
  );
}

/**
 * When `lead.stage` is `closed_won`, create or link client if not yet converted
 * (covers Kanban / table moves with no deal update in the same request).
 */
async function ensureClientFromWonLeadStage(
  supabase: SupabaseServer,
  leadId: string
): Promise<boolean> {
  const { data: lead, error: leadErr } = await supabase
    .from("lead")
    .select(
      "id, name, email, phone, company, notes, converted_client_id, stage"
    )
    .eq("id", leadId)
    .maybeSingle();

  if (leadErr || !lead || lead.stage !== "closed_won") return false;
  if (lead.converted_client_id?.trim()) return true;

  const provisional = await findProvisionalClientIdFromLeadProjects(
    supabase,
    lead.id
  );
  const stamp = new Date().toISOString().slice(0, 10);
  const conversionLine = `[${stamp}] Lead marked Won — converted from lead.`;

  if (provisional?.trim()) {
    const cid = provisional.trim();
    const { data: cRow } = await supabase
      .from("client")
      .select("notes")
      .eq("id", cid)
      .maybeSingle();
    const newNotes = stripProspectShellMarkerAndAppend(
      (cRow?.notes as string | null) ?? null,
      conversionLine
    );
    const { error: upCl } = await supabase
      .from("client")
      .update({ notes: newNotes })
      .eq("id", cid);
    if (upCl) return false;

    const { error: upLead } = await supabase
      .from("lead")
      .update({ converted_client_id: cid })
      .eq("id", lead.id);
    return !upLead;
  }

  return insertClientFromLeadAndLink(supabase, lead, conversionLine, null);
}

export async function updateDealRecord(input: {
  dealId: string;
  title: string;
  company: string;
  value: number;
  stage: string;
  expectedClose: string | null;
  contactEmail: string | null;
  website: string | null;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const dealStages = await dealStageSlugSet(supabase);
  if (!dealStages.has(input.stage)) {
    return { error: "Invalid deal stage" };
  }

  const { data: updated, error: dealErr } = await supabase
    .from("deal")
    .update({
      title: input.title.trim() || null,
      company: input.company.trim() || null,
      value: input.value,
      stage: input.stage,
      expected_close: input.expectedClose,
      contact_email: input.contactEmail?.trim() || null,
      website: input.website?.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.dealId.trim())
    .select("lead_id")
    .single();

  if (dealErr) return { error: dealErr.message };

  if (updated?.lead_id) {
    await ensureClientFromClosedDeal(
      supabase,
      updated.lead_id,
      input.stage,
      input.company
    );
  }

  revalidatePath("/leads");
  if (updated?.lead_id) revalidatePath(`/leads/${updated.lead_id}`);
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function updateDealStage(dealId: string, stage: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const id = dealId.trim();
  if (!id) return { error: "Missing deal id" };

  const dealStages = await dealStageSlugSet(supabase);
  if (!dealStages.has(stage)) {
    return { error: "Invalid deal stage" };
  }

  const { data: updated, error } = await supabase
    .from("deal")
    .update({
      stage,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("lead_id")
    .single();

  if (error) return { error: error.message };

  if (updated?.lead_id) {
    await ensureClientFromClosedDeal(supabase, updated.lead_id, stage);
  }

  revalidatePath("/leads");
  if (updated?.lead_id) revalidatePath(`/leads/${updated.lead_id}`);
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function deleteDealRecord(dealId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const id = dealId.trim();
  if (!id) return { error: "Missing deal id" };

  const { data: row } = await supabase
    .from("deal")
    .select("lead_id")
    .eq("id", id)
    .single();

  const { error } = await supabase.from("deal").delete().eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/leads");
  if (row?.lead_id) revalidatePath(`/leads/${row.lead_id}`);
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function createDealRecord(input: {
  leadId: string;
  title: string;
  company: string;
  value: number;
  stage: string;
  expectedClose: string | null;
  contactEmail: string | null;
  website: string | null;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const leadId = input.leadId.trim();
  if (!leadId) return { error: "Select a lead." };

  const dealStages = await dealStageSlugSet(supabase);
  if (!dealStages.has(input.stage)) {
    return { error: "Invalid deal stage" };
  }

  const valueNum = input.value;
  if (Number.isNaN(valueNum) || valueNum < 0) {
    return { error: "Budget must be a valid number." };
  }

  const expectedClose =
    input.expectedClose?.trim() ? input.expectedClose.trim() : null;

  const { error } = await supabase.from("deal").insert({
    lead_id: leadId,
    title: input.title.trim() || null,
    company: input.company.trim() || null,
    value: valueNum,
    stage: input.stage,
    expected_close: expectedClose,
    contact_email: input.contactEmail?.trim() || null,
    website: input.website?.trim() || null,
    updated_at: new Date().toISOString(),
  });

  if (error) return { error: error.message };

  await ensureClientFromClosedDeal(
    supabase,
    leadId,
    input.stage,
    input.company
  );
  revalidatePath("/leads");
  revalidatePath(`/leads/${leadId}`);
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function deleteLead(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const trimmed = id.trim();
  if (!trimmed) return { error: "Missing lead id" };

  const { error } = await supabase.from("lead").delete().eq("id", trimmed);
  if (error) return { error: error.message };

  revalidatePath("/leads");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function createAppointmentAction(input: {
  title: string;
  description?: string;
  /** ISO strings from the browser */
  starts_at: string;
  ends_at: string;
  status?: string | null;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const title = input.title.trim();
  const description = (input.description ?? "").trim();
  const starts = new Date(input.starts_at);
  const ends = new Date(input.ends_at);

  if (!title) return { error: "Title is required" };
  if (Number.isNaN(starts.getTime()) || Number.isNaN(ends.getTime())) {
    return { error: "Valid start and end times are required" };
  }
  if (ends <= starts) return { error: "End must be after start" };

  const status = parseAppointmentStatus(input.status);

  const { error } = await supabase.from("appointment").insert({
    title,
    description: description || null,
    starts_at: starts.toISOString(),
    ends_at: ends.toISOString(),
    status,
    created_by: user.id,
  });

  if (error) return { error: error.message };
  revalidatePath("/dashboard");
  revalidatePath("/calendar");
  return { ok: true };
}

/** Calendar follow-ups linked to a lead (Quick Task). */
export async function listLeadFollowUpAppointments(leadId: string): Promise<
  { data: LeadFollowUpAppointment[] } | { error: string }
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const id = String(leadId ?? "").trim();
  if (!id) return { error: "Missing lead id" };

  const { data, error } = await supabase
    .from("appointment")
    .select("id, title, starts_at, ends_at, description, status")
    .eq("lead_id", id)
    .order("starts_at", { ascending: true });

  if (error) return { error: error.message };

  return {
    data: (data ?? []) as LeadFollowUpAppointment[],
  };
}

/** Follow-up block on the calendar, linked to a lead (Quick Task from leads table). */
export async function createLeadQuickTask(input: {
  lead_id: string;
  title: string;
  starts_at: string;
  ends_at: string;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const leadId = input.lead_id.trim();
  if (!leadId) return { error: "Missing lead id" };

  const title = input.title.trim();
  if (!title) return { error: "Add a task title" };

  const starts = new Date(input.starts_at);
  const ends = new Date(input.ends_at);

  if (Number.isNaN(starts.getTime()) || Number.isNaN(ends.getTime())) {
    return { error: "Valid start and end times are required" };
  }
  if (ends <= starts) return { error: "End must be after start" };

  const { data: inserted, error } = await supabase
    .from("appointment")
    .insert({
      title,
      description: null,
      starts_at: starts.toISOString(),
      ends_at: ends.toISOString(),
      lead_id: leadId,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error) {
    return {
      error:
        error.message ||
        "Could not save the task. Ensure you are signed in as agency staff.",
    };
  }
  if (!inserted?.id) {
    return {
      error:
        "Task was not created. Check CRM permissions and the appointment table.",
    };
  }

  revalidatePath("/leads");
  revalidatePath(`/leads/${leadId}`);
  revalidatePath("/dashboard");
  revalidatePath("/calendar");
  return { ok: true };
}

export async function updateAppointmentAction(input: {
  id: string;
  title: string;
  description?: string;
  starts_at: string;
  ends_at: string;
  status?: string | null;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const id = input.id.trim();
  if (!id) return { error: "Missing appointment id" };

  const title = input.title.trim();
  const description = (input.description ?? "").trim();
  const starts = new Date(input.starts_at);
  const ends = new Date(input.ends_at);

  if (!title) return { error: "Title is required" };
  if (Number.isNaN(starts.getTime()) || Number.isNaN(ends.getTime())) {
    return { error: "Valid start and end times are required" };
  }
  if (ends <= starts) return { error: "End must be after start" };

  const status = parseAppointmentStatus(input.status);

  const { error } = await supabase
    .from("appointment")
    .update({
      title,
      description: description || null,
      starts_at: starts.toISOString(),
      ends_at: ends.toISOString(),
      status,
    })
    .eq("id", id);

  if (error) return { error: error.message };
  revalidatePath("/dashboard");
  revalidatePath("/calendar");
  return { ok: true };
}

export async function deleteAppointment(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };
  if (!id) return { error: "Missing id" };

  const { error } = await supabase.from("appointment").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/dashboard");
  revalidatePath("/calendar");
  return { ok: true };
}

export async function saveCrmFieldOptions(input: CrmFieldOptionsSaveInput) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { error: "Unauthorized" };

    const normalized = validateFieldOptionsForSave(input);
    if ("error" in normalized) return { error: normalized.error };

    const { data: cur, error: readErr } = await supabase
      .from("crm_settings")
      .select("lead_pipeline, deal_pipeline")
      .eq("id", 1)
      .maybeSingle();

    if (readErr)
      return { error: explainMissingCrmSettingsTable(readErr.message) };

    const { error } = await supabase.from("crm_settings").upsert(
      {
        id: 1,
        lead_pipeline: mergeLeadPipelineFromDb(cur?.lead_pipeline),
        deal_pipeline: mergeDealPipelineFromDb(cur?.deal_pipeline),
        crm_field_options: normalized,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" }
    );

    if (error) return { error: explainMissingCrmSettingsTable(error.message) };

    revalidatePath("/settings");
    revalidatePath("/leads");
    revalidatePath("/products");
    revalidatePath("/dashboard");
    revalidatePath("/prospecting");
    return { ok: true };
  } catch (e) {
    console.error("saveCrmFieldOptions:", e);
    return {
      error:
        e instanceof Error
          ? e.message
          : "Something went wrong while saving field options.",
    };
  }
}

export async function saveCrmPipelineSettings(input: {
  leadPipeline?: PipelineColumnDef[];
  dealPipeline?: PipelineColumnDef[];
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { data: cur, error: readErr } = await supabase
    .from("crm_settings")
    .select("lead_pipeline, deal_pipeline, crm_field_options")
    .eq("id", 1)
    .maybeSingle();

  if (readErr) return { error: explainMissingCrmSettingsTable(readErr.message) };

  let lead = mergeLeadPipelineFromDb(cur?.lead_pipeline);
  let deal = mergeDealPipelineFromDb(cur?.deal_pipeline);

  if (input.leadPipeline) {
    const v = validatePipelineColumnArrayForSave(input.leadPipeline);
    if ("error" in v) return { error: v.error };
    lead = ensureLeadPipelineRequiredSlugs(v.ok);
  }
  if (input.dealPipeline) {
    const v = validatePipelineColumnArrayForSave(input.dealPipeline);
    if ("error" in v) return { error: v.error };
    deal = ensureDealPipelineRequiredSlugs(v.ok);
  }

  const fieldOpts =
    cur &&
    typeof (cur as { crm_field_options?: unknown }).crm_field_options !==
      "undefined"
      ? (cur as { crm_field_options: unknown }).crm_field_options
      : {};

  const { error } = await supabase.from("crm_settings").upsert(
    {
      id: 1,
      lead_pipeline: lead,
      deal_pipeline: deal,
      crm_field_options: fieldOpts,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" }
  );

  if (error) return { error: explainMissingCrmSettingsTable(error.message) };

  revalidatePath("/leads");
  revalidatePath("/dashboard");
  revalidatePath("/settings");
  return { ok: true };
}

export async function reassignDealsFromStage(fromSlug: string, toSlug: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const from = fromSlug.trim();
  const to = toSlug.trim();
  if (!from || !to || from === to) {
    return { error: "Invalid stage reassignment" };
  }

  const allowed = await dealStageSlugSet(supabase);
  if (!allowed.has(to)) {
    return { error: "Target stage is not in the current deal pipeline" };
  }

  const { error } = await supabase
    .from("deal")
    .update({ stage: to, updated_at: new Date().toISOString() })
    .eq("stage", from);

  if (error) return { error: error.message };

  revalidatePath("/leads");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function reassignLeadsFromStage(fromSlug: string, toSlug: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const from = fromSlug.trim();
  const to = toSlug.trim();
  if (!from || !to || from === to) {
    return { error: "Invalid stage reassignment" };
  }

  const allowed = await leadStageSlugSet(supabase);
  if (!allowed.has(to)) {
    return { error: "Target stage is not in the current lead pipeline" };
  }

  const { data: toMove, error: selErr } = await supabase
    .from("lead")
    .select("id")
    .eq("stage", from);

  if (selErr) return { error: selErr.message };

  const { error } = await supabase.from("lead").update({ stage: to }).eq("stage", from);

  if (error) return { error: error.message };

  if (from === "closed_won" && to !== "closed_won") {
    const ids = (toMove ?? [])
      .map((r) => r.id as string | undefined)
      .filter((x): x is string => Boolean(x?.trim()));
    if (ids.length > 0) {
      const { error: clearErr } = await supabase
        .from("lead")
        .update({ converted_client_id: null })
        .in("id", ids);
      if (clearErr) return { error: clearErr.message };
    }
  }

  if (to === "closed_won") {
    for (const row of toMove ?? []) {
      await ensureClientFromWonLeadStage(supabase, row.id);
    }
  }

  revalidatePath("/leads");
  revalidatePath("/dashboard");
  return { ok: true };
}

/**
 * Uploads a Brand Kit + Sales Funnel PDF to `prospect-attachments` and links it
 * on the lead row. Used after generation in Prospecting or when passing `leadId`
 * into the branding PDF action.
 */
export async function saveLeadBrandingFunnelPdfAction(input: {
  leadId: string;
  pdfBase64?: string;
  existingPath?: string;
  filename?: string;
}): Promise<
  | { ok: true; publicUrl: string; path: string }
  | { ok: false; error: string }
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Unauthorized" };

  const leadId = input.leadId.trim();
  if (!leadId) return { ok: false, error: "Missing lead id." };

  const { data: leadRow, error: leadErr } = await supabase
    .from("lead")
    .select("id")
    .eq("id", leadId)
    .maybeSingle();
  if (leadErr || !leadRow) {
    return { ok: false, error: "Lead not found or access denied." };
  }

  let path = input.existingPath?.trim() || "";
  let publicUrl = "";
  if (!path) {
    if (!input.pdfBase64) return { ok: false, error: "Missing PDF data." };
    let buf: Buffer;
    try {
      buf = Buffer.from(input.pdfBase64, "base64");
    } catch {
      return { ok: false, error: "Invalid PDF data." };
    }
    const uploaded = await uploadBrandingFunnelPdf({
      bytes: buf,
      filename: input.filename,
      leadId,
      userId: user.id,
    });
    if (!uploaded.ok) return uploaded;
    path = uploaded.path;
    publicUrl = uploaded.publicUrl;
  } else {
    const {
      data: { publicUrl: existingPublicUrl },
    } = supabase.storage.from("prospect-attachments").getPublicUrl(path);
    publicUrl = existingPublicUrl;
  }

  const now = new Date().toISOString();
  const { error: updErr } = await supabase
    .from("lead")
    .update({
      branding_funnel_pdf_path: path,
      branding_funnel_pdf_created_at: now,
    })
    .eq("id", leadId);

  if (updErr) {
    return { ok: false, error: updErr.message || "Could not link PDF to lead." };
  }

  revalidatePath("/leads");
  revalidatePath(`/leads/${leadId}`);
  return { ok: true, publicUrl, path };
}
