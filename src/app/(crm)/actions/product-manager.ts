"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  DEFAULT_ROADMAP_PHASES,
  DISCOVERY_SECTION_PRESETS,
  type SprintBoardStatus,
  type WorkItemType,
} from "@/lib/crm/product-manager-types";
import {
  parseProductMilestones,
  parseProductResources,
} from "@/lib/crm/product-project-metadata";

function humanizeDb(message: string): string {
  const m = message.toLowerCase();
  const looksMissing =
    m.includes("schema cache") ||
    m.includes("does not exist") ||
    m.includes("pgrst202") ||
    m.includes("pgrst205");
  if (looksMissing && m.includes("project_work")) {
    return (
      "Product Manager tables are not on this database yet. Apply migration " +
      "`20260602120000_product_manager_module.sql`."
    );
  }
  return message;
}

async function assertRootProduct(
  supabase: Awaited<ReturnType<typeof createClient>>,
  productId: string
): Promise<{ ok: true } | { error: string }> {
  const { data, error } = await supabase
    .from("project")
    .select("id, parent_project_id")
    .eq("id", productId)
    .maybeSingle();
  if (error) return { error: humanizeDb(error.message) };
  if (!data || data.parent_project_id) return { error: "Not a product" };
  return { ok: true };
}

async function assertChildOfProduct(
  supabase: Awaited<ReturnType<typeof createClient>>,
  productId: string,
  childId: string
): Promise<{ ok: true } | { error: string }> {
  const { data, error } = await supabase
    .from("project")
    .select("id, parent_project_id")
    .eq("id", childId)
    .maybeSingle();
  if (error) return { error: humanizeDb(error.message) };
  if (!data || (data.parent_project_id as string | null) !== productId) {
    return { error: "Project not under this product" };
  }
  return { ok: true };
}

/** Ensure default roadmap rows for a product. */
export async function ensureRoadmapPhases(
  productId: string
): Promise<{ ok: true } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };
  const pid = productId.trim();
  const root = await assertRootProduct(supabase, pid);
  if ("error" in root) return root;

  const { data: existing, error: cErr } = await supabase
    .from("project_roadmap_phase")
    .select("id")
    .eq("product_id", pid)
    .limit(1);
  if (cErr) return { error: humanizeDb(cErr.message) };
  if (existing?.length) return { ok: true };

  const rows = DEFAULT_ROADMAP_PHASES.map((p) => ({
    product_id: pid,
    phase_slug: p.phase_slug,
    title: p.title,
    description: null as string | null,
    sort_order: p.sort_order,
    status: "planned",
    target_date: null as string | null,
  }));

  const { error } = await supabase.from("project_roadmap_phase").insert(rows);
  if (error) return { error: humanizeDb(error.message) };
  revalidatePath(`/products/${pid}`);
  return { ok: true };
}

export async function createRoadmapPhase(
  productId: string,
  input: { title: string; phase_slug?: string; description?: string | null }
): Promise<{ ok: true; id: string } | { error: string }> {
  const supabase = await createClient();
  if (!(await supabase.auth.getUser()).data.user) return { error: "Unauthorized" };
  const pid = productId.trim();
  const root = await assertRootProduct(supabase, pid);
  if ("error" in root) return root;
  const title = input.title.trim();
  if (!title) return { error: "Title required" };
  const slug =
    (input.phase_slug?.trim() ||
      title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_|_$/g, "")) || "phase";
  const { data: maxRow } = await supabase
    .from("project_roadmap_phase")
    .select("sort_order")
    .eq("product_id", pid)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  const sortOrder = ((maxRow?.sort_order as number) ?? -1) + 1;
  const { data: row, error } = await supabase
    .from("project_roadmap_phase")
    .insert({
      product_id: pid,
      phase_slug: slug,
      title,
      description: input.description?.trim() || null,
      sort_order: sortOrder,
      status: "planned",
    })
    .select("id")
    .single();
  if (error) return { error: humanizeDb(error.message) };
  revalidatePath(`/products/${pid}`);
  return { ok: true, id: row!.id as string };
}

export async function listRoadmapPhases(productId: string) {
  const supabase = await createClient();
  if (!(await supabase.auth.getUser()).data.user) {
    return { rows: [] as Record<string, unknown>[], error: "Unauthorized" };
  }
  const pid = productId.trim();
  await ensureRoadmapPhases(pid);
  const { data, error } = await supabase
    .from("project_roadmap_phase")
    .select("*")
    .eq("product_id", pid)
    .order("sort_order", { ascending: true });
  if (error) return { rows: [], error: humanizeDb(error.message) };
  return { rows: data ?? [], error: null };
}

export async function updateRoadmapPhase(
  productId: string,
  phaseId: string,
  patch: Partial<{
    title: string;
    description: string | null;
    status: string;
    target_date: string | null;
    sort_order: number;
  }>
): Promise<{ ok: true } | { error: string }> {
  const supabase = await createClient();
  if (!(await supabase.auth.getUser()).data.user) return { error: "Unauthorized" };
  const pid = productId.trim();
  const root = await assertRootProduct(supabase, pid);
  if ("error" in root) return root;
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (patch.title !== undefined) updates.title = patch.title.trim();
  if (patch.description !== undefined) updates.description = patch.description;
  if (patch.status !== undefined) updates.status = patch.status.trim();
  if (patch.target_date !== undefined) updates.target_date = patch.target_date;
  if (patch.sort_order !== undefined) updates.sort_order = patch.sort_order;
  const { error } = await supabase
    .from("project_roadmap_phase")
    .update(updates)
    .eq("id", phaseId.trim())
    .eq("product_id", pid);
  if (error) return { error: humanizeDb(error.message) };
  revalidatePath(`/products/${pid}`);
  return { ok: true };
}

/** Ensure discovery section rows exist. */
export async function ensureDiscoverySections(
  productId: string
): Promise<{ ok: true } | { error: string }> {
  const supabase = await createClient();
  if (!(await supabase.auth.getUser()).data.user) return { error: "Unauthorized" };
  const pid = productId.trim();
  const root = await assertRootProduct(supabase, pid);
  if ("error" in root) return root;

  const { data: existing, error: cErr } = await supabase
    .from("project_discovery_section")
    .select("id")
    .eq("product_id", pid)
    .limit(1);
  if (cErr) return { error: humanizeDb(cErr.message) };
  if (existing?.length) return { ok: true };

  const rows = DISCOVERY_SECTION_PRESETS.map((s) => ({
    product_id: pid,
    section_key: s.section_key,
    title: s.title,
    body: "",
    sort_order: s.sort_order,
  }));
  const { error } = await supabase.from("project_discovery_section").insert(rows);
  if (error) return { error: humanizeDb(error.message) };
  revalidatePath(`/products/${pid}`);
  return { ok: true };
}

export async function listDiscoverySections(productId: string) {
  const supabase = await createClient();
  if (!(await supabase.auth.getUser()).data.user) {
    return { rows: [] as Record<string, unknown>[], error: "Unauthorized" };
  }
  const pid = productId.trim();
  await ensureDiscoverySections(pid);
  const { data, error } = await supabase
    .from("project_discovery_section")
    .select("*")
    .eq("product_id", pid)
    .order("sort_order", { ascending: true });
  if (error) return { rows: [], error: humanizeDb(error.message) };
  return { rows: data ?? [], error: null };
}

export async function updateDiscoverySection(
  productId: string,
  sectionId: string,
  patch: { title?: string; body?: string }
): Promise<{ ok: true } | { error: string }> {
  const supabase = await createClient();
  if (!(await supabase.auth.getUser()).data.user) return { error: "Unauthorized" };
  const pid = productId.trim();
  const root = await assertRootProduct(supabase, pid);
  if ("error" in root) return root;
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (patch.title !== undefined) updates.title = patch.title.trim();
  if (patch.body !== undefined) updates.body = patch.body;
  const { error } = await supabase
    .from("project_discovery_section")
    .update(updates)
    .eq("id", sectionId.trim())
    .eq("product_id", pid);
  if (error) return { error: humanizeDb(error.message) };
  revalidatePath(`/products/${pid}`);
  return { ok: true };
}

/** ── Sprints ─────────────────────────────────────────────────────────── */

export async function listSprints(
  productId: string,
  childProjectId: string
) {
  const supabase = await createClient();
  if (!(await supabase.auth.getUser()).data.user) {
    return { rows: [] as Record<string, unknown>[], error: "Unauthorized" };
  }
  const child = childProjectId.trim();
  const pid = productId.trim();
  const ok = await assertChildOfProduct(supabase, pid, child);
  if ("error" in ok) return { rows: [], error: ok.error };
  const { data, error } = await supabase
    .from("project_sprint")
    .select("*")
    .eq("child_project_id", child)
    .order("sort_order", { ascending: true });
  if (error) return { rows: [], error: humanizeDb(error.message) };
  return { rows: data ?? [], error: null };
}

export async function createSprint(
  productId: string,
  childProjectId: string,
  input: { name: string; milestone_label?: string | null; start_date?: string | null; end_date?: string | null }
): Promise<{ ok: true; id: string } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };
  const child = childProjectId.trim();
  const pid = productId.trim();
  const ok = await assertChildOfProduct(supabase, pid, child);
  if ("error" in ok) return ok;
  const name = input.name.trim();
  if (!name) return { error: "Name required" };
  const { data: row, error } = await supabase
    .from("project_sprint")
    .insert({
      child_project_id: child,
      name,
      milestone_label: input.milestone_label?.trim() || null,
      start_date: input.start_date || null,
      end_date: input.end_date || null,
      is_current: false,
      sort_order: 999,
    })
    .select("id")
    .single();
  if (error) return { error: humanizeDb(error.message) };
  revalidatePath(`/products/${pid}`);
  return { ok: true, id: row!.id as string };
}

/** ── Releases ─────────────────────────────────────────────────────────── */

export async function listReleases(productId: string, childProjectId: string) {
  const supabase = await createClient();
  if (!(await supabase.auth.getUser()).data.user) {
    return { rows: [] as Record<string, unknown>[], error: "Unauthorized" };
  }
  const child = childProjectId.trim();
  const pid = productId.trim();
  const ok = await assertChildOfProduct(supabase, pid, child);
  if ("error" in ok) return { rows: [], error: ok.error };
  const { data, error } = await supabase
    .from("project_release")
    .select("*")
    .eq("child_project_id", child)
    .order("sort_order", { ascending: true });
  if (error) return { rows: [], error: humanizeDb(error.message) };
  return { rows: data ?? [], error: null };
}

export async function createRelease(
  productId: string,
  childProjectId: string,
  input: { title: string; target_date?: string | null }
): Promise<{ ok: true; id: string } | { error: string }> {
  const supabase = await createClient();
  if (!(await supabase.auth.getUser()).data.user) return { error: "Unauthorized" };
  const child = childProjectId.trim();
  const pid = productId.trim();
  const ok = await assertChildOfProduct(supabase, pid, child);
  if ("error" in ok) return ok;
  const title = input.title.trim();
  if (!title) return { error: "Title required" };
  const { data: row, error } = await supabase
    .from("project_release")
    .insert({
      child_project_id: child,
      title,
      target_date: input.target_date || null,
      sort_order: 999,
    })
    .select("id")
    .single();
  if (error) return { error: humanizeDb(error.message) };
  revalidatePath(`/products/${pid}`);
  return { ok: true, id: row!.id as string };
}

export async function updateRelease(
  productId: string,
  releaseId: string,
  patch: Partial<{
    title: string;
    target_date: string | null;
    approval_status: string;
    completion_pct: number;
    dependencies: string | null;
    notes: string | null;
    owner_member_id: string | null;
  }>
): Promise<{ ok: true } | { error: string }> {
  const supabase = await createClient();
  if (!(await supabase.auth.getUser()).data.user) return { error: "Unauthorized" };
  const pid = productId.trim();
  const root = await assertRootProduct(supabase, pid);
  if ("error" in root) return root;

  const { data: rel, error: gErr } = await supabase
    .from("project_release")
    .select("child_project_id")
    .eq("id", releaseId.trim())
    .maybeSingle();
  if (gErr) return { error: humanizeDb(gErr.message) };
  if (!rel) return { error: "Release not found" };
  const chk = await assertChildOfProduct(
    supabase,
    pid,
    rel.child_project_id as string
  );
  if ("error" in chk) return chk;

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (patch.title !== undefined) updates.title = patch.title.trim();
  if (patch.target_date !== undefined) updates.target_date = patch.target_date;
  if (patch.approval_status !== undefined) {
    updates.approval_status = patch.approval_status.trim();
  }
  if (patch.completion_pct !== undefined) updates.completion_pct = patch.completion_pct;
  if (patch.dependencies !== undefined) updates.dependencies = patch.dependencies;
  if (patch.notes !== undefined) updates.notes = patch.notes;
  if (patch.owner_member_id !== undefined) {
    updates.owner_member_id = patch.owner_member_id;
  }
  const { error } = await supabase
    .from("project_release")
    .update(updates)
    .eq("id", releaseId.trim());
  if (error) return { error: humanizeDb(error.message) };
  revalidatePath(`/products/${pid}`);
  return { ok: true };
}

/** ── Work items ──────────────────────────────────────────────────────── */

const BOARD = new Set<string>([
  "ready",
  "in_progress",
  "code_review",
  "qa",
  "client_review",
  "done",
  "blocked",
]);

const ITEM_TYPES = new Set<string>([
  "feature",
  "user_story",
  "task",
  "bug",
  "improvement",
  "client_request",
]);

export async function listWorkItems(
  productId: string,
  childProjectId: string,
  opts?: { sprintId?: string | null; backlogOnly?: boolean }
) {
  const supabase = await createClient();
  if (!(await supabase.auth.getUser()).data.user) {
    return { rows: [] as Record<string, unknown>[], error: "Unauthorized" };
  }
  const child = childProjectId.trim();
  const pid = productId.trim();
  const ok = await assertChildOfProduct(supabase, pid, child);
  if ("error" in ok) return { rows: [], error: ok.error };
  let q = supabase
    .from("project_work_item")
    .select("*")
    .eq("child_project_id", child)
    .order("sort_order", { ascending: true });
  if (opts?.backlogOnly) q = q.is("sprint_id", null);
  if (opts?.sprintId) q = q.eq("sprint_id", opts.sprintId);
  const { data, error } = await q;
  if (error) return { rows: [], error: humanizeDb(error.message) };
  return { rows: data ?? [], error: null };
}

export async function createWorkItem(
  productId: string,
  childProjectId: string,
  input: {
    title: string;
    description?: string | null;
    item_type?: WorkItemType;
    priority?: string | null;
    sprint_id?: string | null;
    board_status?: SprintBoardStatus;
    release_id?: string | null;
    estimate_hours?: number | null;
    assignee_member_id?: string | null;
    acceptance_criteria?: string | null;
  }
): Promise<{ ok: true; id: string } | { error: string }> {
  const supabase = await createClient();
  if (!(await supabase.auth.getUser()).data.user) return { error: "Unauthorized" };
  const child = childProjectId.trim();
  const pid = productId.trim();
  const ok = await assertChildOfProduct(supabase, pid, child);
  if ("error" in ok) return ok;
  const title = input.title.trim();
  if (!title) return { error: "Title required" };
  const it = (input.item_type ?? "task").trim();
  if (!ITEM_TYPES.has(it)) return { error: "Invalid type" };
  const bs = (input.board_status ?? "ready").trim();
  if (!BOARD.has(bs)) return { error: "Invalid board status" };
  const { data: row, error } = await supabase
    .from("project_work_item")
    .insert({
      child_project_id: child,
      title,
      description: input.description?.trim() || null,
      item_type: it,
      priority: input.priority?.trim() || null,
      sprint_id: input.sprint_id ?? null,
      release_id: input.release_id ?? null,
      estimate_hours: input.estimate_hours ?? null,
      assignee_member_id: input.assignee_member_id?.trim() || null,
      board_status: bs,
      acceptance_criteria: input.acceptance_criteria?.trim() || null,
    })
    .select("id")
    .single();
  if (error) return { error: humanizeDb(error.message) };
  revalidatePath(`/products/${pid}`);
  return { ok: true, id: row!.id as string };
}

export async function updateWorkItem(
  productId: string,
  workItemId: string,
  patch: Partial<{
    title: string;
    description: string | null;
    item_type: string;
    priority: string | null;
    sprint_id: string | null;
    release_id: string | null;
    board_status: string;
    estimate_hours: number | null;
    assignee_member_id: string | null;
    acceptance_criteria: string | null;
  }>
): Promise<{ ok: true } | { error: string }> {
  const supabase = await createClient();
  if (!(await supabase.auth.getUser()).data.user) return { error: "Unauthorized" };
  const pid = productId.trim();
  const root = await assertRootProduct(supabase, pid);
  if ("error" in root) return root;

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (patch.title !== undefined) updates.title = patch.title.trim();
  if (patch.description !== undefined) updates.description = patch.description;
  if (patch.item_type !== undefined) {
    if (!ITEM_TYPES.has(patch.item_type.trim())) return { error: "Invalid type" };
    updates.item_type = patch.item_type.trim();
  }
  if (patch.priority !== undefined) updates.priority = patch.priority;
  if (patch.sprint_id !== undefined) updates.sprint_id = patch.sprint_id;
  if (patch.release_id !== undefined) updates.release_id = patch.release_id;
  if (patch.board_status !== undefined) {
    if (!BOARD.has(patch.board_status.trim())) return { error: "Invalid status" };
    updates.board_status = patch.board_status.trim();
  }
  if (patch.estimate_hours !== undefined) updates.estimate_hours = patch.estimate_hours;
  if (patch.assignee_member_id !== undefined) {
    updates.assignee_member_id = patch.assignee_member_id;
  }
  if (patch.acceptance_criteria !== undefined) {
    updates.acceptance_criteria = patch.acceptance_criteria;
  }

  const { data: row, error: fErr } = await supabase
    .from("project_work_item")
    .select("id, child_project_id")
    .eq("id", workItemId.trim())
    .maybeSingle();
  if (fErr) return { error: humanizeDb(fErr.message) };
  if (!row) return { error: "Not found" };
  const chk = await assertChildOfProduct(
    supabase,
    pid,
    row.child_project_id as string
  );
  if ("error" in chk) return chk;

  const { error } = await supabase
    .from("project_work_item")
    .update(updates)
    .eq("id", workItemId.trim());
  if (error) return { error: humanizeDb(error.message) };
  revalidatePath(`/products/${pid}`);
  return { ok: true };
}

export async function deleteWorkItem(
  productId: string,
  workItemId: string
): Promise<{ ok: true } | { error: string }> {
  const supabase = await createClient();
  if (!(await supabase.auth.getUser()).data.user) return { error: "Unauthorized" };
  const pid = productId.trim();
  await assertRootProduct(supabase, pid);

  const { data: row, error: fErr } = await supabase
    .from("project_work_item")
    .select("child_project_id")
    .eq("id", workItemId.trim())
    .maybeSingle();
  if (fErr) return { error: humanizeDb(fErr.message) };
  if (!row) return { error: "Not found" };
  const chk = await assertChildOfProduct(
    supabase,
    pid,
    row.child_project_id as string
  );
  if ("error" in chk) return chk;

  const { error } = await supabase
    .from("project_work_item")
    .delete()
    .eq("id", workItemId.trim());
  if (error) return { error: humanizeDb(error.message) };
  revalidatePath(`/products/${pid}`);
  return { ok: true };
}

/** ── PM resources (structured) ─────────────────────────────────────────── */

export async function listPmResources(productId: string) {
  const supabase = await createClient();
  if (!(await supabase.auth.getUser()).data.user) {
    return { rows: [] as Record<string, unknown>[], error: "Unauthorized" };
  }
  const pid = productId.trim();
  const root = await assertRootProduct(supabase, pid);
  if ("error" in root) return { rows: [], error: root.error };
  const { data, error } = await supabase
    .from("project_manager_resource")
    .select("*")
    .eq("product_id", pid)
    .order("category", { ascending: true })
    .order("sort_order", { ascending: true });
  if (error) return { rows: [], error: humanizeDb(error.message) };
  return { rows: data ?? [], error: null };
}

export async function createPmResource(
  productId: string,
  input: {
    category: string;
    label: string;
    body?: string | null;
    url?: string | null;
    is_secret?: boolean;
    secret_placeholder?: string | null;
  }
): Promise<{ ok: true; id: string } | { error: string }> {
  const supabase = await createClient();
  if (!(await supabase.auth.getUser()).data.user) return { error: "Unauthorized" };
  const pid = productId.trim();
  const root = await assertRootProduct(supabase, pid);
  if ("error" in root) return root;
  const label = input.label.trim();
  if (!label) return { error: "Label required" };
  const { data: row, error } = await supabase
    .from("project_manager_resource")
    .insert({
      product_id: pid,
      category: input.category.trim(),
      label,
      body: input.body?.trim() || null,
      url: input.url?.trim() || null,
      is_secret: Boolean(input.is_secret),
      secret_placeholder: input.secret_placeholder?.trim() || null,
    })
    .select("id")
    .single();
  if (error) return { error: humanizeDb(error.message) };
  revalidatePath(`/products/${pid}`);
  return { ok: true, id: row!.id as string };
}

export async function updatePmResource(
  productId: string,
  resourceId: string,
  patch: Partial<{
    label: string;
    body: string | null;
    url: string | null;
    is_secret: boolean;
    secret_placeholder: string | null;
  }>
): Promise<{ ok: true } | { error: string }> {
  const supabase = await createClient();
  if (!(await supabase.auth.getUser()).data.user) return { error: "Unauthorized" };
  const pid = productId.trim();
  const root = await assertRootProduct(supabase, pid);
  if ("error" in root) return root;
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (patch.label !== undefined) updates.label = patch.label.trim();
  if (patch.body !== undefined) updates.body = patch.body;
  if (patch.url !== undefined) updates.url = patch.url;
  if (patch.is_secret !== undefined) updates.is_secret = patch.is_secret;
  if (patch.secret_placeholder !== undefined) {
    updates.secret_placeholder = patch.secret_placeholder;
  }
  const { error } = await supabase
    .from("project_manager_resource")
    .update(updates)
    .eq("id", resourceId.trim())
    .eq("product_id", pid);
  if (error) return { error: humanizeDb(error.message) };
  revalidatePath(`/products/${pid}`);
  return { ok: true };
}

export async function deletePmResource(
  productId: string,
  resourceId: string
): Promise<{ ok: true } | { error: string }> {
  const supabase = await createClient();
  if (!(await supabase.auth.getUser()).data.user) return { error: "Unauthorized" };
  const pid = productId.trim();
  const { error } = await supabase
    .from("project_manager_resource")
    .delete()
    .eq("id", resourceId.trim())
    .eq("product_id", pid);
  if (error) return { error: humanizeDb(error.message) };
  revalidatePath(`/products/${pid}`);
  return { ok: true };
}

/** ── Import browser workspace JSON into DB (one-time per user/browser) ─── */

type ImportWorkspacePayload = {
  sprints?: {
    id: string;
    name: string;
    milestone: string;
    startDate: string;
    endDate: string;
    isCurrent: boolean;
  }[];
  tasks?: {
    id: string;
    title: string;
    status: string;
    sprintId: string | null;
    description?: string;
    priority?: string;
    estimateHours?: number;
    assigneeId?: string | null;
    endDate?: string;
    productMilestoneId?: string | null;
  }[];
};

function mapLegacyStatusToBoard(status: string): SprintBoardStatus {
  switch (status) {
    case "not_started":
      return "ready";
    case "action_started":
    case "in_progress":
      return "in_progress";
    case "test_qa":
      return "qa";
    case "completed":
      return "done";
    default:
      return "ready";
  }
}

export async function importWorkspaceFromBrowser(
  productId: string,
  childProjectId: string,
  payload: ImportWorkspacePayload
): Promise<{ ok: true; imported: { sprints: number; tasks: number } } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };
  const child = childProjectId.trim();
  const pid = productId.trim();
  const ok = await assertChildOfProduct(supabase, pid, child);
  if ("error" in ok) return ok;

  const idMap = new Map<string, string>();
  let sprintCount = 0;
  const sprints = payload.sprints ?? [];
  for (let i = 0; i < sprints.length; i++) {
    const s = sprints[i];
    const { data: row, error } = await supabase
      .from("project_sprint")
      .insert({
        child_project_id: child,
        name: s.name || "Sprint",
        milestone_label: s.milestone || null,
        start_date: s.startDate?.slice(0, 10) || null,
        end_date: s.endDate?.slice(0, 10) || null,
        is_current: Boolean(s.isCurrent),
        sort_order: i,
      })
      .select("id")
      .single();
    if (error) return { error: humanizeDb(error.message) };
    idMap.set(s.id, row!.id as string);
    sprintCount += 1;
  }

  let taskCount = 0;
  for (const t of payload.tasks ?? []) {
    const newSprintId =
      t.sprintId && idMap.has(t.sprintId) ? idMap.get(t.sprintId)! : null;
    const board = mapLegacyStatusToBoard(t.status ?? "not_started");
    const pr = (t.priority ?? "").toLowerCase();
    const priority =
      pr === "low" || pr === "medium" || pr === "high" || pr === "urgent"
        ? pr
        : null;
    const { error } = await supabase.from("project_work_item").insert({
      child_project_id: child,
      sprint_id: newSprintId,
      title: t.title || "Untitled",
      description: t.description?.trim() || null,
      item_type: "task",
      priority,
      estimate_hours: t.estimateHours ?? null,
      assignee_member_id: t.assigneeId?.trim() || null,
      board_status: board,
      acceptance_criteria: null,
      product_milestone_uuid: t.productMilestoneId ?? null,
    });
    if (error) return { error: humanizeDb(error.message) };
    taskCount += 1;
  }

  revalidatePath(`/products/${pid}`);
  return { ok: true, imported: { sprints: sprintCount, tasks: taskCount } };
}

/** Copy `metadata.milestones` on the child project into `project_release` when missing. */
export async function migrateChildMilestonesToReleases(
  productId: string,
  childProjectId: string
): Promise<{ ok: true; created: number } | { error: string }> {
  const supabase = await createClient();
  if (!(await supabase.auth.getUser()).data.user) return { error: "Unauthorized" };
  const child = childProjectId.trim();
  const pid = productId.trim();
  const gate = await assertChildOfProduct(supabase, pid, child);
  if ("error" in gate) return gate;

  const { data: row, error: rErr } = await supabase
    .from("project")
    .select("metadata")
    .eq("id", child)
    .maybeSingle();
  if (rErr) return { error: humanizeDb(rErr.message) };
  const milestones = parseProductMilestones(row?.metadata);
  if (milestones.length === 0) return { ok: true, created: 0 };

  const { data: existing, error: lErr } = await supabase
    .from("project_release")
    .select("title")
    .eq("child_project_id", child);
  if (lErr) return { error: humanizeDb(lErr.message) };
  const titles = new Set(
    (existing ?? []).map((e) => (e.title as string).trim().toLowerCase())
  );

  let created = 0;
  for (let i = 0; i < milestones.length; i++) {
    const m = milestones[i];
    const title = m.title.trim();
    if (!title) continue;
    if (titles.has(title.toLowerCase())) continue;
    const { error: iErr } = await supabase.from("project_release").insert({
      child_project_id: child,
      title,
      target_date: m.targetDate?.trim() ? m.targetDate.trim().slice(0, 10) : null,
      sort_order: i,
    });
    if (iErr) return { error: humanizeDb(iErr.message) };
    titles.add(title.toLowerCase());
    created += 1;
  }
  revalidatePath(`/products/${pid}`);
  return { ok: true, created };
}

/** Copy root `metadata.productResources` into `project_manager_resource` (`links`). */
export async function migrateProductResourcesToPmTable(
  productId: string
): Promise<{ ok: true; created: number } | { error: string }> {
  const supabase = await createClient();
  if (!(await supabase.auth.getUser()).data.user) return { error: "Unauthorized" };
  const pid = productId.trim();
  const root = await assertRootProduct(supabase, pid);
  if ("error" in root) return root;

  const { data: row, error: rErr } = await supabase
    .from("project")
    .select("metadata")
    .eq("id", pid)
    .maybeSingle();
  if (rErr) return { error: humanizeDb(rErr.message) };
  const resources = parseProductResources(row?.metadata);

  const { data: existing, error: lErr } = await supabase
    .from("project_manager_resource")
    .select("label, url")
    .eq("product_id", pid);
  if (lErr) return { error: humanizeDb(lErr.message) };

  const keyOf = (label: string, url: string) =>
    `${label.trim().toLowerCase()}|${url.trim()}`;
  const keys = new Set(
    (existing ?? []).map((e) =>
      keyOf(String(e.label ?? ""), String(e.url ?? ""))
    )
  );

  let created = 0;
  let ord = (existing?.length ?? 0) + 1;
  for (const r of resources) {
    const label = r.label.trim();
    const url = r.url.trim();
    if (!label && !url) continue;
    const k = keyOf(label || url || "link", url || label);
    if (keys.has(k)) continue;
    const { error: iErr } = await supabase.from("project_manager_resource").insert({
      product_id: pid,
      category: "links",
      label: label || url || "Link",
      body: null,
      url: url || null,
      is_secret: false,
      sort_order: ord++,
    });
    if (iErr) return { error: humanizeDb(iErr.message) };
    keys.add(k);
    created += 1;
  }
  revalidatePath(`/products/${pid}`);
  return { ok: true, created };
}

const WORKFLOW_DOMAINS = new Set(["task_board", "bug"]);

export async function listWorkflowStatuses(
  productId: string,
  childProjectId: string,
  domain: "task_board" | "bug"
) {
  const supabase = await createClient();
  if (!(await supabase.auth.getUser()).data.user) {
    return { rows: [] as Record<string, unknown>[], error: "Unauthorized" };
  }
  const child = childProjectId.trim();
  const pid = productId.trim();
  const gate = await assertChildOfProduct(supabase, pid, child);
  if ("error" in gate) return { rows: [], error: gate.error };

  const { data, error } = await supabase
    .from("project_workflow_status")
    .select("*")
    .eq("child_project_id", child)
    .eq("domain", domain)
    .order("sort_order", { ascending: true });
  if (error) return { rows: [], error: humanizeDb(error.message) };
  return { rows: data ?? [], error: null };
}

export async function createWorkflowStatus(
  productId: string,
  childProjectId: string,
  input: {
    domain: "task_board" | "bug";
    slug: string;
    label: string;
    color?: string | null;
  }
): Promise<{ ok: true; id: string } | { error: string }> {
  const supabase = await createClient();
  if (!(await supabase.auth.getUser()).data.user) return { error: "Unauthorized" };
  const child = childProjectId.trim();
  const pid = productId.trim();
  const gate = await assertChildOfProduct(supabase, pid, child);
  if ("error" in gate) return gate;
  const dom = input.domain.trim();
  if (!WORKFLOW_DOMAINS.has(dom)) return { error: "Invalid domain" };
  const slug = input.slug.trim().toLowerCase().replace(/\s+/g, "_");
  const label = input.label.trim();
  if (!slug || !label) return { error: "Slug and label required" };

  const { data: maxRow } = await supabase
    .from("project_workflow_status")
    .select("sort_order")
    .eq("child_project_id", child)
    .eq("domain", dom)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  const sortOrder = ((maxRow?.sort_order as number) ?? -1) + 1;

  const { data: row, error } = await supabase
    .from("project_workflow_status")
    .insert({
      child_project_id: child,
      domain: dom,
      slug,
      label,
      color: input.color?.trim() || null,
      sort_order: sortOrder,
    })
    .select("id")
    .single();
  if (error) return { error: humanizeDb(error.message) };
  revalidatePath(`/products/${pid}`);
  return { ok: true, id: row!.id as string };
}

export async function deleteWorkflowStatus(
  productId: string,
  rowId: string
): Promise<{ ok: true } | { error: string }> {
  const supabase = await createClient();
  if (!(await supabase.auth.getUser()).data.user) return { error: "Unauthorized" };
  const pid = productId.trim();
  await assertRootProduct(supabase, pid);

  const { data: r, error: fErr } = await supabase
    .from("project_workflow_status")
    .select("child_project_id")
    .eq("id", rowId.trim())
    .maybeSingle();
  if (fErr) return { error: humanizeDb(fErr.message) };
  if (!r) return { error: "Not found" };
  const gate = await assertChildOfProduct(
    supabase,
    pid,
    r.child_project_id as string
  );
  if ("error" in gate) return gate;

  const { error } = await supabase
    .from("project_workflow_status")
    .delete()
    .eq("id", rowId.trim());
  if (error) return { error: humanizeDb(error.message) };
  revalidatePath(`/products/${pid}`);
  return { ok: true };
}
