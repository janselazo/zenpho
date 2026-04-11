import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import {
  getAgencyDocBySlug,
  getAllAgencyDocs,
  type AgencyDocSlug,
} from "@/lib/crm/agency-docs";
import type { AgencyCustomDocRow, AgencyDocType } from "@/lib/crm/agency-custom-doc";
import { fetchCustomDocBaseline } from "@/lib/crm/agency-custom-doc-server";

export type AgencyHubDocItem = {
  slug: string;
  title: string;
  description: string;
  /** Lucide icon key for custom docs; built-ins ignore and use registry icon. */
  iconKey?: string | null;
};

type HubCardRow = {
  slug: string;
  hidden: boolean;
  title_override: string | null;
  description_override: string | null;
  sort_order: number | null;
};

type HubCandidate = {
  slug: string;
  title: string;
  description: string;
  iconKey?: string | null;
  sortFallback: number;
};

/**
 * Applies `agency_doc_hub_card` title/description overrides to a baseline.
 * Same rules as hub grid cards so the doc detail header stays in sync.
 */
export async function mergeHubCardOverrides(
  slug: string,
  baseline: { title: string; description: string }
): Promise<{ title: string; description: string }> {
  if (!isSupabaseConfigured()) return baseline;

  try {
    const supabase = await createClient();
    const { data: row, error } = await supabase
      .from("agency_doc_hub_card")
      .select("title_override, description_override")
      .eq("slug", slug)
      .maybeSingle();

    if (error || !row) return baseline;

    const r = row as Pick<
      HubCardRow,
      "title_override" | "description_override"
    >;
    const title = r.title_override?.trim()
      ? r.title_override.trim()
      : baseline.title;
    const description = r.description_override?.trim()
      ? r.description_override.trim()
      : baseline.description;
    return { title, description };
  } catch {
    return baseline;
  }
}

/** Canonical title/description for comparing hub card edits (registry or custom row, not overrides). */
export async function getHubCardBaseline(
  slug: string
): Promise<{ title: string; description: string } | null> {
  const reg = getAgencyDocBySlug(slug);
  if (reg) return { title: reg.title, description: reg.description };
  return fetchCustomDocBaseline(slug);
}

/** Registry entry for built-in slugs only (server actions). */
export function getRegistryDefaults(slug: AgencyDocSlug) {
  return getAgencyDocBySlug(slug);
}

/** Visible hub cards: built-in registry + custom docs, merged with hub_card overrides and sort. */
export async function getAgencyHubDocItems(
  docType: AgencyDocType = "doc"
): Promise<AgencyHubDocItem[]> {
  const includeRegistry = docType === "doc";
  const registry = includeRegistry ? getAllAgencyDocs() : [];

  if (!isSupabaseConfigured()) {
    return registry.map((d) => ({
      slug: d.slug,
      title: d.title,
      description: d.description,
    }));
  }

  try {
    const supabase = await createClient();
    const { data: rows, error } = await supabase
      .from("agency_doc_hub_card")
      .select("slug, hidden, title_override, description_override, sort_order")
      .eq("doc_type", docType);

    if (error || !rows) {
      return registry.map((d) => ({
        slug: d.slug,
        title: d.title,
        description: d.description,
      }));
    }

    const map = new Map<string, HubCardRow>(
      (rows as HubCardRow[]).map((r) => [r.slug, r])
    );

    const registryIndex = new Map(
      registry.map((d, i) => [d.slug, i] as const)
    );

    const candidates: HubCandidate[] = [];

    for (const d of registry) {
      const row = map.get(d.slug);
      if (row?.hidden) continue;
      const title = row?.title_override?.trim()
        ? row.title_override.trim()
        : d.title;
      const description = row?.description_override?.trim()
        ? row.description_override.trim()
        : d.description;
      candidates.push({
        slug: d.slug,
        title,
        description,
        sortFallback: (registryIndex.get(d.slug) ?? 0) * 10,
      });
    }

    const { data: customRows, error: customError } = await supabase
      .from("agency_custom_doc")
      .select("slug, title, description, icon_key, created_at")
      .eq("doc_type", docType)
      .order("created_at", { ascending: true });

    if (!customError && customRows?.length) {
      let customIdx = 0;
      for (const c of customRows as Pick<
        AgencyCustomDocRow,
        "slug" | "title" | "description" | "icon_key" | "created_at"
      >[]) {
        const row = map.get(c.slug);
        if (row?.hidden) continue;
        const title = row?.title_override?.trim()
          ? row.title_override.trim()
          : c.title;
        const description = row?.description_override?.trim()
          ? row.description_override.trim()
          : c.description;
        candidates.push({
          slug: c.slug,
          title,
          description,
          iconKey: c.icon_key,
          sortFallback: 100_000 + customIdx * 10,
        });
        customIdx += 1;
      }
    }

    candidates.sort((a, b) => {
      const ra = map.get(a.slug);
      const rb = map.get(b.slug);
      const oa = ra?.sort_order ?? a.sortFallback;
      const ob = rb?.sort_order ?? b.sortFallback;
      if (oa !== ob) return oa - ob;
      return a.slug.localeCompare(b.slug);
    });

    return candidates.map(({ slug, title, description, iconKey }) => ({
      slug,
      title,
      description,
      iconKey,
    }));
  } catch {
    return registry.map((d) => ({
      slug: d.slug,
      title: d.title,
      description: d.description,
    }));
  }
}
