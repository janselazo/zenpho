import type { TaskStatus } from "@/lib/crm/mock-data";
import { parseMilestoneKey } from "@/lib/crm/product-milestones";
import {
  DEFAULT_TASK_STATUS_CYCLE,
  defaultProjectWorkspace,
  type ProjectWorkspace,
  type TaskCustomFieldType,
  type WorkspaceTask,
  type WorkspaceTaskAttachment,
  type WorkspaceTaskComment,
  type WorkspaceTaskCustomFieldDef,
  type WorkspaceTaskSubtask,
} from "@/lib/crm/project-workspace-types";

const TASK_STATUSES: TaskStatus[] = [
  "not_started",
  "action_started",
  "in_progress",
  "test_qa",
  "completed",
];

function parseTaskStatus(v: unknown): TaskStatus {
  return TASK_STATUSES.includes(v as TaskStatus)
    ? (v as TaskStatus)
    : "not_started";
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function normalizeComment(raw: unknown): WorkspaceTaskComment | null {
  if (!isRecord(raw)) return null;
  const id = String(raw.id ?? "");
  if (!id) return null;
  return {
    id,
    authorName: String(raw.authorName ?? "Unknown"),
    body: String(raw.body ?? ""),
    createdAt: String(raw.createdAt ?? new Date().toISOString()),
  };
}

function normalizeSubtask(raw: unknown): WorkspaceTaskSubtask | null {
  if (!isRecord(raw)) return null;
  const id = String(raw.id ?? "");
  if (!id) return null;
  return {
    id,
    title: String(raw.title ?? ""),
    done: Boolean(raw.done),
  };
}

function normalizeAttachment(raw: unknown): WorkspaceTaskAttachment | null {
  if (!isRecord(raw)) return null;
  const id = String(raw.id ?? "");
  if (!id) return null;
  return {
    id,
    name: String(raw.name ?? "File"),
    url: raw.url != null ? String(raw.url) : undefined,
  };
}

export function normalizeWorkspaceTask(raw: unknown): WorkspaceTask | null {
  if (!isRecord(raw)) return null;
  const id = String(raw.id ?? "");
  const projectId = String(raw.projectId ?? "");
  if (!id || !projectId) return null;

  const status = parseTaskStatus(raw.status);
  const commentsIn = Array.isArray(raw.comments)
    ? raw.comments.map(normalizeComment).filter(Boolean) as WorkspaceTaskComment[]
    : [];
  const subtasksIn = Array.isArray(raw.subtasks)
    ? raw.subtasks.map(normalizeSubtask).filter(Boolean) as WorkspaceTaskSubtask[]
    : [];
  const attachmentsIn = Array.isArray(raw.attachments)
    ? raw.attachments.map(normalizeAttachment).filter(Boolean) as WorkspaceTaskAttachment[]
    : [];
  const assigneeIdsIn = Array.isArray(raw.assigneeIds)
    ? raw.assigneeIds.map((x) => String(x)).filter(Boolean)
    : [];
  const milestoneTagsIn = Array.isArray(raw.milestoneTags)
    ? raw.milestoneTags.map((x) => String(x)).filter(Boolean)
    : [];

  const assigneeId =
    raw.assigneeId != null && String(raw.assigneeId)
      ? String(raw.assigneeId)
      : assigneeIdsIn[0] ?? null;

  const assigneeIdsOut =
    assigneeIdsIn.length > 0
      ? assigneeIdsIn
      : assigneeId
        ? [assigneeId]
        : undefined;

  const today = new Date().toISOString().slice(0, 10);
  const startDate = String(raw.startDate ?? today);
  const endDate = String(raw.endDate ?? startDate);

  let customFieldValues: Record<string, string | number | string[]> | undefined;
  if (isRecord(raw.customFieldValues)) {
    const cf: Record<string, string | number | string[]> = {};
    for (const [key, v] of Object.entries(raw.customFieldValues)) {
      if (Array.isArray(v)) cf[key] = v.map((x) => String(x));
      else if (typeof v === "number") cf[key] = v;
      else if (typeof v === "string") cf[key] = v;
    }
    if (Object.keys(cf).length) customFieldValues = cf;
  }

  const productMilestoneIdRaw = raw.productMilestoneId;
  const productMilestoneId =
    productMilestoneIdRaw != null && String(productMilestoneIdRaw).trim()
      ? String(productMilestoneIdRaw)
      : null;

  const milestoneKey = parseMilestoneKey(
    typeof raw.milestoneKey === "string" ? raw.milestoneKey : null
  );

  const sprintIdRaw = raw.sprintId;
  const sprintId =
    sprintIdRaw === null || sprintIdRaw === undefined || sprintIdRaw === ""
      ? null
      : String(sprintIdRaw);

  return {
    id,
    projectId,
    title: String(raw.title ?? "Untitled"),
    status,
    assigneeId,
    sprintId,
    startDate,
    endDate,
    progress: typeof raw.progress === "number" ? raw.progress : 0,
    estimateHours: typeof raw.estimateHours === "number" ? raw.estimateHours : 1,
    priority:
      raw.priority === "low" ||
      raw.priority === "medium" ||
      raw.priority === "high" ||
      raw.priority === "urgent"
        ? raw.priority
        : undefined,
    description:
      typeof raw.description === "string" ? raw.description : undefined,
    comments: commentsIn.length ? commentsIn : undefined,
    subtasks: subtasksIn.length ? subtasksIn : undefined,
    attachments: attachmentsIn.length ? attachmentsIn : undefined,
    assigneeIds: assigneeIdsOut,
    milestoneTags: milestoneTagsIn.length ? milestoneTagsIn : undefined,
    startTime: typeof raw.startTime === "string" ? raw.startTime : undefined,
    endTime: typeof raw.endTime === "string" ? raw.endTime : undefined,
    customFieldValues,
    productMilestoneId,
    milestoneKey,
  };
}

function normalizeTaskCustomFieldDef(
  raw: unknown
): WorkspaceTaskCustomFieldDef | null {
  if (!isRecord(raw)) return null;
  const id = String(raw.id ?? "");
  const label = String(raw.label ?? "").trim();
  const type = raw.type as TaskCustomFieldType;
  if (!id || !label) return null;
  if (type !== "text" && type !== "number" && type !== "dropdown" && type !== "labels")
    return null;
  const optionsIn = Array.isArray(raw.options)
    ? raw.options.map((x) => String(x).trim()).filter(Boolean)
    : [];
  return {
    id,
    label,
    type,
    options:
      (type === "dropdown" || type === "labels") && optionsIn.length
        ? optionsIn
        : type === "dropdown" || type === "labels"
          ? ["Option A"]
          : undefined,
  };
}

function normalizeTaskCustomFields(
  raw: unknown
): WorkspaceTaskCustomFieldDef[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map(normalizeTaskCustomFieldDef)
    .filter((x): x is WorkspaceTaskCustomFieldDef => x != null);
}

function normalizeTaskStatusLabels(
  raw: unknown
): Partial<Record<TaskStatus, string>> | undefined {
  if (!isRecord(raw)) return undefined;
  const out: Partial<Record<TaskStatus, string>> = {};
  for (const s of TASK_STATUSES) {
    const v = raw[s];
    if (typeof v === "string" && v.trim()) out[s] = v.trim();
  }
  return Object.keys(out).length ? out : undefined;
}

function normalizeTaskStatusCycleOrder(
  raw: unknown
): TaskStatus[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const seen = new Set<TaskStatus>();
  const out: TaskStatus[] = [];
  for (const x of raw) {
    const s = parseTaskStatus(x);
    if (!seen.has(s)) {
      seen.add(s);
      out.push(s);
    }
  }
  for (const s of DEFAULT_TASK_STATUS_CYCLE) {
    if (!seen.has(s)) out.push(s);
  }
  return out.length === TASK_STATUSES.length ? out : undefined;
}

export const CRM_PROJECT_WORKSPACE_KEY = "crm_project_workspace_v1";

export const CRM_PROJECT_WORKSPACE_EVENT = "crm-project-workspace-changed";

type WorkspaceMap = Record<string, ProjectWorkspace>;

function readAll(): WorkspaceMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(CRM_PROJECT_WORKSPACE_KEY);
    if (!raw) return {};
    const data = JSON.parse(raw) as unknown;
    if (!data || typeof data !== "object") return {};
    return data as WorkspaceMap;
  } catch {
    return {};
  }
}

function writeAll(map: WorkspaceMap) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(CRM_PROJECT_WORKSPACE_KEY, JSON.stringify(map));
    window.dispatchEvent(new Event(CRM_PROJECT_WORKSPACE_EVENT));
  } catch {
    /* ignore */
  }
}

export function readProjectWorkspace(projectId: string): ProjectWorkspace {
  const all = readAll();
  const w = all[projectId];
  if (!w) return defaultProjectWorkspace();
  const base = defaultProjectWorkspace();
  return {
    ...base,
    ...w,
    sprints: Array.isArray(w.sprints) ? w.sprints : [],
    tasks: Array.isArray(w.tasks)
      ? w.tasks
          .map((t) => normalizeWorkspaceTask(t))
          .filter((t): t is WorkspaceTask => t != null)
      : [],
    requests: Array.isArray(w.requests) ? w.requests : [],
    scopeSections: Array.isArray(w.scopeSections) ? w.scopeSections : [],
    meetings: Array.isArray(w.meetings) ? w.meetings : [],
    resources: Array.isArray(w.resources) ? w.resources : [],
    taskCustomFields: normalizeTaskCustomFields(w.taskCustomFields),
    taskStatusLabels: normalizeTaskStatusLabels(w.taskStatusLabels),
    taskStatusCycleOrder: normalizeTaskStatusCycleOrder(w.taskStatusCycleOrder),
  };
}

export function saveProjectWorkspace(
  projectId: string,
  workspace: ProjectWorkspace
) {
  const all = readAll();
  all[projectId] = workspace;
  writeAll(all);
}

export function newEntityId(prefix: string): string {
  if (typeof globalThis !== "undefined" && globalThis.crypto?.randomUUID) {
    return `${prefix}-${globalThis.crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}
