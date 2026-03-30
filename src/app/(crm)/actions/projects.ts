"use server";

import { revalidatePath } from "next/cache";
import { resolveOrCreateClientForLead } from "@/app/(crm)/actions/crm";
import { createClient } from "@/lib/supabase/server";
import {
  projectRowToMock,
  type ProjectRow,
  type CrmProjectPersistInput,
} from "@/lib/crm/map-project-row";
import type { MockProject, PlanStage } from "@/lib/crm/mock-data";
import type { ProductMilestoneMeta } from "@/lib/crm/product-project-metadata";
import type { WorkspaceResource } from "@/lib/crm/project-workspace-types";

const PLAN_SET = new Set<string>([
  "pipeline",
  "planning",
  "mvp",
  "growth",
]);

function humanizeProjectDbError(message: string): string {
  const m = message.toLowerCase();
  const looksMissing =
    m.includes("schema cache") ||
    m.includes("does not exist") ||
    m.includes("pgrst202") ||
    m.includes("pgrst205");
  if (
    looksMissing &&
    (    m.includes("project") ||
      m.includes("plan_stage") ||
      m.includes("metadata") ||
      m.includes("parent_project"))
  ) {
    return (
      "Project columns are not on this database yet. Apply " +
      "`supabase/migrations` through `20260429120000_product_phase_issue.sql` (or run `supabase db push`)."
    );
  }
  return message;
}

function parseTargetDate(raw: string | null | undefined): string | null {
  const s = (raw ?? "").trim();
  if (!s || s === "TBD") return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const t = Date.parse(s);
  if (Number.isNaN(t)) return null;
  const d = new Date(t);
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${mo}-${day}`;
}

export async function listCrmProjectsForAgency(): Promise<{
  projects: MockProject[];
  error: string | null;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { projects: [], error: "Unauthorized" };

  const { data: rows, error } = await supabase
    .from("project")
    .select(
      "id, client_id, title, description, status, target_date, website, budget, plan_stage, project_type, metadata, parent_project_id"
    )
    .is("parent_project_id", null)
    .order("created_at", { ascending: false })
    .limit(500);

  if (error) {
    return { projects: [], error: humanizeProjectDbError(error.message) };
  }
  if (!rows?.length) return { projects: [], error: null };

  const clientIds = [...new Set(rows.map((r) => r.client_id as string))];
  const { data: clients } = await supabase
    .from("client")
    .select("id, name, email, company")
    .in("id", clientIds);

  const labelFor = (cid: string) => {
    const c = clients?.find((x) => x.id === cid);
    if (!c) return "Client";
    const parts = [c.name?.trim(), c.company?.trim()].filter(Boolean) as string[];
    if (parts.length) return parts.join(" · ");
    return c.email?.trim() || "Client";
  };

  const productIds = (rows as ProjectRow[]).map((r) => r.id);
  const { data: phaseRows } = await supabase
    .from("project")
    .select("id, parent_project_id")
    .in("parent_project_id", productIds)
    .order("created_at", { ascending: true });

  const primaryPhaseByProduct = new Map<string, string>();
  for (const ph of phaseRows ?? []) {
    const pid = ph.parent_project_id as string;
    if (!primaryPhaseByProduct.has(pid)) {
      primaryPhaseByProduct.set(pid, ph.id as string);
    }
  }

  const projects = (rows as ProjectRow[]).map((row) =>
    projectRowToMock(row, labelFor(row.client_id), {
      primaryPhaseId: primaryPhaseByProduct.get(row.id) ?? null,
    })
  );
  return { projects, error: null };
}

export async function createCrmProject(
  input: CrmProjectPersistInput
): Promise<{ ok: true; id: string; phaseId: string } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const clientId = input.clientId.trim();
  if (!clientId) return { error: "Select a client" };
  const title = input.title.trim();
  if (!title) return { error: "Title is required" };
  if (!PLAN_SET.has(input.plan)) return { error: "Invalid plan stage" };

  const target_date = parseTargetDate(input.expectedEndDate);
  const metadata = {
    teamId: input.teamId.trim() || "team-general",
    teamName: input.teamName?.trim() || null,
  };

  const { data: productRow, error: prodErr } = await supabase
    .from("project")
    .insert({
      client_id: clientId,
      title,
      description: null,
      status: "active",
      target_date,
      website: input.website?.trim() || null,
      budget:
        input.budget != null && Number.isFinite(input.budget) && input.budget >= 0
          ? input.budget
          : null,
      plan_stage: input.plan,
      project_type: input.projectType?.trim() || null,
      metadata,
      parent_project_id: null,
    })
    .select("id")
    .single();

  if (prodErr) return { error: humanizeProjectDbError(prodErr.message) };
  const productId = productRow?.id as string | undefined;
  if (!productId) return { error: "Could not create product" };

  const { data: phaseRow, error: phaseErr } = await supabase
    .from("project")
    .insert({
      client_id: clientId,
      title: "Main",
      description: null,
      status: "active",
      target_date: null,
      website: null,
      budget: null,
      plan_stage: "pipeline",
      project_type: input.projectType?.trim() || null,
      metadata,
      parent_project_id: productId,
    })
    .select("id")
    .single();

  if (phaseErr) {
    await supabase.from("project").delete().eq("id", productId);
    return { error: humanizeProjectDbError(phaseErr.message) };
  }
  const phaseId = phaseRow?.id as string | undefined;
  if (!phaseId) {
    await supabase.from("project").delete().eq("id", productId);
    return { error: "Could not create default phase" };
  }

  revalidatePath("/products");
  revalidatePath("/projects");
  revalidatePath("/portal");
  revalidatePath("/dashboard");
  return { ok: true, id: productId, phaseId };
}

/** Create project and ensure a client exists for the lead (creates client from lead if needed). */
export async function createCrmProjectFromLead(
  leadId: string,
  input: CrmProjectPersistInput,
  hints?: { company?: string | null; email?: string | null }
): Promise<{ ok: true; id: string; phaseId: string } | { error: string }> {
  const lid = leadId.trim();
  if (!lid) return { error: "Missing lead id" };

  const resolved = await resolveOrCreateClientForLead(lid, hints);
  if ("error" in resolved) return resolved;

  const picked = input.clientId.trim();
  if (picked && picked !== resolved.clientId) {
    return { error: "Selected client does not match this lead." };
  }

  const result = await createCrmProject({
    ...input,
    clientId: resolved.clientId,
  });

  if ("ok" in result) {
    revalidatePath("/leads");
    revalidatePath(`/leads/${lid}`);
  }
  return result;
}

export async function updateCrmProject(
  projectId: string,
  input: CrmProjectPersistInput
): Promise<{ ok: true } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const id = projectId.trim();
  if (!id) return { error: "Missing project id" };

  const { data: existing, error: exErr } = await supabase
    .from("project")
    .select("parent_project_id")
    .eq("id", id)
    .maybeSingle();
  if (exErr) return { error: humanizeProjectDbError(exErr.message) };
  if (!existing) return { error: "Not found" };
  if (existing.parent_project_id) {
    return {
      error:
        "This row is a delivery phase. Edit the parent product from Products, or update the phase on its workspace page.",
    };
  }

  const clientId = input.clientId.trim();
  if (!clientId) return { error: "Select a client" };
  const title = input.title.trim();
  if (!title) return { error: "Title is required" };
  if (!PLAN_SET.has(input.plan)) return { error: "Invalid plan stage" };

  const target_date = parseTargetDate(input.expectedEndDate);
  const metadata = {
    teamId: input.teamId.trim() || "team-general",
    teamName: input.teamName?.trim() || null,
  };

  const { error } = await supabase
    .from("project")
    .update({
      client_id: clientId,
      title,
      target_date,
      website: input.website?.trim() || null,
      budget:
        input.budget != null && Number.isFinite(input.budget) && input.budget >= 0
          ? input.budget
          : null,
      plan_stage: input.plan,
      project_type: input.projectType?.trim() || null,
      metadata,
    })
    .eq("id", id);

  if (error) return { error: humanizeProjectDbError(error.message) };

  revalidatePath("/products");
  revalidatePath("/projects");
  revalidatePath(`/products/${id}`);
  revalidatePath(`/projects/${id}`);
  revalidatePath("/portal");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function deleteCrmProject(
  projectId: string
): Promise<{ ok: true } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const id = projectId.trim();
  if (!id) return { error: "Missing project id" };

  const { error } = await supabase.from("project").delete().eq("id", id);
  if (error) return { error: humanizeProjectDbError(error.message) };

  revalidatePath("/products");
  revalidatePath("/projects");
  revalidatePath("/portal");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function updateCrmProjectPlanStage(
  projectId: string,
  plan: PlanStage
): Promise<{ ok: true } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const id = projectId.trim();
  if (!id) return { error: "Missing project id" };
  if (!PLAN_SET.has(plan)) return { error: "Invalid plan stage" };

  const { data: row, error: readErr } = await supabase
    .from("project")
    .select("parent_project_id")
    .eq("id", id)
    .maybeSingle();
  if (readErr) return { error: humanizeProjectDbError(readErr.message) };
  if (!row) return { error: "Not found" };
  if (row.parent_project_id) {
    return { error: "Plan stage applies to the product, not an individual phase." };
  }

  const { error } = await supabase
    .from("project")
    .update({ plan_stage: plan })
    .eq("id", id);

  if (error) return { error: humanizeProjectDbError(error.message) };

  revalidatePath("/products");
  revalidatePath("/projects");
  revalidatePath(`/products/${id}`);
  revalidatePath(`/projects/${id}`);
  return { ok: true };
}

export type PhaseRow = {
  id: string;
  title: string;
  plan_stage: string | null;
  created_at: string;
};

export async function listCrmPhasesForProduct(
  productId: string
): Promise<{ phases: PhaseRow[]; error: string | null }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { phases: [], error: "Unauthorized" };

  const pid = productId.trim();
  if (!pid) return { phases: [], error: "Missing product id" };

  const { data: rows, error } = await supabase
    .from("project")
    .select("id, title, plan_stage, created_at")
    .eq("parent_project_id", pid)
    .order("created_at", { ascending: true });

  if (error) {
    return { phases: [], error: humanizeProjectDbError(error.message) };
  }
  return { phases: (rows ?? []) as PhaseRow[], error: null };
}

export async function createCrmPhase(
  productId: string,
  title: string
): Promise<{ ok: true; id: string } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const pid = productId.trim();
  const t = title.trim();
  if (!pid) return { error: "Missing product" };
  if (!t) return { error: "Title is required" };

  const { data: parent, error: pErr } = await supabase
    .from("project")
    .select("id, client_id, metadata, project_type")
    .eq("id", pid)
    .is("parent_project_id", null)
    .maybeSingle();

  if (pErr) return { error: humanizeProjectDbError(pErr.message) };
  if (!parent) return { error: "Product not found" };

  const metadata =
    parent.metadata &&
    typeof parent.metadata === "object" &&
    !Array.isArray(parent.metadata)
      ? parent.metadata
      : {};

  const { data: row, error } = await supabase
    .from("project")
    .insert({
      client_id: parent.client_id as string,
      title: t,
      description: null,
      status: "active",
      plan_stage: "pipeline",
      project_type: (parent.project_type as string | null) ?? null,
      metadata,
      parent_project_id: pid,
    })
    .select("id")
    .single();

  if (error) return { error: humanizeProjectDbError(error.message) };
  const id = row?.id as string | undefined;
  if (!id) return { error: "Could not create phase" };

  revalidatePath(`/products/${pid}`);
  revalidatePath("/products");
  return { ok: true, id };
}

export type CreateCrmChildProjectInput = {
  title: string;
  summary?: string | null;
  description?: string | null;
  plan_stage?: string | null;
  target_date?: string | null;
  /** Titles only; server assigns stable ids */
  milestoneTitles?: string[];
};

/** Create a child project (delivery project) under a product with optional metadata milestones. */
export async function createCrmChildProject(
  productId: string,
  input: CreateCrmChildProjectInput
): Promise<{ ok: true; id: string } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const pid = productId.trim();
  const title = input.title.trim();
  if (!pid) return { error: "Missing product" };
  if (!title) return { error: "Title is required" };

  const { data: parent, error: pErr } = await supabase
    .from("project")
    .select("id, client_id, metadata, project_type")
    .eq("id", pid)
    .is("parent_project_id", null)
    .maybeSingle();

  if (pErr) return { error: humanizeProjectDbError(pErr.message) };
  if (!parent) return { error: "Product not found" };

  const parentMeta =
    parent.metadata &&
    typeof parent.metadata === "object" &&
    !Array.isArray(parent.metadata)
      ? (parent.metadata as Record<string, unknown>)
      : {};

  const plan =
    input.plan_stage && PLAN_SET.has(input.plan_stage)
      ? input.plan_stage
      : "pipeline";
  const target_date = parseTargetDate(input.target_date ?? undefined);

  const titles =
    input.milestoneTitles?.map((t) => t.trim()).filter(Boolean) ?? [];
  const milestoneSeed =
    titles.length > 0 ? titles : ["Design", "Development", "Testing"];
  const milestones = milestoneSeed.map((t) => ({
    id: crypto.randomUUID(),
    title: t,
    targetDate: null as string | null,
  }));

  const childMetadata: Record<string, unknown> = {
    teamId:
      typeof parentMeta.teamId === "string" && parentMeta.teamId.trim()
        ? parentMeta.teamId.trim()
        : "team-general",
    teamName: parentMeta.teamName ?? null,
    milestones,
    summary:
      typeof input.summary === "string" && input.summary.trim()
        ? input.summary.trim()
        : null,
  };

  const { data: row, error } = await supabase
    .from("project")
    .insert({
      client_id: parent.client_id as string,
      title,
      description: input.description?.trim() || null,
      status: "active",
      plan_stage: plan,
      project_type: (parent.project_type as string | null) ?? null,
      target_date,
      website: null,
      budget: null,
      metadata: childMetadata,
      parent_project_id: pid,
    })
    .select("id")
    .single();

  if (error) return { error: humanizeProjectDbError(error.message) };
  const id = row?.id as string | undefined;
  if (!id) return { error: "Could not create project" };

  revalidatePath(`/products/${pid}`);
  revalidatePath("/products");
  return { ok: true, id };
}

export async function updateCrmChildProjectMilestones(
  productId: string,
  childId: string,
  milestones: ProductMilestoneMeta[]
): Promise<{ ok: true } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const pid = productId.trim();
  const cid = childId.trim();
  if (!pid || !cid) return { error: "Missing id" };

  const { data: child, error: cErr } = await supabase
    .from("project")
    .select("id, metadata, parent_project_id")
    .eq("id", cid)
    .maybeSingle();

  if (cErr) return { error: humanizeProjectDbError(cErr.message) };
  if (!child || (child.parent_project_id as string | null) !== pid) {
    return { error: "Project not found under this product" };
  }

  const meta =
    child.metadata &&
    typeof child.metadata === "object" &&
    !Array.isArray(child.metadata)
      ? ({ ...(child.metadata as Record<string, unknown>) } as Record<
          string,
          unknown
        >)
      : {};

  meta.milestones = milestones.map((m) => ({
    id: m.id,
    title: m.title.trim(),
    targetDate: m.targetDate ?? null,
  }));

  const { error } = await supabase
    .from("project")
    .update({ metadata: meta })
    .eq("id", cid);

  if (error) return { error: humanizeProjectDbError(error.message) };
  revalidatePath(`/products/${pid}`);
  return { ok: true };
}

export async function updateProductResources(
  productId: string,
  resources: WorkspaceResource[]
): Promise<{ ok: true } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const pid = productId.trim();
  if (!pid) return { error: "Missing product" };

  const { data: root, error: rErr } = await supabase
    .from("project")
    .select("id, metadata")
    .eq("id", pid)
    .is("parent_project_id", null)
    .maybeSingle();

  if (rErr) return { error: humanizeProjectDbError(rErr.message) };
  if (!root) return { error: "Product not found" };

  const meta =
    root.metadata &&
    typeof root.metadata === "object" &&
    !Array.isArray(root.metadata)
      ? ({ ...(root.metadata as Record<string, unknown>) } as Record<
          string,
          unknown
        >)
      : {};

  meta.productResources = resources;

  const { error } = await supabase
    .from("project")
    .update({ metadata: meta })
    .eq("id", pid);

  if (error) return { error: humanizeProjectDbError(error.message) };
  revalidatePath(`/products/${pid}`);
  return { ok: true };
}

export type IssueRow = {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  status: string;
  severity: string;
  related_task_id: string | null;
  workspace_task_id: string | null;
  created_at: string;
};

export async function listIssuesForPhase(
  phaseId: string
): Promise<{ issues: IssueRow[]; error: string | null }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { issues: [], error: "Unauthorized" };

  const id = phaseId.trim();
  if (!id) return { issues: [], error: "Missing phase" };

  const { data: rows, error } = await supabase
    .from("issue")
    .select(
      "id, project_id, title, description, status, severity, related_task_id, workspace_task_id, created_at"
    )
    .eq("project_id", id)
    .order("created_at", { ascending: false });

  if (error) {
    return { issues: [], error: humanizeProjectDbError(error.message) };
  }
  const issues: IssueRow[] = (rows ?? []).map((r) => {
    const row = r as IssueRow & { workspace_task_id?: string | null };
    return {
      ...row,
      workspace_task_id: row.workspace_task_id ?? null,
    };
  });
  return { issues, error: null };
}

export async function createCrmIssue(input: {
  phaseId: string;
  title: string;
  description?: string | null;
  severity?: string;
}): Promise<{ ok: true; id: string } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const phaseId = input.phaseId.trim();
  const title = input.title.trim();
  if (!phaseId) return { error: "Missing phase" };
  if (!title) return { error: "Title is required" };

  const sev = (input.severity ?? "medium").toLowerCase();
  const allowed = new Set(["low", "medium", "high", "critical"]);
  if (!allowed.has(sev)) return { error: "Invalid severity" };

  const { data: row, error } = await supabase
    .from("issue")
    .insert({
      project_id: phaseId,
      title,
      description: input.description?.trim() || null,
      severity: sev,
      status: "open",
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error) return { error: humanizeProjectDbError(error.message) };
  const id = row?.id as string | undefined;
  if (!id) return { error: "Could not create issue" };

  revalidatePath(`/products`);
  return { ok: true, id };
}

export async function updateCrmIssue(
  issueId: string,
  patch: {
    status?: string;
    severity?: string;
    title?: string;
    related_task_id?: string | null;
    workspace_task_id?: string | null;
  }
): Promise<{ ok: true } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const id = issueId.trim();
  if (!id) return { error: "Missing issue id" };

  const updates: Record<string, string | null> = {};
  if (patch.title !== undefined) {
    const t = patch.title.trim();
    if (!t) return { error: "Title required" };
    updates.title = t;
  }
  if (patch.status !== undefined) {
    const st = patch.status.trim();
    const allowed = new Set(["open", "in_progress", "resolved", "closed"]);
    if (!allowed.has(st)) return { error: "Invalid status" };
    updates.status = st;
  }
  if (patch.severity !== undefined) {
    const sev = patch.severity.toLowerCase();
    if (!["low", "medium", "high", "critical"].includes(sev)) {
      return { error: "Invalid severity" };
    }
    updates.severity = sev;
  }
  if (patch.related_task_id !== undefined) {
    updates.related_task_id = patch.related_task_id;
  }
  if (patch.workspace_task_id !== undefined) {
    updates.workspace_task_id = patch.workspace_task_id;
  }

  if (Object.keys(updates).length === 0) return { ok: true };

  const { error } = await supabase.from("issue").update(updates).eq("id", id);

  if (error) return { error: humanizeProjectDbError(error.message) };
  revalidatePath("/products");
  return { ok: true };
}

export async function deleteCrmIssue(
  issueId: string
): Promise<{ ok: true } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const id = issueId.trim();
  if (!id) return { error: "Missing issue id" };

  const { error } = await supabase.from("issue").delete().eq("id", id);
  if (error) return { error: humanizeProjectDbError(error.message) };
  revalidatePath("/products");
  return { ok: true };
}
