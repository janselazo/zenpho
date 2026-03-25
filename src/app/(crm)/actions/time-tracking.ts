"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

function humanizeTimeEntryError(message: string): string {
  const m = message.toLowerCase();
  if (
    m.includes("does not exist") ||
    m.includes("schema cache") ||
    m.includes("pgrst202") ||
    m.includes("pgrst205")
  ) {
    return (
      "Time tracking is not on this database yet. Apply " +
      "`supabase/migrations/20260402120000_time_entry.sql` or run `supabase db push`."
    );
  }
  return message;
}

export async function startTimeEntry(input: {
  description: string;
  projectId: string | null;
  taskId: string | null;
  billable: boolean;
  tags: string[];
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const desc = input.description.trim();
  if (!desc) return { error: "Describe what you’re working on." };

  const pid = input.projectId?.trim() || null;
  const tid = input.taskId?.trim() || null;
  if (tid && pid) {
    const { data: taskRow } = await supabase
      .from("task")
      .select("project_id")
      .eq("id", tid)
      .maybeSingle();
    if (taskRow && taskRow.project_id !== pid) {
      return { error: "Selected task does not belong to the chosen project." };
    }
  }

  const now = new Date().toISOString();

  const { error: closeErr } = await supabase
    .from("time_entry")
    .update({ ended_at: now })
    .eq("user_id", user.id)
    .is("ended_at", null);

  if (closeErr) return { error: humanizeTimeEntryError(closeErr.message) };

  const { data: row, error } = await supabase
    .from("time_entry")
    .insert({
      user_id: user.id,
      description: desc,
      project_id: pid,
      task_id: tid,
      billable: input.billable,
      tags: input.tags.length ? input.tags : [],
      started_at: now,
      ended_at: null,
    })
    .select("id")
    .single();

  if (error) return { error: humanizeTimeEntryError(error.message) };

  revalidatePath("/time-tracking");
  return { ok: true as const, id: row?.id as string };
}

export async function stopTimeEntry() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const now = new Date().toISOString();
  const { data: open, error: findErr } = await supabase
    .from("time_entry")
    .select("id")
    .eq("user_id", user.id)
    .is("ended_at", null)
    .maybeSingle();

  if (findErr) return { error: humanizeTimeEntryError(findErr.message) };
  if (!open?.id) return { error: "No timer is running." };

  const { error } = await supabase
    .from("time_entry")
    .update({ ended_at: now })
    .eq("id", open.id);

  if (error) return { error: humanizeTimeEntryError(error.message) };

  revalidatePath("/time-tracking");
  return { ok: true as const };
}

export async function deleteTimeEntry(entryId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const id = entryId.trim();
  if (!id) return { error: "Missing entry" };

  const { error } = await supabase
    .from("time_entry")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { error: humanizeTimeEntryError(error.message) };

  revalidatePath("/time-tracking");
  return { ok: true as const };
}
