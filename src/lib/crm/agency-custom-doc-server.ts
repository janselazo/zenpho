import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import type { AgencyCustomDocRow, AgencyDocType } from "@/lib/crm/agency-custom-doc";

export async function fetchCustomDocBySlug(
  slug: string
): Promise<AgencyCustomDocRow | null> {
  if (!isSupabaseConfigured()) return null;
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("agency_custom_doc")
      .select("id, slug, title, description, icon_key, doc_type, created_at, created_by")
      .eq("slug", slug)
      .maybeSingle();
    if (error || !data) return null;
    return data as AgencyCustomDocRow;
  } catch {
    return null;
  }
}

/** Canonical title/description from DB for hub-card edit baseline (not merged with overrides). */
export async function fetchCustomDocBaseline(
  slug: string
): Promise<{ title: string; description: string } | null> {
  const row = await fetchCustomDocBySlug(slug);
  if (!row) return null;
  return { title: row.title, description: row.description };
}

export async function customDocSlugExists(slug: string): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("agency_custom_doc")
      .select("slug")
      .eq("slug", slug)
      .maybeSingle();
    if (error) return false;
    return Boolean(data);
  } catch {
    return false;
  }
}

export async function fetchAllCustomSlugs(
  docType: AgencyDocType = "doc"
): Promise<string[]> {
  if (!isSupabaseConfigured()) return [];
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("agency_custom_doc")
      .select("slug")
      .eq("doc_type", docType);
    if (error || !data) return [];
    return data.map((r: { slug: string }) => r.slug);
  } catch {
    return [];
  }
}
