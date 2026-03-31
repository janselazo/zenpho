import type { SupabaseClient } from "@supabase/supabase-js";
import type { PlaybookCategory } from "@/lib/crm/mock-data";
import {
  PLAYBOOK_STRUCTURE_CHANGED_EVENT,
  parseCategoriesJson,
  parseCompletionsDocument,
  parsePriorityActivityIdsFromUnknown,
  serializeCompletionsForStorage,
} from "@/lib/crm/playbook-store";

type PlaybookRow = {
  categories: unknown;
  completions: unknown;
  priority_activity_ids?: unknown;
};

export type UserProspectingPlaybookSnapshot = {
  categories: PlaybookCategory[];
  completions: Record<string, number>;
  priorityActivityIds: string[];
};

/** `found: false` = no row yet. `found: true` = row exists (may have empty categories). */
export async function fetchUserProspectingPlaybook(
  supabase: SupabaseClient,
  userId: string
): Promise<{ found: false } | ({ found: true } & UserProspectingPlaybookSnapshot)> {
  const { data, error } = await supabase
    .from("user_prospecting_playbook")
    .select("categories, completions, priority_activity_ids")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("fetchUserProspectingPlaybook:", error.message);
    return { found: false };
  }
  if (!data) {
    return { found: false };
  }
  const row = data as PlaybookRow;
  return {
    found: true,
    categories: parseCategoriesJson(row.categories) ?? [],
    completions: parseCompletionsDocument(row.completions),
    priorityActivityIds: parsePriorityActivityIdsFromUnknown(
      row.priority_activity_ids
    ),
  };
}

export async function upsertUserProspectingPlaybook(
  supabase: SupabaseClient,
  userId: string,
  categories: PlaybookCategory[],
  completions: Record<string, number>,
  priorityActivityIds: string[]
): Promise<{ error: Error | null }> {
  const completionsDoc = serializeCompletionsForStorage(completions);
  const { error } = await supabase.from("user_prospecting_playbook").upsert(
    {
      user_id: userId,
      categories,
      completions: completionsDoc,
      priority_activity_ids: priorityActivityIds,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );

  if (error) {
    console.error("upsertUserProspectingPlaybook:", error.message);
    return { error: new Error(error.message) };
  }

  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(PLAYBOOK_STRUCTURE_CHANGED_EVENT));
  }
  return { error: null };
}
