"use server";

import { revalidatePath } from "next/cache";
import { resolveOrCreateClientForLead } from "@/app/(crm)/actions/crm";
import { createClient } from "@/lib/supabase/server";
import {
  clientRowToProjectSlice,
  projectRowToMock,
  type ProjectRow,
  type CrmProjectPersistInput,
} from "@/lib/crm/map-project-row";
import type { MockProject } from "@/lib/crm/mock-data";
import {
  CHILD_DELIVERY_STATUSES,
  DELIVERY_STATUS_TO_PLAN_STAGE,
  type ChildDeliveryStatus,
  type ChildProjectPriority,
  type ProductMilestoneMeta,
} from "@/lib/crm/product-project-metadata";
import {
  applyChildDeliveryStatusUiToMetadata,
  buildChildDeliveryStatusUiFromDrafts,
  defaultChildDeliveryLabel,
  DEFAULT_CHILD_DELIVERY_STATUS_COLORS,
  normalizeHexColor,
  parseChildDeliveryStatusUi,
  type ChildDeliveryStatusDraftRow,
  type ChildDeliveryStatusUiConfig,
  type ChildDeliveryStatusUiEntry,
} from "@/lib/crm/child-delivery-status-ui";
import { productPlanStageSet, projectTypeSet } from "@/lib/crm/field-options";
import { mergedFieldOptionsFromSupabase } from "@/lib/crm/merged-field-options-from-supabase";
import {
  CUSTOM_PROJECT_STATUSES_KEY,
  parseCustomProjectStatuses,
  PROJECTS_TAB_GROUP_ID_KEY,
} from "@/lib/crm/custom-project-status";
import type { WorkspaceResource } from "@/lib/crm/project-workspace-types";

const MAX_CUSTOM_PROJECT_STATUSES = 24;

function resolveProductTypeForCreate(
  raw: string | null | undefined,
  allowed: Set<string>
): { projectType: string | null } | { error: string } {
  const t = (raw ?? "").trim();
  if (!t) return { projectType: null };
  if (!allowed.has(t)) return { error: "Invalid project type." };
  return { projectType: t };
}

function resolveProductTypeForUpdate(
  raw: string | null | undefined,
  allowed: Set<string>,
  existing: string | null
): { projectType: string | null } | { error: string } {
  const t = (raw ?? "").trim();
  if (!t) return { projectType: null };
  if (allowed.has(t)) return { projectType: t };
  const ex = existing?.trim() || "";
  if (ex && t === ex) return { projectType: t };
  return { error: "Invalid project type." };
}

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
      "`supabase/migrations` through `20260430210000_product_plan_stage.sql` (or run `supabase db push`)."
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
      "id, client_id, title, description, status, target_date, website, budget, plan_stage, project_type, metadata, parent_project_id, reference_number"
    )
    .is("parent_project_id", null)
    .order("created_at", { ascending: false })
    .limit(500);

  if (error) {
    return { projects: [], error: humanizeProjectDbError(error.message) };
  }
  if (!rows?.length) return { projects: [], error: null };

  const fieldOpts = await mergedFieldOptionsFromSupabase(supabase);

  const clientIds = [...new Set(rows.map((r) => r.client_id as string))];
  const { data: clients } = await supabase
    .from("client")
    .select("id, name, email, company")
    .in("id", clientIds);

  const sliceFor = (cid: string) => {
    const c = clients?.find((x) => x.id === cid);
    return clientRowToProjectSlice(c ?? undefined);
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
    projectRowToMock(row, sliceFor(row.client_id), {
      primaryPhaseId: primaryPhaseByProduct.get(row.id) ?? null,
      fieldOptions: fieldOpts,
    })
  );
  return { projects, error: null };
}

export async function createCrmProject(
  input: CrmProjectPersistInput
): Promise<{ ok: true; id: string } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const clientId = input.clientId.trim();
  if (!clientId) return { error: "Select a client" };
  const title = input.title.trim();
  if (!title) return { error: "Title is required" };

  const fieldOpts = await mergedFieldOptionsFromSupabase(supabase);
  const planSlug = input.plan.trim().toLowerCase();
  if (!productPlanStageSet(fieldOpts).has(planSlug)) {
    return { error: "Invalid plan stage" };
  }
  const ptRes = resolveProductTypeForCreate(
    input.projectType,
    projectTypeSet(fieldOpts)
  );
  if ("error" in ptRes) return { error: ptRes.error };

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
      plan_stage: planSlug,
      project_type: ptRes.projectType,
      metadata,
      parent_project_id: null,
    })
    .select("id")
    .single();

  if (prodErr) return { error: humanizeProjectDbError(prodErr.message) };
  const productId = productRow?.id as string | undefined;
  if (!productId) return { error: "Could not create product" };

  revalidatePath("/products");
  revalidatePath("/projects");
  revalidatePath("/portal");
  revalidatePath("/dashboard");
  return { ok: true, id: productId };
}

/** Create project and ensure a client exists for the lead (creates client from lead if needed). */
export async function createCrmProjectFromLead(
  leadId: string,
  input: CrmProjectPersistInput,
  hints?: { company?: string | null; email?: string | null }
): Promise<{ ok: true; id: string } | { error: string }> {
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
    .select("parent_project_id, metadata, project_type")
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

  const fieldOpts = await mergedFieldOptionsFromSupabase(supabase);
  const planSlug = input.plan.trim().toLowerCase();
  if (!productPlanStageSet(fieldOpts).has(planSlug)) {
    return { error: "Invalid plan stage" };
  }
  const existingPt = (existing.project_type as string | null)?.trim() || null;
  const ptRes = resolveProductTypeForUpdate(
    input.projectType,
    projectTypeSet(fieldOpts),
    existingPt
  );
  if ("error" in ptRes) return { error: ptRes.error };

  const target_date = parseTargetDate(input.expectedEndDate);
  const prevMeta =
    existing.metadata &&
    typeof existing.metadata === "object" &&
    !Array.isArray(existing.metadata)
      ? ({ ...(existing.metadata as Record<string, unknown>) } as Record<
          string,
          unknown
        >)
      : {};
  const metadata = {
    ...prevMeta,
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
      plan_stage: planSlug,
      project_type: ptRes.projectType,
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

/** Root product only: main point of contact (Team page roster member id + display name in metadata). */
export async function setProductPointOfContact(
  productId: string,
  input: { memberId: string | null; displayName?: string | null }
): Promise<{ ok: true } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const id = productId.trim();
  if (!id) return { error: "Missing product id" };

  const { data: root, error: rErr } = await supabase
    .from("project")
    .select("id, parent_project_id, metadata")
    .eq("id", id)
    .maybeSingle();

  if (rErr) return { error: humanizeProjectDbError(rErr.message) };
  if (!root) return { error: "Product not found" };
  if (root.parent_project_id) {
    return { error: "Only products can have a point-of-contact owner." };
  }

  const meta =
    root.metadata &&
    typeof root.metadata === "object" &&
    !Array.isArray(root.metadata)
      ? ({ ...(root.metadata as Record<string, unknown>) } as Record<
          string,
          unknown
        >)
      : {};

  const mid = input.memberId?.trim() || null;
  if (!mid) {
    delete meta.pointOfContactMemberId;
    delete meta.pointOfContactName;
  } else {
    meta.pointOfContactMemberId = mid;
    const name = input.displayName?.trim();
    if (name) meta.pointOfContactName = name;
    else delete meta.pointOfContactName;
  }

  const { error } = await supabase
    .from("project")
    .update({ metadata: meta })
    .eq("id", id);

  if (error) return { error: humanizeProjectDbError(error.message) };
  revalidatePath(`/products/${id}`);
  revalidatePath("/products");
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
  plan: string
): Promise<{ ok: true } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const id = projectId.trim();
  if (!id) return { error: "Missing project id" };
  const fieldOpts = await mergedFieldOptionsFromSupabase(supabase);
  const planSlug = plan.trim().toLowerCase();
  if (!productPlanStageSet(fieldOpts).has(planSlug)) {
    return { error: "Invalid plan stage" };
  }

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
    .update({ plan_stage: planSlug })
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
      plan_stage: "backlog",
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

const CHILD_DELIVERY_SET = new Set<string>(CHILD_DELIVERY_STATUSES);
const CHILD_PRIORITY_SET = new Set<string>([
  "low",
  "medium",
  "high",
  "urgent",
]);

function inferDeliveryStatusFromPlanStage(plan: string): ChildDeliveryStatus {
  const s = plan.trim().toLowerCase();
  if (s === "planning") return "planned";
  if (s === "building" || s === "mvp") return "in_progress";
  if (s === "testing") return "testing";
  if (s === "release" || s === "growth") return "production";
  if (s === "backlog" || s === "pipeline") return "backlog";
  return "in_progress";
}

export type CreateCrmChildProjectInput = {
  title: string;
  summary?: string | null;
  description?: string | null;
  /** Linear-style status; drives `plan_stage` via mapping. */
  deliveryStatus?: ChildDeliveryStatus;
  /** Legacy override when `deliveryStatus` omitted */
  plan_stage?: string | null;
  priority?: ChildProjectPriority | null;
  leadMemberId?: string | null;
  memberIds?: string[];
  start_date?: string | null;
  target_date?: string | null;
  labels?: string[];
  /** Titles only; server assigns stable ids */
  milestoneTitles?: string[];
  /** Projects tab column: built-in delivery key or custom status id */
  projectsTabGroupId?: string | null;
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

  const fieldOpts = await mergedFieldOptionsFromSupabase(supabase);
  const productPlanAllowed = productPlanStageSet(fieldOpts);

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

  let deliveryStatus: ChildDeliveryStatus = "backlog";
  let plan = "backlog";
  let projectsTabGroupId = "";

  const customList = parseCustomProjectStatuses(parentMeta);
  const customIds = new Set(customList.map((c) => c.id));
  const reqGroup = input.projectsTabGroupId?.trim() ?? "";

  if (reqGroup) {
    if (CHILD_DELIVERY_SET.has(reqGroup)) {
      deliveryStatus = reqGroup as ChildDeliveryStatus;
      plan = DELIVERY_STATUS_TO_PLAN_STAGE[deliveryStatus];
      projectsTabGroupId = reqGroup;
    } else if (customIds.has(reqGroup)) {
      deliveryStatus = "in_progress";
      plan = "building";
      projectsTabGroupId = reqGroup;
    }
  }

  if (!projectsTabGroupId) {
    if (input.deliveryStatus && CHILD_DELIVERY_SET.has(input.deliveryStatus)) {
      deliveryStatus = input.deliveryStatus;
      plan = DELIVERY_STATUS_TO_PLAN_STAGE[deliveryStatus];
    } else if (
      input.plan_stage &&
      productPlanAllowed.has(input.plan_stage.trim().toLowerCase())
    ) {
      plan = input.plan_stage.trim().toLowerCase();
      deliveryStatus = inferDeliveryStatusFromPlanStage(plan);
    } else {
      deliveryStatus = "backlog";
      plan = "backlog";
    }
    projectsTabGroupId = deliveryStatus;
  }

  const target_date = parseTargetDate(input.target_date ?? undefined);
  const start_date = parseTargetDate(input.start_date ?? undefined);

  const priorityRaw = input.priority;
  const priority: ChildProjectPriority | null =
    priorityRaw &&
    CHILD_PRIORITY_SET.has(priorityRaw)
      ? priorityRaw
      : null;

  const leadMemberId =
    typeof input.leadMemberId === "string" && input.leadMemberId.trim()
      ? input.leadMemberId.trim()
      : null;
  const memberIds = (input.memberIds ?? [])
    .map((id) => String(id).trim())
    .filter(Boolean);
  const labels = (input.labels ?? [])
    .map((t) => t.trim())
    .filter(Boolean);

  const titles =
    input.milestoneTitles?.map((t) => t.trim()).filter(Boolean) ?? [];
  const milestones = titles.map((t) => ({
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
    deliveryStatus,
    [PROJECTS_TAB_GROUP_ID_KEY]: projectsTabGroupId,
    priority,
    leadMemberId,
    memberIds: memberIds.length ? memberIds : [],
    labels: labels.length ? labels : [],
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
      start_date,
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

/** Move a child delivery project to another Projects-tab column (built-in or custom). */
export async function setCrmChildProjectTabGroup(
  productId: string,
  childId: string,
  tabGroupId: string
): Promise<{ ok: true } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const pid = productId.trim();
  const cid = childId.trim();
  const gid = tabGroupId.trim();
  if (!pid || !cid || !gid) return { error: "Missing id" };

  const { data: parent, error: pErr } = await supabase
    .from("project")
    .select("id, metadata")
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
  const customIds = new Set(
    parseCustomProjectStatuses(parentMeta).map((c) => c.id)
  );

  let deliveryStatus: ChildDeliveryStatus;
  let plan: string;

  if (CHILD_DELIVERY_SET.has(gid)) {
    deliveryStatus = gid as ChildDeliveryStatus;
    plan = DELIVERY_STATUS_TO_PLAN_STAGE[deliveryStatus];
  } else if (customIds.has(gid)) {
    deliveryStatus = "in_progress";
    plan = "building";
  } else {
    return { error: "Invalid status column" };
  }

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

  meta.deliveryStatus = deliveryStatus;
  meta[PROJECTS_TAB_GROUP_ID_KEY] = gid;

  const { error } = await supabase
    .from("project")
    .update({ metadata: meta, plan_stage: plan })
    .eq("id", cid);

  if (error) return { error: humanizeProjectDbError(error.message) };
  revalidatePath(`/products/${pid}`);
  revalidatePath("/products");
  return { ok: true };
}

export async function updateCrmChildProjectQuickFields(
  productId: string,
  childId: string,
  input: {
    leadMemberId?: string | null;
    target_date?: string | null;
    priority?: ChildProjectPriority | null;
  }
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

  if ("leadMemberId" in input) {
    const leadMemberId = input.leadMemberId?.trim() || null;
    if (leadMemberId) {
      meta.leadMemberId = leadMemberId;
      meta.memberIds = [leadMemberId];
    } else {
      delete meta.leadMemberId;
      meta.memberIds = [];
    }
  }

  if ("priority" in input) {
    const priority = input.priority;
    if (priority && CHILD_PRIORITY_SET.has(priority)) meta.priority = priority;
    else delete meta.priority;
  }

  const update: Record<string, unknown> = { metadata: meta };
  if ("target_date" in input) {
    update.target_date = parseTargetDate(input.target_date ?? undefined);
  }

  const { error } = await supabase
    .from("project")
    .update(update)
    .eq("id", cid);

  if (error) return { error: humanizeProjectDbError(error.message) };
  revalidatePath(`/products/${pid}`);
  revalidatePath("/products");
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

export async function updateProductChildDeliveryStatusUi(
  productId: string,
  statusId: ChildDeliveryStatus,
  input:
    | { resetToDefaults: true }
    | { label: string; color: string; resetToDefaults?: false }
): Promise<{ ok: true } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const pid = productId.trim();
  if (!pid) return { error: "Missing product" };
  if (!CHILD_DELIVERY_SET.has(statusId)) {
    return { error: "Invalid status" };
  }

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

  const current = parseChildDeliveryStatusUi(meta);
  const next: ChildDeliveryStatusUiConfig = { ...current };

  if ("resetToDefaults" in input && input.resetToDefaults) {
    delete next[statusId];
  } else {
    const label = input.label.trim();
    if (!label || label.length > 64) {
      return { error: "Name is required (max 64 characters)." };
    }
    const color = normalizeHexColor(input.color);
    if (!color) {
      return { error: "Pick a valid color." };
    }
    const defLabel = defaultChildDeliveryLabel(statusId);
    const defColor = DEFAULT_CHILD_DELIVERY_STATUS_COLORS[statusId];
    const entry: ChildDeliveryStatusUiEntry = {};
    if (label !== defLabel) entry.label = label;
    if (color !== defColor) entry.color = color;
    if (Object.keys(entry).length === 0) {
      delete next[statusId];
    } else {
      next[statusId] = entry;
    }
  }

  const newMeta = applyChildDeliveryStatusUiToMetadata(meta, next);

  const { error } = await supabase
    .from("project")
    .update({ metadata: newMeta })
    .eq("id", pid);

  if (error) return { error: humanizeProjectDbError(error.message) };
  revalidatePath(`/products/${pid}`);
  revalidatePath("/products");
  return { ok: true };
}

export async function updateProductChildDeliveryStatusesBulk(
  productId: string,
  rows: ChildDeliveryStatusDraftRow[]
): Promise<{ ok: true } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const pid = productId.trim();
  if (!pid) return { error: "Missing product" };

  if (!Array.isArray(rows) || rows.length !== CHILD_DELIVERY_STATUSES.length) {
    return { error: "Invalid payload." };
  }

  const seen = new Set<string>();
  for (const row of rows) {
    const id = row.id;
    if (!CHILD_DELIVERY_SET.has(id)) return { error: "Invalid status." };
    if (seen.has(id)) return { error: "Duplicate status." };
    seen.add(id);
    const label = row.label.trim();
    if (!label || label.length > 64) {
      return { error: "Each name is required (max 64 characters)." };
    }
    const color = normalizeHexColor(row.color);
    if (!color) return { error: "Each row needs a valid color." };
  }

  for (const id of CHILD_DELIVERY_STATUSES) {
    if (!seen.has(id)) return { error: "Missing status row." };
  }

  const next = buildChildDeliveryStatusUiFromDrafts(rows);

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

  const newMeta = applyChildDeliveryStatusUiToMetadata(meta, next);

  const { error } = await supabase
    .from("project")
    .update({ metadata: newMeta })
    .eq("id", pid);

  if (error) return { error: humanizeProjectDbError(error.message) };
  revalidatePath(`/products/${pid}`);
  revalidatePath("/products");
  return { ok: true };
}

export async function addCustomProjectStatus(
  productId: string,
  input: { label: string; color: string }
): Promise<{ ok: true; id: string } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const pid = productId.trim();
  const label = input.label.trim();
  const color = normalizeHexColor(input.color);
  if (!pid) return { error: "Missing product" };
  if (!label || label.length > 64) {
    return { error: "Name is required (max 64 characters)." };
  }
  if (!color) return { error: "Pick a valid color." };

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

  const list = parseCustomProjectStatuses(meta);
  if (list.length >= MAX_CUSTOM_PROJECT_STATUSES) {
    return { error: `At most ${MAX_CUSTOM_PROJECT_STATUSES} custom statuses.` };
  }

  const id = crypto.randomUUID();
  list.push({ id, label, color });
  meta[CUSTOM_PROJECT_STATUSES_KEY] = list;

  const { error } = await supabase
    .from("project")
    .update({ metadata: meta })
    .eq("id", pid);

  if (error) return { error: humanizeProjectDbError(error.message) };
  revalidatePath(`/products/${pid}`);
  revalidatePath("/products");
  return { ok: true, id };
}

export async function updateCustomProjectStatus(
  productId: string,
  statusId: string,
  input: { label: string; color: string }
): Promise<{ ok: true } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const pid = productId.trim();
  const sid = statusId.trim();
  const label = input.label.trim();
  const color = normalizeHexColor(input.color);
  if (!pid || !sid) return { error: "Missing id" };
  if (!label || label.length > 64) {
    return { error: "Name is required (max 64 characters)." };
  }
  if (!color) return { error: "Pick a valid color." };

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

  const list = parseCustomProjectStatuses(meta);
  const idx = list.findIndex((r) => r.id === sid);
  if (idx < 0) return { error: "Status not found" };
  list[idx] = { id: sid, label, color };
  meta[CUSTOM_PROJECT_STATUSES_KEY] = list;

  const { error } = await supabase
    .from("project")
    .update({ metadata: meta })
    .eq("id", pid);

  if (error) return { error: humanizeProjectDbError(error.message) };
  revalidatePath(`/products/${pid}`);
  revalidatePath("/products");
  return { ok: true };
}

export async function deleteCustomProjectStatus(
  productId: string,
  statusId: string
): Promise<{ ok: true } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const pid = productId.trim();
  const sid = statusId.trim();
  if (!pid || !sid) return { error: "Missing id" };

  const { data: kids, error: kErr } = await supabase
    .from("project")
    .select("metadata")
    .eq("parent_project_id", pid);

  if (kErr) return { error: humanizeProjectDbError(kErr.message) };

  const inUse = (kids ?? []).some((row) => {
    const m = row.metadata as Record<string, unknown> | null;
    return m && m[PROJECTS_TAB_GROUP_ID_KEY] === sid;
  });
  if (inUse) {
    return {
      error: "Move projects out of this column before deleting it.",
    };
  }

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

  const list = parseCustomProjectStatuses(meta).filter((r) => r.id !== sid);
  if (list.length === 0) delete meta[CUSTOM_PROJECT_STATUSES_KEY];
  else meta[CUSTOM_PROJECT_STATUSES_KEY] = list;

  const { error } = await supabase
    .from("project")
    .update({ metadata: meta })
    .eq("id", pid);

  if (error) return { error: humanizeProjectDbError(error.message) };
  revalidatePath(`/products/${pid}`);
  revalidatePath("/products");
  return { ok: true };
}

export type IssueRow = {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  status: string;
  severity: string;
  /** feature_request | bug_report | customer_request */
  category: string;
  related_task_id: string | null;
  workspace_task_id: string | null;
  created_at: string;
  environment?: string | null;
  browser_device?: string | null;
  steps_to_reproduce?: string | null;
  expected_result?: string | null;
  actual_result?: string | null;
  attachment_urls?: unknown;
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
      "id, project_id, title, description, status, severity, category, related_task_id, workspace_task_id, created_at, environment, browser_device, steps_to_reproduce, expected_result, actual_result, attachment_urls"
    )
    .eq("project_id", id)
    .order("created_at", { ascending: false });

  if (error) {
    return { issues: [], error: humanizeProjectDbError(error.message) };
  }
  const issues: IssueRow[] = (rows ?? []).map((r) => {
    const row = r as IssueRow & {
      workspace_task_id?: string | null;
      category?: string;
    };
    return {
      ...row,
      category: row.category ?? "bug_report",
      workspace_task_id: row.workspace_task_id ?? null,
    };
  });
  return { issues, error: null };
}

const ISSUE_CATEGORIES = new Set([
  "feature_request",
  "bug_report",
  "customer_request",
]);

const BUG_ISSUE_STATUSES = new Set([
  "new",
  "confirmed",
  "in_progress",
  "ready_for_qa",
  "fixed",
  "rejected",
  "reopened",
]);

export async function createCrmIssue(input: {
  phaseId: string;
  title: string;
  description?: string | null;
  severity?: string;
  category?: string;
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
  const allowedSev = new Set(["low", "medium", "high", "critical"]);
  if (!allowedSev.has(sev)) return { error: "Invalid severity" };

  const cat = (input.category ?? "bug_report").trim();
  if (!ISSUE_CATEGORIES.has(cat)) return { error: "Invalid category" };

  const { data: row, error } = await supabase
    .from("issue")
    .insert({
      project_id: phaseId,
      title,
      description: input.description?.trim() || null,
      severity: sev,
      category: cat,
      status: "new",
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
      category?: string;
      title?: string;
      related_task_id?: string | null;
      workspace_task_id?: string | null;
      description?: string | null;
      environment?: string | null;
      browser_device?: string | null;
      steps_to_reproduce?: string | null;
      expected_result?: string | null;
      actual_result?: string | null;
      attachment_urls?: unknown;
    }
): Promise<{ ok: true } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const id = issueId.trim();
  if (!id) return { error: "Missing issue id" };

  const updates: Record<string, string | null | unknown> = {};
  if (patch.title !== undefined) {
    const t = patch.title.trim();
    if (!t) return { error: "Title required" };
    updates.title = t;
  }
  if (patch.description !== undefined) {
    updates.description = patch.description?.trim() || null;
  }
  if (patch.status !== undefined) {
    const st = patch.status.trim();
    if (!BUG_ISSUE_STATUSES.has(st)) return { error: "Invalid status" };
    updates.status = st;
  }
  if (patch.severity !== undefined) {
    const sev = patch.severity.toLowerCase();
    if (!["low", "medium", "high", "critical"].includes(sev)) {
      return { error: "Invalid severity" };
    }
    updates.severity = sev;
  }
  if (patch.category !== undefined) {
    const c = patch.category.trim();
    if (!ISSUE_CATEGORIES.has(c)) return { error: "Invalid category" };
    updates.category = c;
  }
  if (patch.related_task_id !== undefined) {
    updates.related_task_id = patch.related_task_id;
  }
  if (patch.workspace_task_id !== undefined) {
    updates.workspace_task_id = patch.workspace_task_id;
  }
  if (patch.environment !== undefined) {
    updates.environment = patch.environment?.trim() || null;
  }
  if (patch.browser_device !== undefined) {
    updates.browser_device = patch.browser_device?.trim() || null;
  }
  if (patch.steps_to_reproduce !== undefined) {
    updates.steps_to_reproduce = patch.steps_to_reproduce?.trim() || null;
  }
  if (patch.expected_result !== undefined) {
    updates.expected_result = patch.expected_result?.trim() || null;
  }
  if (patch.actual_result !== undefined) {
    updates.actual_result = patch.actual_result?.trim() || null;
  }
  if (patch.attachment_urls !== undefined) {
    updates.attachment_urls = patch.attachment_urls;
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
