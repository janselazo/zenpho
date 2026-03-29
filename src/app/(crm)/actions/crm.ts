"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { LEAD_PROJECT_TYPE_OPTIONS } from "@/lib/crm/mock-data";
import {
  mergeDealPipelineFromDb,
  mergeLeadPipelineFromDb,
  parsePipelineColumnArray,
  ensureDealPipelineRequiredSlugs,
  ensureLeadPipelineRequiredSlugs,
  type PipelineColumnDef,
} from "@/lib/crm/pipeline-columns";

type SupabaseServer = Awaited<ReturnType<typeof createClient>>;

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
  revalidatePath("/deals");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function updateLead(formData: FormData) {
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

  const dealTitle = String(formData.get("deal_title") ?? "").trim();
  const dealCompany = String(formData.get("deal_company") ?? "").trim();
  const dealValueRaw = String(formData.get("deal_value") ?? "").trim();
  const dealStage = String(formData.get("deal_stage") ?? "prospect").trim();
  const dealExpectedClose = String(
    formData.get("deal_expected_close") ?? ""
  ).trim();
  const dealContactEmail = String(
    formData.get("deal_contact_email") ?? ""
  ).trim();
  const dealWebsite = String(formData.get("deal_website") ?? "").trim();

  const dealStages = await dealStageSlugSet(supabase);
  if (!dealStages.has(dealStage)) {
    return { error: "Invalid deal stage" };
  }

  let valueNum: number | null = null;
  if (dealValueRaw !== "") {
    const n = Number(dealValueRaw.replace(/,/g, ""));
    if (Number.isNaN(n) || n < 0) {
      return { error: "Deal value must be a valid number" };
    }
    valueNum = n;
  }

  const expectedClose =
    dealExpectedClose === "" ? null : dealExpectedClose;

  const dealId = String(formData.get("deal_id") ?? "").trim();

  const hasNewDealPayload =
    Boolean(dealTitle) ||
    Boolean(dealCompany) ||
    dealValueRaw !== "" ||
    Boolean(dealContactEmail.trim()) ||
    Boolean(dealWebsite.trim()) ||
    expectedClose != null;

  if (dealId) {
    const { error: dealErr } = await supabase
      .from("deal")
      .update({
        title: dealTitle || null,
        company: dealCompany || null,
        value: valueNum,
        stage: dealStage,
        expected_close: expectedClose,
        contact_email: dealContactEmail || null,
        website: dealWebsite || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", dealId)
      .eq("lead_id", id);

    if (dealErr) return { error: dealErr.message };
  } else if (hasNewDealPayload) {
    const { error: dealErr } = await supabase.from("deal").insert({
      lead_id: id,
      title: dealTitle || null,
      company: dealCompany || null,
      value: valueNum,
      stage: dealStage,
      expected_close: expectedClose,
      contact_email: dealContactEmail || null,
      website: dealWebsite || null,
      updated_at: new Date().toISOString(),
    });

    if (dealErr) return { error: dealErr.message };
  }

  const linked = await ensureClientFromClosedDeal(
    supabase,
    id,
    dealStage,
    dealCompany || null
  );
  if (linked) revalidatePath("/clients");

  revalidatePath("/leads");
  revalidatePath(`/leads/${id}`);
  revalidatePath("/deals");
  revalidatePath("/dashboard");
  return { ok: true };
}

/** Lead fields only (e.g. table inline edit). Does not create/update linked deal rows. */
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

  revalidatePath("/clients");
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

  revalidatePath("/clients");
  revalidatePath("/projects");
  revalidatePath("/leads");
  revalidatePath("/deals");
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

  revalidatePath("/leads");
  revalidatePath(`/leads/${id}`);
  revalidatePath("/dashboard");
  return { ok: true };
}

function isClosedDealStage(stage: string) {
  return stage === "closed_won" || stage === "closed_lost";
}

/**
 * First time a lead's deal reaches Won / Lost, copy lead → `client`
 * and set `lead.converted_client_id` (idempotent per lead).
 */
async function ensureClientFromClosedDeal(
  supabase: Awaited<ReturnType<typeof createClient>>,
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

  if (leadErr || !lead || lead.converted_client_id) return false;

  const name =
    lead.name?.trim() ||
    lead.email?.trim() ||
    lead.company?.trim() ||
    "Unnamed client";

  const company =
    lead.company?.trim() ||
    (dealCompanyHint && String(dealCompanyHint).trim()) ||
    null;

  const outcome = dealStage === "closed_won" ? "Won" : "Lost";
  const stamp = new Date().toISOString().slice(0, 10);
  const conversionLine = `[${stamp}] Deal ${outcome} — converted from lead.`;
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
    .eq("id", leadId);

  return !updErr;
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
    const linked = await ensureClientFromClosedDeal(
      supabase,
      updated.lead_id,
      input.stage,
      input.company
    );
    if (linked) revalidatePath("/clients");
  }

  revalidatePath("/deals");
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
    const linked = await ensureClientFromClosedDeal(
      supabase,
      updated.lead_id,
      stage
    );
    if (linked) revalidatePath("/clients");
  }

  revalidatePath("/deals");
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

  revalidatePath("/deals");
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

  const linked = await ensureClientFromClosedDeal(
    supabase,
    leadId,
    input.stage,
    input.company
  );
  if (linked) revalidatePath("/clients");

  revalidatePath("/deals");
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
  revalidatePath("/deals");
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
  revalidatePath("/deals");
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

  if (readErr) return { error: readErr.message };

  let lead = mergeLeadPipelineFromDb(cur?.lead_pipeline);
  let deal = mergeDealPipelineFromDb(cur?.deal_pipeline);

  if (input.leadPipeline) {
    const p = parsePipelineColumnArray(input.leadPipeline);
    if (!p || p.length === 0 || p.length > 20) {
      return { error: "Invalid lead pipeline (1–20 stages)" };
    }
    lead = ensureLeadPipelineRequiredSlugs(p);
  }
  if (input.dealPipeline) {
    const p = parsePipelineColumnArray(input.dealPipeline);
    if (!p || p.length === 0 || p.length > 20) {
      return { error: "Invalid deal pipeline (1–20 stages)" };
    }
    deal = ensureDealPipelineRequiredSlugs(p);
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

  if (error) return { error: error.message };

  revalidatePath("/leads");
  revalidatePath("/deals");
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

  revalidatePath("/deals");
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

  const { error } = await supabase.from("lead").update({ stage: to }).eq("stage", from);

  if (error) return { error: error.message };

  revalidatePath("/leads");
  revalidatePath("/deals");
  revalidatePath("/dashboard");
  return { ok: true };
}
