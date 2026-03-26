"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  getHubCardBaseline,
} from "@/lib/crm/agency-docs-hub";
import {
  customDocSlugExists,
  fetchAllCustomSlugs,
  fetchCustomDocBySlug,
} from "@/lib/crm/agency-custom-doc-server";
import {
  isValidCustomDocSlugFormat,
  slugifyTitle,
} from "@/lib/crm/agency-custom-doc";
import { pickAgencyDocIconKey } from "@/lib/crm/agency-doc-icon-pick";
import {
  getAllAgencyDocs,
  isAgencyDocSlug,
  RESERVED_REGISTRY_SLUGS,
} from "@/lib/crm/agency-docs";

async function isAllowedWorkspaceDocSlug(slug: string): Promise<boolean> {
  if (isAgencyDocSlug(slug)) return true;
  const row = await fetchCustomDocBySlug(slug);
  return Boolean(row);
}

export async function saveAgencyWorkspaceDoc(slug: string, body: string) {
  if (!(await isAllowedWorkspaceDocSlug(slug))) {
    return { error: "Invalid document" as const };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" as const };

  const { error } = await supabase.from("agency_workspace_doc").upsert(
    {
      slug,
      body,
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "slug" }
  );

  if (error) return { error: error.message };
  revalidatePath(`/docs/${slug}`);
  revalidatePath("/docs");
  return { ok: true as const };
}

export async function updateAgencyDocHubCard(
  slug: string,
  title: string,
  description: string
) {
  const baseline = await getHubCardBaseline(slug);
  if (!baseline) return { error: "Invalid document" as const };

  const t = title.trim();
  const desc = description.trim();
  if (!t) return { error: "Title is required." as const };
  if (!desc) return { error: "Description is required." as const };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" as const };

  const titleOverride = t === baseline.title ? null : t;
  const descriptionOverride = desc === baseline.description ? null : desc;

  const { data: existing } = await supabase
    .from("agency_doc_hub_card")
    .select("sort_order")
    .eq("slug", slug)
    .maybeSingle();

  const { error } = await supabase.from("agency_doc_hub_card").upsert(
    {
      slug,
      hidden: false,
      title_override: titleOverride,
      description_override: descriptionOverride,
      sort_order: existing?.sort_order ?? null,
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "slug" }
  );

  if (error) return { error: error.message };
  revalidatePath("/docs");
  return { ok: true as const };
}

export async function hideAgencyDocHubCard(slug: string) {
  const baseline = await getHubCardBaseline(slug);
  if (!baseline) return { error: "Invalid document" as const };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" as const };

  const now = new Date().toISOString();
  const { data: existing } = await supabase
    .from("agency_doc_hub_card")
    .select("slug")
    .eq("slug", slug)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("agency_doc_hub_card")
      .update({
        hidden: true,
        updated_by: user.id,
        updated_at: now,
      })
      .eq("slug", slug);
    if (error) return { error: error.message };
  } else {
    const { error } = await supabase.from("agency_doc_hub_card").insert({
      slug,
      hidden: true,
      updated_by: user.id,
      updated_at: now,
    });
    if (error) return { error: error.message };
  }

  revalidatePath("/docs");
  return { ok: true as const };
}

async function allowedHubSlugSet(): Promise<Set<string>> {
  const custom = await fetchAllCustomSlugs();
  return new Set([
    ...getAllAgencyDocs().map((d) => d.slug as string),
    ...custom,
  ]);
}

export async function reorderAgencyDocHubCards(orderedSlugs: string[]) {
  if (!orderedSlugs.length) {
    return { error: "Nothing to reorder." as const };
  }

  const allowed = await allowedHubSlugSet();
  const seen = new Set<string>();
  for (const s of orderedSlugs) {
    if (!allowed.has(s)) {
      return { error: "Invalid document order." as const };
    }
    if (seen.has(s)) return { error: "Invalid document order." as const };
    seen.add(s);
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" as const };

  const now = new Date().toISOString();

  for (let i = 0; i < orderedSlugs.length; i++) {
    const slug = orderedSlugs[i];
    const sort_order = i * 10;
    const { data: row } = await supabase
      .from("agency_doc_hub_card")
      .select("slug")
      .eq("slug", slug)
      .maybeSingle();

    if (row) {
      const { error } = await supabase
        .from("agency_doc_hub_card")
        .update({
          sort_order,
          updated_by: user.id,
          updated_at: now,
        })
        .eq("slug", slug);
      if (error) return { error: error.message };
    } else {
      const { error } = await supabase.from("agency_doc_hub_card").insert({
        slug,
        sort_order,
        hidden: false,
        updated_by: user.id,
        updated_at: now,
      });
      if (error) return { error: error.message };
    }
  }

  revalidatePath("/docs");
  return { ok: true as const };
}

export async function createAgencyCustomDoc(form: {
  title: string;
  description: string;
}) {
  const title = form.title.trim();
  const desc = form.description.trim();
  if (!title) return { error: "Title is required." as const };
  if (!desc) return { error: "Description is required." as const };

  const slug = slugifyTitle(title);

  if (!isValidCustomDocSlugFormat(slug)) {
    return {
      error:
        "Use a short URL slug: lowercase letters, numbers, and hyphens only (e.g. my-playbook).",
    } as const;
  }

  if (RESERVED_REGISTRY_SLUGS.has(slug)) {
    return {
      error: "That slug is reserved for a built-in document.",
    } as const;
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" as const };

  let candidate = slug;
  let n = 2;
  while (await customDocSlugExists(candidate)) {
    candidate = `${slug}-${n}`;
    n += 1;
    if (n > 100) {
      return { error: "Could not find an available slug." as const };
    }
  }

  const icon_key = pickAgencyDocIconKey(title, desc);

  const { error: docErr } = await supabase.from("agency_custom_doc").insert({
    slug: candidate,
    title,
    description: desc,
    icon_key,
    created_by: user.id,
  });

  if (docErr) return { error: docErr.message };

  const { data: maxRow } = await supabase
    .from("agency_doc_hub_card")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextSort = (maxRow?.sort_order ?? 0) + 10;
  const now = new Date().toISOString();

  const { error: hubErr } = await supabase.from("agency_doc_hub_card").insert({
    slug: candidate,
    hidden: false,
    sort_order: nextSort,
    updated_by: user.id,
    updated_at: now,
  });

  if (hubErr) {
    await supabase.from("agency_custom_doc").delete().eq("slug", candidate);
    return { error: hubErr.message };
  }

  revalidatePath("/docs");
  return { ok: true as const, slug: candidate };
}
