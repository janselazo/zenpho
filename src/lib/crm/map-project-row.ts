import type { MergedCrmFieldOptions } from "@/lib/crm/field-options";
import { productPlanStageSet } from "@/lib/crm/field-options";
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
  plan: string;
  projectType: string | null;
  expectedEndDate: string;
  budget: number | null;
  website: string | null;
  teamId: string;
  teamName: string | null;
  /** When creating from a lead: stored on metadata for Won/booked semantics. */
  sourceLeadId?: string | null;
};

/** Kanban / table product code: `PRJ-001` when `referenceNumber` is set; else legacy id tail. */
export function productReferenceLabel(p: {
  id: string;
  referenceNumber?: number | null;
}): string {
  if (
    typeof p.referenceNumber === "number" &&
    Number.isFinite(p.referenceNumber) &&
    p.referenceNumber > 0
  ) {
    return `PRJ-${String(Math.floor(p.referenceNumber)).padStart(3, "0")}`;
  }
  const tail = p.id.replace(/\D/g, "").slice(-4) || p.id.slice(0, 4);
  return `PRJ-${tail}`.toUpperCase();
}

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

export function parsePlanStage(
  v: string | null | undefined,
  opts?: { allowed: Set<string>; order?: readonly string[] }
): string {
  const builtOrder = PLAN_STAGE_ORDER as readonly string[];
  const order =
    opts?.order && opts.order.length > 0 ? opts.order : [...builtOrder];
  const allowed =
    opts?.allowed && opts.allowed.size > 0
      ? opts.allowed
      : new Set<string>(builtOrder);
  const fallback =
    order.find((slug) => allowed.has(slug)) ?? builtOrder[0] ?? "backlog";
  const s = (v ?? "").trim().toLowerCase();
  if (!s) return fallback;
  if (allowed.has(s)) return s;
  const mapped = LEGACY_PLAN_TO_STAGE[s];
  if (mapped && allowed.has(mapped)) return mapped;
  return fallback;
}

/** Label for a DB `plan_stage` slug; uses Settings labels when `labelMap` is passed. */
export function labelForStoredPlanStage(
  raw: string | null | undefined,
  labelMap?: Record<string, string>
): string | null {
  const p = typeof raw === "string" ? raw.trim().toLowerCase() : "";
  if (!p) return null;
  const fromSettings = labelMap?.[p];
  if (fromSettings) return fromSettings;
  if ((PLAN_STAGE_ORDER as readonly string[]).includes(p)) {
    return PLAN_LABELS[p as PlanStage];
  }
  const mapped = LEGACY_PLAN_TO_STAGE[p];
  if (mapped) return PLAN_LABELS[mapped];
  return p.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
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
  reference_number?: number | null;
};

export function projectRowToMock(
  row: ProjectRow,
  client: ProjectRowClientSlice,
  options?: {
    primaryPhaseId?: string | null;
    fieldOptions?: MergedCrmFieldOptions;
  }
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
  const fo = options?.fieldOptions;
  const planAllowed = fo ? productPlanStageSet(fo) : undefined;
  const planOrder = fo?.productPlanStageOrder;
  return {
    id: row.id,
    title: row.title?.trim() || "Untitled",
    plan:
      planAllowed && planOrder
        ? parsePlanStage(row.plan_stage, {
            allowed: planAllowed,
            order: planOrder,
          })
        : parsePlanStage(row.plan_stage),
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
    referenceNumber: (() => {
      const raw = row.reference_number;
      if (raw == null) return null;
      const n =
        typeof raw === "number" ? raw : Number(String(raw).trim());
      return Number.isFinite(n) && n > 0 ? Math.floor(n) : null;
    })(),
  };
}
