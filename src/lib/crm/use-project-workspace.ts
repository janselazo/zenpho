"use client";

import { useCallback, useEffect, useState } from "react";
import type { TaskStatus } from "@/lib/crm/mock-data";
import type { MilestoneKey } from "@/lib/crm/product-milestones";
import {
  CRM_PROJECT_WORKSPACE_EVENT,
  readProjectWorkspace,
  saveProjectWorkspace,
  newEntityId,
} from "@/lib/crm/project-workspace-storage";
import {
  DEFAULT_TASK_STATUS_CYCLE,
  defaultProjectWorkspace,
  type ProjectWorkspace,
  type RequestStatus,
  type ResourceKind,
  type ScopeSection,
  type TaskCustomFieldType,
  type WorkspaceMeeting,
  type WorkspaceRequest,
  type WorkspaceResource,
  type WorkspaceSprint,
  type WorkspaceTask,
  type WorkspaceTaskAttachment,
  type WorkspaceTaskCustomFieldDef,
} from "@/lib/crm/project-workspace-types";
import { formatISODate } from "@/lib/crm/project-date-utils";

export function useProjectWorkspace(projectId: string | undefined) {
  const [workspace, setWorkspace] = useState(defaultProjectWorkspace);
  const [hydrated, setHydrated] = useState(false);

  const mutateProject = useCallback(
    (pid: string | undefined, fn: (w: ProjectWorkspace) => ProjectWorkspace) => {
      if (!pid) return;
      const current = readProjectWorkspace(pid);
      const next = fn(current);
      saveProjectWorkspace(pid, next);
      if (pid === projectId) setWorkspace(next);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event(CRM_PROJECT_WORKSPACE_EVENT));
      }
    },
    [projectId]
  );

  const mutate = useCallback(
    (fn: (w: ProjectWorkspace) => ProjectWorkspace) => {
      mutateProject(projectId, fn);
    },
    [projectId, mutateProject]
  );

  useEffect(() => {
    if (!projectId) {
      setWorkspace(defaultProjectWorkspace());
      setHydrated(true);
      return;
    }
    const load = () => {
      setWorkspace(readProjectWorkspace(projectId));
      setHydrated(true);
    };
    load();
    window.addEventListener(CRM_PROJECT_WORKSPACE_EVENT, load);
    window.addEventListener("storage", load);
    return () => {
      window.removeEventListener(CRM_PROJECT_WORKSPACE_EVENT, load);
      window.removeEventListener("storage", load);
    };
  }, [projectId]);

  const addSprint = useCallback(
    (input: Omit<WorkspaceSprint, "id" | "projectId">) => {
      if (!projectId) return;
      mutate((w) => {
        const sprint: WorkspaceSprint = {
          ...input,
          id: newEntityId("sprint"),
          projectId,
        };
        const sprints = w.sprints.map((s) => ({ ...s, isCurrent: false }));
        return {
          ...w,
          sprints: [...sprints, { ...sprint, isCurrent: true }],
        };
      });
    },
    [projectId, mutate]
  );

  const setCurrentSprint = useCallback(
    (sprintId: string) => {
      mutate((w) => ({
        ...w,
        sprints: w.sprints.map((s) => ({
          ...s,
          isCurrent: s.id === sprintId,
        })),
      }));
    },
    [mutate]
  );

  const updateSprint = useCallback(
    (
      sprintId: string,
      patch: Partial<
        Pick<WorkspaceSprint, "name" | "milestone" | "startDate" | "endDate">
      >
    ) => {
      mutate((w) => ({
        ...w,
        sprints: w.sprints.map((s) =>
          s.id === sprintId ? { ...s, ...patch } : s
        ),
      }));
    },
    [mutate]
  );

  const deleteSprint = useCallback(
    (sprintId: string) => {
      mutate((w) => {
        const deleted = w.sprints.find((s) => s.id === sprintId);
        if (!deleted) return w;
        const remaining = w.sprints.filter((s) => s.id !== sprintId);
        let sprints = remaining;
        if (deleted.isCurrent && remaining.length > 0) {
          const nextId = remaining[0].id;
          sprints = remaining.map((s) => ({
            ...s,
            isCurrent: s.id === nextId,
          }));
        }
        return {
          ...w,
          sprints,
          tasks: w.tasks.map((t) =>
            t.sprintId === sprintId ? { ...t, sprintId: null } : t
          ),
        };
      });
    },
    [mutate]
  );

  const addTask = useCallback(
    (input: {
      title: string;
      status: TaskStatus;
      sprintId: string | null;
      /** When set, task is stored under this child project workspace. */
      targetProjectId?: string;
      assigneeId?: string | null;
      startDate?: string;
      endDate?: string;
      milestoneKey?: MilestoneKey;
      productMilestoneId?: string | null;
      description?: string;
      priority?: WorkspaceTask["priority"];
      milestoneTags?: string[];
    }): string | undefined => {
      const pid = input.targetProjectId ?? projectId;
      if (!pid) return undefined;
      const today = formatISODate(new Date());
      const assigneeId = input.assigneeId ?? null;
      const id = newEntityId("task");
      const tags =
        input.milestoneTags?.map((t) => t.trim()).filter(Boolean) ?? [];
      const task: WorkspaceTask = {
        id,
        projectId: pid,
        title: input.title.trim() || "Untitled task",
        status: input.status,
        assigneeId,
        assigneeIds: assigneeId ? [assigneeId] : undefined,
        sprintId: input.sprintId,
        startDate: input.startDate ?? today,
        endDate: input.endDate ?? input.startDate ?? today,
        progress: 0,
        estimateHours: 1,
        milestoneKey: input.milestoneKey ?? "unassigned",
        productMilestoneId: input.productMilestoneId ?? null,
        description: input.description?.trim() || undefined,
        priority: input.priority,
        milestoneTags: tags.length ? tags : undefined,
      };
      mutateProject(pid, (w) => ({ ...w, tasks: [...w.tasks, task] }));
      return id;
    },
    [projectId, mutateProject]
  );

  const updateTask = useCallback(
    (taskId: string, patch: Partial<WorkspaceTask>) => {
      mutate((w) => ({
        ...w,
        tasks: w.tasks.map((t) => (t.id === taskId ? { ...t, ...patch } : t)),
      }));
    },
    [mutate]
  );

  const deleteTask = useCallback(
    (taskId: string) => {
      mutate((w) => ({
        ...w,
        tasks: w.tasks.filter((t) => t.id !== taskId),
      }));
    },
    [mutate]
  );

  const addTaskCustomField = useCallback(
    (type: TaskCustomFieldType) => {
      if (!projectId) return;
      const id = newEntityId("fld");
      const def: WorkspaceTaskCustomFieldDef =
        type === "text"
          ? { id, label: "Text", type: "text" }
          : type === "number"
            ? { id, label: "Number", type: "number" }
            : type === "dropdown"
              ? {
                  id,
                  label: "Dropdown",
                  type: "dropdown",
                  options: ["Option A", "Option B"],
                }
              : {
                  id,
                  label: "Labels",
                  type: "labels",
                  options: ["Label 1", "Label 2"],
                };
      mutate((w) => ({
        ...w,
        taskCustomFields: [...w.taskCustomFields, def],
      }));
    },
    [projectId, mutate]
  );

  const removeTaskCustomField = useCallback(
    (fieldId: string) => {
      mutate((w) => ({
        ...w,
        taskCustomFields: w.taskCustomFields.filter((f) => f.id !== fieldId),
        tasks: w.tasks.map((t) => {
          const cv = { ...(t.customFieldValues ?? {}) };
          delete cv[fieldId];
          const keys = Object.keys(cv);
          return {
            ...t,
            customFieldValues: keys.length ? cv : undefined,
          };
        }),
      }));
    },
    [mutate]
  );

  const setTaskStatusConfiguration = useCallback(
    (payload: {
      labels: Partial<Record<TaskStatus, string>>;
      cycleOrder: TaskStatus[];
    }) => {
      mutate((w) => {
        const merged: Partial<Record<TaskStatus, string>> = {
          ...(w.taskStatusLabels ?? {}),
        };
        for (const s of DEFAULT_TASK_STATUS_CYCLE) {
          if (!Object.prototype.hasOwnProperty.call(payload.labels, s)) continue;
          const t = (payload.labels[s] ?? "").trim();
          if (t) merged[s] = t;
          else delete merged[s];
        }
        return {
          ...w,
          taskStatusLabels:
            Object.keys(merged).length > 0 ? merged : undefined,
          taskStatusCycleOrder:
            payload.cycleOrder.length === DEFAULT_TASK_STATUS_CYCLE.length
              ? payload.cycleOrder
              : w.taskStatusCycleOrder,
        };
      });
    },
    [mutate]
  );

  const addTaskComment = useCallback(
    (taskId: string, authorName: string, body: string) => {
      const text = body.trim();
      if (!text) return;
      mutate((w) => ({
        ...w,
        tasks: w.tasks.map((t) => {
          if (t.id !== taskId) return t;
          const comment = {
            id: newEntityId("tcmt"),
            authorName: authorName.trim() || "You",
            body: text,
            createdAt: new Date().toISOString(),
          };
          return { ...t, comments: [...(t.comments ?? []), comment] };
        }),
      }));
    },
    [mutate]
  );

  const addSubtask = useCallback(
    (taskId: string, title: string) => {
      const text = title.trim();
      if (!text) return;
      mutate((w) => ({
        ...w,
        tasks: w.tasks.map((t) => {
          if (t.id !== taskId) return t;
          const st = {
            id: newEntityId("sub"),
            title: text,
            done: false,
          };
          return { ...t, subtasks: [...(t.subtasks ?? []), st] };
        }),
      }));
    },
    [mutate]
  );

  const updateSubtask = useCallback(
    (taskId: string, subtaskId: string, patch: { title?: string; done?: boolean }) => {
      mutate((w) => ({
        ...w,
        tasks: w.tasks.map((t) => {
          if (t.id !== taskId) return t;
          return {
            ...t,
            subtasks: (t.subtasks ?? []).map((s) =>
              s.id === subtaskId ? { ...s, ...patch } : s
            ),
          };
        }),
      }));
    },
    [mutate]
  );

  const removeSubtask = useCallback(
    (taskId: string, subtaskId: string) => {
      mutate((w) => ({
        ...w,
        tasks: w.tasks.map((t) => {
          if (t.id !== taskId) return t;
          return {
            ...t,
            subtasks: (t.subtasks ?? []).filter((s) => s.id !== subtaskId),
          };
        }),
      }));
    },
    [mutate]
  );

  const addTaskAttachment = useCallback(
    (taskId: string, att: Omit<WorkspaceTaskAttachment, "id">) => {
      const name = att.name.trim();
      if (!name) return;
      mutate((w) => ({
        ...w,
        tasks: w.tasks.map((t) => {
          if (t.id !== taskId) return t;
          const row: WorkspaceTaskAttachment = {
            id: newEntityId("att"),
            name,
            url: att.url?.trim() || undefined,
          };
          return { ...t, attachments: [...(t.attachments ?? []), row] };
        }),
      }));
    },
    [mutate]
  );

  const removeTaskAttachment = useCallback(
    (taskId: string, attachmentId: string) => {
      mutate((w) => ({
        ...w,
        tasks: w.tasks.map((t) => {
          if (t.id !== taskId) return t;
          return {
            ...t,
            attachments: (t.attachments ?? []).filter((a) => a.id !== attachmentId),
          };
        }),
      }));
    },
    [mutate]
  );

  const addRequest = useCallback(
    (title: string, description: string) => {
      const r: WorkspaceRequest = {
        id: newEntityId("req"),
        title: title.trim(),
        description: description.trim(),
        status: "new",
        createdAt: new Date().toISOString(),
      };
      mutate((w) => ({ ...w, requests: [...w.requests, r] }));
    },
    [mutate]
  );

  const updateRequest = useCallback(
    (id: string, patch: Partial<WorkspaceRequest>) => {
      mutate((w) => ({
        ...w,
        requests: w.requests.map((r) => (r.id === id ? { ...r, ...patch } : r)),
      }));
    },
    [mutate]
  );

  const addScopeSection = useCallback(
    (title: string) => {
      const s: ScopeSection = {
        id: newEntityId("scope"),
        title: title.trim(),
        lines: [],
      };
      mutate((w) => ({ ...w, scopeSections: [...w.scopeSections, s] }));
    },
    [mutate]
  );

  const updateScopeSection = useCallback(
    (id: string, patch: Partial<ScopeSection>) => {
      mutate((w) => ({
        ...w,
        scopeSections: w.scopeSections.map((s) =>
          s.id === id ? { ...s, ...patch } : s
        ),
      }));
    },
    [mutate]
  );

  const addScopeLine = useCallback(
    (sectionId: string, line: string) => {
      const text = line.trim();
      if (!text) return;
      mutate((w) => ({
        ...w,
        scopeSections: w.scopeSections.map((s) =>
          s.id === sectionId ? { ...s, lines: [...s.lines, text] } : s
        ),
      }));
    },
    [mutate]
  );

  const addMeeting = useCallback(
    (input: Omit<WorkspaceMeeting, "id">) => {
      const m: WorkspaceMeeting = { ...input, id: newEntityId("mtg") };
      mutate((w) => ({ ...w, meetings: [...w.meetings, m] }));
    },
    [mutate]
  );

  const addResource = useCallback(
    (label: string, url: string, kind: ResourceKind) => {
      const r: WorkspaceResource = {
        id: newEntityId("res"),
        label: label.trim(),
        url: url.trim(),
        kind,
      };
      mutate((w) => ({ ...w, resources: [...w.resources, r] }));
    },
    [mutate]
  );

  const deleteResource = useCallback(
    (id: string) => {
      mutate((w) => ({
        ...w,
        resources: w.resources.filter((r) => r.id !== id),
      }));
    },
    [mutate]
  );

  return {
    workspace,
    hydrated,
    addSprint,
    updateSprint,
    deleteSprint,
    setCurrentSprint,
    addTask,
    updateTask,
    deleteTask,
    addTaskCustomField,
    removeTaskCustomField,
    setTaskStatusConfiguration,
    addTaskComment,
    addSubtask,
    updateSubtask,
    removeSubtask,
    addTaskAttachment,
    removeTaskAttachment,
    addRequest,
    updateRequest,
    updateRequestStatus: (id: string, status: RequestStatus) =>
      updateRequest(id, { status }),
    addScopeSection,
    updateScopeSection,
    addScopeLine,
    addMeeting,
    addResource,
    deleteResource,
  };
}
