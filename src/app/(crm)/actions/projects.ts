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
    (m.includes("project") || m.includes("plan_stage") || m.includes("metadata"))
  ) {
    return (
      "Project columns are not on this database yet. Apply " +
      "`supabase/migrations/20260401120000_project_crm_fields.sql` (or run `supabase db push`)."
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
      "id, client_id, title, description, status, target_date, website, budget, plan_stage, project_type, metadata"
    )
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

  const projects = (rows as ProjectRow[]).map((row) =>
    projectRowToMock(row, labelFor(row.client_id))
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
  if (!PLAN_SET.has(input.plan)) return { error: "Invalid plan stage" };

  const target_date = parseTargetDate(input.expectedEndDate);
  const metadata = {
    teamId: input.teamId.trim() || "team-general",
    teamName: input.teamName?.trim() || null,
  };

  const { data: row, error } = await supabase
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
    })
    .select("id")
    .single();

  if (error) return { error: humanizeProjectDbError(error.message) };
  const id = row?.id as string | undefined;
  if (!id) return { error: "Could not create project" };

  revalidatePath("/projects");
  revalidatePath("/portal");
  revalidatePath("/dashboard");
  return { ok: true, id };
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

  revalidatePath("/projects");
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

  const { error } = await supabase
    .from("project")
    .update({ plan_stage: plan })
    .eq("id", id);

  if (error) return { error: humanizeProjectDbError(error.message) };

  revalidatePath("/projects");
  revalidatePath(`/projects/${id}`);
  return { ok: true };
}
