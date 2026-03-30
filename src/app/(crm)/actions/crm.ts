"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { LEAD_PROJECT_TYPE_OPTIONS } from "@/lib/crm/mock-data";
import {
  mergeDealPipelineFromDb,
  mergeLeadPipelineFromDb,
  ensureDealPipelineRequiredSlugs,
  ensureLeadPipelineRequiredSlugs,
  validatePipelineColumnArrayForSave,
  type PipelineColumnDef,
} from "@/lib/crm/pipeline-columns";

type SupabaseServer = Awaited<ReturnType<typeof createClient>>;

/** Supabase returns schema-cache errors when `crm_settings` was never migrated. */
function explainMissingCrmSettingsTable(message: string): string {
  const m = message.toLowerCase();
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

const PROJECT_TYPE_SET = new Set<string>(LEAD_PROJECT_TYPE_OPTIONS);

function parseProjectType(formData: FormData): string | null {
  const raw = String(formData.get("project_type") ?? "").trim();
  if (!raw || !PROJECT_TYPE_SET.has(raw)) return null;
  return raw;
}

export async function createLead(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const company = String(formData.get("company") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const source = String(formData.get("source") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();
  const project_type = parseProjectType(formData);

  if (!name && !email) {
    return { error: "Add at least a name or email." };
  }

  if (!project_type) {
    return { error: "Please select a project type." };
  }

  const { error } = await supabase.from("lead").insert({
    name: name || null,
    email: email || null,
    company: company || null,
    phone: phone || null,
    source: source || null,
    notes: notes || null,
    project_type,
    stage: "new",
    owner_id: user.id,
  });

  if (error) return { error: error.message };
  revalidatePath("/leads");
  revalidatePath("/dashboard");
  return { ok: true };
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

  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const company = String(formData.get("company") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const source = String(formData.get("source") ?? "").trim();
  const stage = String(formData.get("stage") ?? "new").trim();
  const notes = String(formData.get("notes") ?? "").trim();
  const project_type = parseProjectType(formData);

  const leadStages = await leadStageSlugSet(supabase);
  if (!leadStages.has(stage)) {
    return { error: "Invalid stage" };
  }

  const { error } = await supabase
    .from("lead")
    .update({
      name: name || null,
      email: email || null,
      company: company || null,
      phone: phone || null,
      source: source || null,
      stage,
      notes: notes || null,
      project_type,
    })
    .eq("id", id);

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

/** Updates only `lead.stage` (e.g. Kanban drag). Does not touch linked deal rows. */
export async function updateLeadStage(leadId: string, stage: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const id = String(leadId ?? "").trim();
  if (!id) return { error: "Missing lead id" };

  const s = String(stage ?? "").trim();
  const leadStages = await leadStageSlugSet(supabase);
  if (!leadStages.has(s)) {
    return { error: "Invalid stage" };
  }

  const { error } = await supabase.from("lead").update({ stage: s }).eq("id", id);

  if (error) return { error: error.message };

  await ensureClientFromWonLeadStage(supabase, id);
  revalidatePath("/leads");
  revalidatePath(`/leads/${id}`);
  revalidatePath("/dashboard");
  return { ok: true };
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

/**
 * Resolve `client` for a lead: return existing `converted_client_id`, or create
 * client from lead (same as Won conversion) for “project from lead” flows.
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

  const stamp = new Date().toISOString().slice(0, 10);
  const conversionLine = `[${stamp}] Client created when starting project from lead.`;

  const leadForInsert = {
    ...lead,
    email: hints?.email?.trim() || lead.email,
    company: hints?.company?.trim() || lead.company,
  };

  const created = await insertClientFromLeadAndLink(
    supabase,
    leadForInsert,
    conversionLine,
    hints?.company?.trim() || lead.company
  );

  if (!created) {
    return { error: "Could not create client from this lead." };
  }

  const { data: again } = await supabase
    .from("lead")
    .select("converted_client_id")
    .eq("id", id)
    .maybeSingle();

  const cid = again?.converted_client_id?.trim();
  if (!cid) return { error: "Client was not linked to the lead." };

  return { clientId: cid };
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
 * When `lead.stage` is `closed_won`, create client if not already converted
 * (covers Kanban / table moves with no deal update in the same request).
 */
async function ensureClientFromWonLeadStage(
  supabase: SupabaseServer,
  leadId: string
): Promise<boolean> {
  const { data: lead, error: leadErr } = await supabase
    .from("lead")
    .select("id, name, email, phone, company, notes, converted_client_id, stage")
    .eq("id", leadId)
    .maybeSingle();

  if (leadErr || !lead || lead.stage !== "closed_won") return false;

  const stamp = new Date().toISOString().slice(0, 10);
  const conversionLine = `[${stamp}] Lead marked Won — converted from lead.`;

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

  const { error } = await supabase.from("appointment").insert({
    title,
    description: description || null,
    starts_at: starts.toISOString(),
    ends_at: ends.toISOString(),
    created_by: user.id,
  });

  if (error) return { error: error.message };
  revalidatePath("/dashboard");
  revalidatePath("/calendar");
  return { ok: true };
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

  const { error } = await supabase.from("appointment").insert({
    title,
    description: null,
    starts_at: starts.toISOString(),
    ends_at: ends.toISOString(),
    lead_id: leadId,
    created_by: user.id,
  });

  if (error) return { error: error.message };

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

  const { error } = await supabase
    .from("appointment")
    .update({
      title,
      description: description || null,
      starts_at: starts.toISOString(),
      ends_at: ends.toISOString(),
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
    .select("lead_pipeline, deal_pipeline")
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

  const { error } = await supabase.from("crm_settings").upsert(
    {
      id: 1,
      lead_pipeline: lead,
      deal_pipeline: deal,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" }
  );

  if (error) return { error: explainMissingCrmSettingsTable(error.message) };

  revalidatePath("/leads");
  revalidatePath("/dashboard");
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

  if (to === "closed_won") {
    for (const row of toMove ?? []) {
      await ensureClientFromWonLeadStage(supabase, row.id);
    }
  }

  revalidatePath("/leads");
  revalidatePath("/dashboard");
  return { ok: true };
}
