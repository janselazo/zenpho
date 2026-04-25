import type { SupabaseClient } from "@supabase/supabase-js";
import type { StartupSignalFilters, StartupSignalHit } from "@/lib/crm/startup-signal-types";

export type StartupSignalPersistResult = {
  insertedCount: number;
  updatedCount: number;
  warning: string | null;
};

function signalRow(hit: StartupSignalHit) {
  return {
    source: hit.source,
    source_item_id: hit.sourceItemId,
    source_label: hit.sourceLabel,
    channel: hit.channel,
    title: hit.title,
    excerpt: hit.excerpt,
    url: hit.url,
    author_name: hit.authorName,
    author_url: hit.authorUrl,
    company: hit.company,
    company_domain: hit.companyDomain,
    posted_at: hit.postedAt,
    detected_at: hit.detectedAt,
    fit_score: hit.fit.score,
    fit_tier: hit.fit.tier,
    fit_breakdown: hit.fit.breakdown,
    intent_keys: hit.fit.intentKeys,
    raw_payload: hit.rawPayload,
    updated_at: new Date().toISOString(),
  };
}

export async function persistStartupSignalHits(
  supabase: SupabaseClient,
  hits: StartupSignalHit[]
): Promise<StartupSignalPersistResult> {
  if (!hits.length) return { insertedCount: 0, updatedCount: 0, warning: null };

  const rows = hits.map(signalRow);
  const { data, error } = await supabase
    .from("prospect_signal_hit")
    .upsert(rows, { onConflict: "source,source_item_id" })
    .select("id");

  if (error) {
    return { insertedCount: 0, updatedCount: 0, warning: error.message };
  }

  return {
    insertedCount: data?.length ?? rows.length,
    updatedCount: 0,
    warning: null,
  };
}

export async function createSignalMonitorRun(
  supabase: SupabaseClient,
  input: {
    sourceGroup: string;
    status: "succeeded" | "failed";
    filters: StartupSignalFilters;
    insertedCount: number;
    updatedCount?: number;
    warning?: string | null;
    error?: string | null;
    startedAt: string;
  }
) {
  await supabase.from("prospect_signal_monitor_run").insert({
    source_group: input.sourceGroup,
    status: input.status,
    started_at: input.startedAt,
    completed_at: new Date().toISOString(),
    inserted_count: input.insertedCount,
    updated_count: input.updatedCount ?? 0,
    warning: input.warning ?? null,
    error: input.error ?? null,
    filters: input.filters as never,
  });
}
