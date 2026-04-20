"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  LIFE_AREAS,
  isLifeAreaKey,
  isLifeStatus,
  type LifeAreaKey,
  type LifeStatus,
} from "@/lib/crm/life-areas";

export type LifeAreaStatusRow = {
  id: string | null;
  area: LifeAreaKey;
  status: LifeStatus;
  notes: string;
  updated_at: string | null;
};

/**
 * Returns all 7 life areas for the current user, seeded with defaults
 * (status=yellow, empty notes) for any area that doesn't yet have a row.
 */
export async function listLifeAreaStatuses(): Promise<{
  data: LifeAreaStatusRow[];
  error: string | null;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      data: LIFE_AREAS.map((a) => defaultRow(a.key)),
      error: "Not authenticated",
    };
  }

  const { data, error } = await supabase
    .from("life_area_status")
    .select("id, area, status, notes, updated_at")
    .eq("user_id", user.id);

  if (error) {
    return {
      data: LIFE_AREAS.map((a) => defaultRow(a.key)),
      error: error.message,
    };
  }

  const byArea = new Map<string, LifeAreaStatusRow>();
  for (const row of data ?? []) {
    if (!isLifeAreaKey(row.area) || !isLifeStatus(row.status)) continue;
    byArea.set(row.area, {
      id: row.id as string,
      area: row.area,
      status: row.status,
      notes: (row.notes as string | null) ?? "",
      updated_at: (row.updated_at as string | null) ?? null,
    });
  }

  return {
    data: LIFE_AREAS.map((a) => byArea.get(a.key) ?? defaultRow(a.key)),
    error: null,
  };
}

export async function upsertLifeAreaStatusAction(input: {
  area: string;
  status?: string;
  notes?: string;
}): Promise<{ data: LifeAreaStatusRow | null; error: string | null }> {
  if (!isLifeAreaKey(input.area)) {
    return { data: null, error: "Invalid life area" };
  }
  if (input.status !== undefined && !isLifeStatus(input.status)) {
    return { data: null, error: "Invalid status" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { data: null, error: "Not authenticated" };

  const patch: Record<string, unknown> = {
    user_id: user.id,
    area: input.area,
  };
  if (input.status !== undefined) patch.status = input.status;
  if (input.notes !== undefined) patch.notes = input.notes;

  const { data, error } = await supabase
    .from("life_area_status")
    .upsert(patch, { onConflict: "user_id,area" })
    .select("id, area, status, notes, updated_at")
    .single();

  if (error) return { data: null, error: error.message };

  revalidatePath("/my-life");

  return {
    data: {
      id: data.id as string,
      area: data.area as LifeAreaKey,
      status: data.status as LifeStatus,
      notes: (data.notes as string | null) ?? "",
      updated_at: (data.updated_at as string | null) ?? null,
    },
    error: null,
  };
}

function defaultRow(area: LifeAreaKey): LifeAreaStatusRow {
  return {
    id: null,
    area,
    status: "yellow",
    notes: "",
    updated_at: null,
  };
}
