import type { MockProject, PlanStage } from "@/lib/crm/mock-data";

/** Fields persisted to `public.project` from the CRM project modal. */
export type CrmProjectPersistInput = {
  clientId: string;
  title: string;
  plan: PlanStage;
  projectType: string | null;
  expectedEndDate: string;
  budget: number | null;
  website: string | null;
  teamId: string;
  teamName: string | null;
};

export function crmPayloadFromMock(p: MockProject): CrmProjectPersistInput {
  return {
    clientId: p.clientId.trim(),
    title: p.title.trim(),
    plan: p.plan,
    projectType: p.projectType?.trim() || null,
    expectedEndDate: p.expectedEndDate,
    budget: p.budget ?? null,
    website: p.website ?? null,
    teamId: p.teamId,
    teamName: p.teamName ?? null,
  };
}

const PLAN_STAGES: PlanStage[] = ["pipeline", "planning", "mvp", "growth"];

function parsePlanStage(v: string | null | undefined): PlanStage {
  const s = (v ?? "pipeline").trim();
  if ((PLAN_STAGES as readonly string[]).includes(s)) {
    return s as PlanStage;
  }
  return "pipeline";
}

export type ProjectRow = {
  id: string;
  client_id: string;
  title: string;
  description: string | null;
  status: string;
  target_date: string | null;
  website: string | null;
  budget: string | number | null;
  plan_stage: string | null;
  project_type: string | null;
  metadata: unknown;
  /** null = top-level product; set = phase row under product */
  parent_project_id?: string | null;
};

export function projectRowToMock(
  row: ProjectRow,
  clientLabel: string,
  options?: { primaryPhaseId?: string | null }
): MockProject {
  const meta =
    row.metadata &&
    typeof row.metadata === "object" &&
    !Array.isArray(row.metadata)
      ? (row.metadata as Record<string, unknown>)
      : {};
  const teamId =
    typeof meta.teamId === "string" && meta.teamId.trim()
      ? meta.teamId.trim()
      : "team-general";
  const teamName =
    typeof meta.teamName === "string" && meta.teamName.trim()
      ? meta.teamName.trim()
      : null;
  const pointOfContactMemberId =
    typeof meta.pointOfContactMemberId === "string" &&
    meta.pointOfContactMemberId.trim()
      ? meta.pointOfContactMemberId.trim()
      : null;
  const pointOfContactName =
    typeof meta.pointOfContactName === "string" &&
    meta.pointOfContactName.trim()
      ? meta.pointOfContactName.trim()
      : null;
  const td = row.target_date ? String(row.target_date).slice(0, 10) : "";
  return {
    id: row.id,
    title: row.title?.trim() || "Untitled",
    plan: parsePlanStage(row.plan_stage),
    clientId: row.client_id,
    clientName: clientLabel,
    teamId,
    teamName,
    pointOfContactMemberId,
    pointOfContactName,
    projectType: row.project_type?.trim() || undefined,
    color: "#6366f1",
    expectedEndDate: td || "TBD",
    budget:
      row.budget != null && row.budget !== ""
        ? Number(row.budget)
        : null,
    website: row.website?.trim() || null,
    sprintCount: 0,
    taskCount: 0,
    primaryPhaseId: options?.primaryPhaseId ?? null,
  };
}
