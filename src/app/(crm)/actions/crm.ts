"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

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

  if (!name && !email) {
    return { error: "Add at least a name or email." };
  }

  const { error } = await supabase.from("lead").insert({
    name: name || null,
    email: email || null,
    company: company || null,
    phone: phone || null,
    source: source || null,
    notes: notes || null,
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

  const allowedStages = ["new", "contacted", "qualified", "won", "lost"];
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
    })
    .eq("id", id);

  if (error) return { error: error.message };
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
