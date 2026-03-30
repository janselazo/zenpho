import type { MockSprint, TaskStatus } from "@/lib/crm/mock-data";
import type { MilestoneKey } from "@/lib/crm/product-milestones";

/** Sprint row stored per project (same shape as MockSprint). */
export type WorkspaceSprint = MockSprint;

export interface WorkspaceTaskComment {
  id: string;
  authorName: string;
  body: string;
  createdAt: string;
}

export interface WorkspaceTaskSubtask {
  id: string;
  title: string;
  done: boolean;
}

export interface WorkspaceTaskAttachment {
  id: string;
  name: string;
  url?: string;
}

export interface WorkspaceTask {
  id: string;
  projectId: string;
  title: string;
  status: TaskStatus;
  assigneeId: string | null;
  /** null = backlog only */
  sprintId: string | null;
  startDate: string;
  endDate: string;
  progress?: number;
  estimateHours?: number;
  priority?: "low" | "medium" | "high";
  description?: string;
  comments?: WorkspaceTaskComment[];
  subtasks?: WorkspaceTaskSubtask[];
  attachments?: WorkspaceTaskAttachment[];
  /** Multi-assignee; first id is mirrored to assigneeId for legacy views */
  assigneeIds?: string[];
  /** Standard delivery ladder (see product-milestones). */
  milestoneKey?: MilestoneKey;
  milestoneTags?: string[];
  /** Display-only times (HH:mm) paired with startDate/endDate */
  startTime?: string;
  endTime?: string;
}

export type RequestStatus = "new" | "in_review" | "done";

export interface WorkspaceRequest {
  id: string;
  title: string;
  description: string;
  status: RequestStatus;
  createdAt: string;
}

export interface ScopeSection {
  id: string;
  title: string;
  lines: string[];
}

export interface WorkspaceMeeting {
  id: string;
  title: string;
  startsAt: string;
  link?: string;
  notes?: string;
}

export type ResourceKind = "doc" | "design" | "repo" | "other";

export interface WorkspaceResource {
  id: string;
  label: string;
  url: string;
  kind: ResourceKind;
}

export interface ProjectWorkspace {
  sprints: WorkspaceSprint[];
  tasks: WorkspaceTask[];
  requests: WorkspaceRequest[];
  scopeSections: ScopeSection[];
  meetings: WorkspaceMeeting[];
  resources: WorkspaceResource[];
}

export function defaultProjectWorkspace(): ProjectWorkspace {
  return {
    sprints: [],
    tasks: [],
    requests: [],
    scopeSections: [],
    meetings: [],
    resources: [],
  };
}
