"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  isLifeAreaKey,
  isLifeStatus,
  type LifeAreaKey,
  type LifeStatus,
} from "@/lib/crm/life-areas";

export type LifeTaskRow = {
  id: string;
  area: LifeAreaKey;
  title: string;
  status: LifeStatus;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

// ---------------------------------------------------------------------------
// Read
// ---------------------------------------------------------------------------

export async function listLifeTasks(): Promise<{
  data: LifeTaskRow[];
  error: string | null;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { data: [], error: "Not authenticated" };

  const { data, error } = await supabase
    .from("life_task")
    .select("id, area, title, status, sort_order, created_at, updated_at")
    .eq("user_id", user.id)
    .order("area", { ascending: true })
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) return { data: [], error: error.message };

  const rows: LifeTaskRow[] = [];
  for (const row of data ?? []) {
    if (!isLifeAreaKey(row.area) || !isLifeStatus(row.status)) continue;
    rows.push({
      id: row.id as string,
      area: row.area,
      title: (row.title as string) ?? "",
      status: row.status,
      sort_order: Number(row.sort_order ?? 0),
      created_at: (row.created_at as string) ?? new Date().toISOString(),
      updated_at: (row.updated_at as string) ?? new Date().toISOString(),
    });
  }

  return { data: rows, error: null };
}

// ---------------------------------------------------------------------------
// Create
// ---------------------------------------------------------------------------

export async function createLifeTaskAction(input: {
  area: string;
  title: string;
  status?: string;
}): Promise<{ data: LifeTaskRow | null; error: string | null }> {
  if (!isLifeAreaKey(input.area)) {
    return { data: null, error: "Invalid life area" };
  }
  const title = (input.title ?? "").trim();
  if (!title) return { data: null, error: "Title is required" };
  if (title.length > 200) {
    return { data: null, error: "Title too long" };
  }
  const status: LifeStatus =
    input.status && isLifeStatus(input.status) ? input.status : "yellow";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { data: null, error: "Not authenticated" };

  // Append at the end of the section.
  const { data: maxRow } = await supabase
    .from("life_task")
    .select("sort_order")
    .eq("user_id", user.id)
    .eq("area", input.area)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextSort = (maxRow?.sort_order ?? -1) + 1;

  const { data, error } = await supabase
    .from("life_task")
    .insert({
      user_id: user.id,
      area: input.area,
      title,
      status,
      sort_order: nextSort,
    })
    .select("id, area, title, status, sort_order, created_at, updated_at")
    .single();

  if (error || !data) return { data: null, error: error?.message ?? "Insert failed" };

  revalidatePath("/my-life");

  return {
    data: {
      id: data.id as string,
      area: data.area as LifeAreaKey,
      title: data.title as string,
      status: data.status as LifeStatus,
      sort_order: Number(data.sort_order ?? 0),
      created_at: (data.created_at as string) ?? new Date().toISOString(),
      updated_at: (data.updated_at as string) ?? new Date().toISOString(),
    },
    error: null,
  };
}

// ---------------------------------------------------------------------------
// Update
// ---------------------------------------------------------------------------

export async function updateLifeTaskAction(input: {
  id: string;
  title?: string;
  status?: string;
}): Promise<{ data: LifeTaskRow | null; error: string | null }> {
  if (!input.id) return { data: null, error: "Missing id" };

  const patch: Record<string, unknown> = {};

  if (input.title !== undefined) {
    const title = input.title.trim();
    if (!title) return { data: null, error: "Title is required" };
    if (title.length > 200) return { data: null, error: "Title too long" };
    patch.title = title;
  }

  if (input.status !== undefined) {
    if (!isLifeStatus(input.status)) return { data: null, error: "Invalid status" };
    patch.status = input.status;
  }

  if (Object.keys(patch).length === 0) {
    return { data: null, error: "Nothing to update" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { data: null, error: "Not authenticated" };

  const { data, error } = await supabase
    .from("life_task")
    .update(patch)
    .eq("id", input.id)
    .eq("user_id", user.id)
    .select("id, area, title, status, sort_order, created_at, updated_at")
    .single();

  if (error || !data) return { data: null, error: error?.message ?? "Update failed" };

  revalidatePath("/my-life");

  return {
    data: {
      id: data.id as string,
      area: data.area as LifeAreaKey,
      title: data.title as string,
      status: data.status as LifeStatus,
      sort_order: Number(data.sort_order ?? 0),
      created_at: (data.created_at as string) ?? new Date().toISOString(),
      updated_at: (data.updated_at as string) ?? new Date().toISOString(),
    },
    error: null,
  };
}

// ---------------------------------------------------------------------------
// Delete
// ---------------------------------------------------------------------------

export async function deleteLifeTaskAction(id: string): Promise<{
  error: string | null;
}> {
  if (!id) return { error: "Missing id" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("life_task")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/my-life");
  return { error: null };
}
