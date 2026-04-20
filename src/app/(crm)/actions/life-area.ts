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

export type LifeAreaStatusMap = Record<LifeAreaKey, LifeStatus>;

/**
 * Returns the section-level status for each of the 7 life areas.
 * Unseeded areas default to "yellow".
 */
export async function listLifeAreaStatuses(): Promise<{
  data: LifeAreaStatusMap;
  error: string | null;
}> {
  const defaults = defaultMap();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { data: defaults, error: "Not authenticated" };

  const { data, error } = await supabase
    .from("life_area_status")
    .select("area, status")
    .eq("user_id", user.id);

  if (error) return { data: defaults, error: error.message };

  const out = { ...defaults };
  for (const row of data ?? []) {
    if (isLifeAreaKey(row.area) && isLifeStatus(row.status)) {
      out[row.area] = row.status;
    }
  }
  return { data: out, error: null };
}

export async function setLifeAreaStatusAction(input: {
  area: string;
  status: string;
}): Promise<{ area: LifeAreaKey | null; status: LifeStatus | null; error: string | null }> {
  if (!isLifeAreaKey(input.area)) {
    return { area: null, status: null, error: "Invalid life area" };
  }
  if (!isLifeStatus(input.status)) {
    return { area: null, status: null, error: "Invalid status" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { area: null, status: null, error: "Not authenticated" };

  const { error } = await supabase
    .from("life_area_status")
    .upsert(
      { user_id: user.id, area: input.area, status: input.status },
      { onConflict: "user_id,area" }
    );

  if (error) return { area: null, status: null, error: error.message };

  revalidatePath("/my-life");

  return { area: input.area, status: input.status, error: null };
}

function defaultMap(): LifeAreaStatusMap {
  const out = {} as LifeAreaStatusMap;
  for (const a of LIFE_AREAS) out[a.key] = "yellow";
  return out;
}
