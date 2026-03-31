import {
  PLAN_LABELS,
  PLAN_STAGE_ORDER,
  type MockProject,
  type PlanStage,
} from "@/lib/crm/mock-data";

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

/** Legacy `plan_stage` before five-column product workflow. */
const LEGACY_PLAN_TO_STAGE: Record<string, PlanStage> = {
  pipeline: "backlog",
  mvp: "building",
  growth: "release",
};

export function parsePlanStage(v: string | null | undefined): PlanStage {
  const s = (v ?? "backlog").trim().toLowerCase();
  if ((PLAN_STAGE_ORDER as readonly string[]).includes(s)) {
    return s as PlanStage;
  }
  const mapped = LEGACY_PLAN_TO_STAGE[s];
  if (mapped) return mapped;
  return "backlog";
}

const KNOWN_STORED_PLAN_SLUGS = new Set<string>([
  ...PLAN_STAGE_ORDER,
  "pipeline",
  "mvp",
  "growth",
]);

/** Label for a DB `plan_stage` slug, or null if not a known product plan stage. */
export function labelForStoredPlanStage(raw: string | null | undefined): string | null {
  const p = typeof raw === "string" ? raw.trim().toLowerCase() : "";
  if (!p || !KNOWN_STORED_PLAN_SLUGS.has(p)) return null;
  return PLAN_LABELS[parsePlanStage(raw)];
}

/** Resolved from `client` row for products (list + detail). */
export type ProjectRowClientSlice = {
  /** Combined label for kanban/table (`name · company` or email). */
  label: string;
  contactName: string | null;
  company: string | null;
};

export function clientRowToProjectSlice(
  c:
    | {
        name?: string | null;
        email?: string | null;
        company?: string | null;
      }
    | null
    | undefined
): ProjectRowClientSlice {
  if (!c) {
    return { label: "Client", contactName: null, company: null };
  }
  const contactName = c.name?.trim() || null;
  const company = c.company?.trim() || null;
  if (contactName && company) {
    return {
      label: `${contactName} · ${company}`,
      contactName,
      company,
    };
  }
  if (contactName) {
    return { label: contactName, contactName, company: null };
  }
  if (company) {
    return { label: company, contactName: null, company };
  }
  const email = c.email?.trim() || null;
  if (email) {
    return { label: email, contactName: email, company: null };
  }
  return { label: "Client", contactName: null, company: null };
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
  client: ProjectRowClientSlice,
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
    clientName: client.label,
    clientContactName: client.contactName,
    clientCompany: client.company,
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
