"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { LEAD_PROJECT_TYPE_OPTIONS } from "@/lib/crm/mock-data";

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

  const allowedStages = [
    "new",
    "contacted",
    "qualified",
    "not_qualified",
    "won",
    "lost",
  ];
  if (!allowedStages.includes(stage)) {
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

  const allowedDealStages = [
    "prospect",
    "proposal",
    "negotiation",
    "closed_won",
    "closed_lost",
  ] as const;
  if (!allowedDealStages.includes(dealStage as (typeof allowedDealStages)[number])) {
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

  const { error: dealErr } = await supabase.from("deal").upsert(
    {
      lead_id: id,
      title: dealTitle || null,
      company: dealCompany || null,
      value: valueNum,
      stage: dealStage,
      expected_close: expectedClose,
      contact_email: dealContactEmail || null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "lead_id" }
  );

  if (dealErr) return { error: dealErr.message };

  revalidatePath("/leads");
  revalidatePath(`/leads/${id}`);
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
