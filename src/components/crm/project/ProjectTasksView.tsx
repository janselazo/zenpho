"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  getMemberById,
  TASK_STATUS_COLORS,
  TASK_STATUS_LABELS,
  type TaskStatus,
} from "@/lib/crm/mock-data";
import { useCrmTeamMembers } from "@/lib/crm/use-crm-team-members";
import { formatISODate } from "@/lib/crm/project-date-utils";
import CrmPopoverDateField from "@/components/crm/CrmPopoverDateField";
import CrmPopoverTimeField from "@/components/crm/CrmPopoverTimeField";
import type {
  WorkspaceSprint,
  WorkspaceTask,
} from "@/lib/crm/project-workspace-types";
import {
  Check,
  FileText,
  MessageSquare,
  Paperclip,
  ListChecks,
  X,
  Plus,
  Trash2,
  MoreVertical,
  Search,
} from "lucide-react";

const STATUS_ORDER: TaskStatus[] = [
  "not_started",
  "action_started",
  "in_progress",
  "test_qa",
  "completed",
];

const PRIORITY_OPTIONS = [
  { value: "", label: "Not set" },
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
] as const;

type InnerTab = "description" | "files" | "comments" | "subtasks";

export type TaskCreateIntent = {
  status: TaskStatus;
  sprintId: string | null;
} | null;

type Props = {
  tasks: WorkspaceTask[];
  sprints: WorkspaceSprint[];
  onAddTask: (input: {
    title: string;
    status: TaskStatus;
    sprintId: string | null;
    assigneeId?: string | null;
    startDate?: string;
    endDate?: string;
  }) => string | undefined;
  onUpdateTask: (taskId: string, patch: Partial<WorkspaceTask>) => void;
  onDeleteTask: (taskId: string) => void;
  onAddTaskComment: (taskId: string, authorName: string, body: string) => void;
  onAddSubtask: (taskId: string, title: string) => void;
  onUpdateSubtask: (
    taskId: string,
    subtaskId: string,
    patch: { title?: string; done?: boolean }
  ) => void;
  onRemoveSubtask: (taskId: string, subtaskId: string) => void;
  onAddAttachment: (
    taskId: string,
    att: { name: string; url?: string }
  ) => void;
  onRemoveAttachment: (taskId: string, attachmentId: string) => void;
  createIntent: TaskCreateIntent;
  onConsumedCreateIntent: () => void;
};

function sprintLabel(sprints: WorkspaceSprint[], sprintId: string | null) {
  if (sprintId == null) return "Backlog";
  const s = sprints.find((x) => x.id === sprintId);
  return s?.name ?? "Sprint";
}

function assigneeList(task: WorkspaceTask): string[] {
  if (task.assigneeIds?.length) return task.assigneeIds;
  if (task.assigneeId) return [task.assigneeId];
  return [];
}

function formatHoursParts(hours: number) {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return { h, m };
}

function formatDurationLabel(hours: number) {
  const { h, m } = formatHoursParts(Math.max(0, hours));
  if (h <= 0 && m <= 0) return "0m";
  return `${h > 0 ? `${h}h ` : ""}${m > 0 ? `${m}m` : ""}`.trim();
}

export default function ProjectTasksView({
  tasks,
  sprints,
  onAddTask,
  onUpdateTask,
  onDeleteTask,
  onAddTaskComment,
  onAddSubtask,
  onUpdateSubtask,
  onRemoveSubtask,
  onAddAttachment,
  onRemoveAttachment,
  createIntent,
  onConsumedCreateIntent,
}: Props) {
  const teamMembers = useCrmTeamMembers();
  const resolveAssigneeMember = useCallback(
    (id: string) =>
      teamMembers.find((m) => m.id === id) ?? getMemberById(id),
    [teamMembers]
  );
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [isNew, setIsNew] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [innerTab, setInnerTab] = useState<InnerTab>("description");

  const [draftTitle, setDraftTitle] = useState("");
  const [draftDescription, setDraftDescription] = useState("");
  const [draftStatus, setDraftStatus] = useState<TaskStatus>("not_started");
  const [draftSprintId, setDraftSprintId] = useState<string | null>(null);
  const [draftStartDate, setDraftStartDate] = useState("");
  const [draftEndDate, setDraftEndDate] = useState("");
  const [draftStartTime, setDraftStartTime] = useState("");
  const [draftEndTime, setDraftEndTime] = useState("");
  const [draftPriority, setDraftPriority] = useState<
    "" | "low" | "medium" | "high"
  >("");
  const [draftAssigneeIds, setDraftAssigneeIds] = useState<string[]>([]);
  const [draftMilestoneTags, setDraftMilestoneTags] = useState<string[]>([]);
  const [draftProgress, setDraftProgress] = useState(0);
  const [draftEstimate, setDraftEstimate] = useState(1);
  const [newMilestoneInput, setNewMilestoneInput] = useState("");
  const [assigneeSearch, setAssigneeSearch] = useState("");
  const [commentDraft, setCommentDraft] = useState("");
  const [subtaskDraft, setSubtaskDraft] = useState("");
  const [fileNameDraft, setFileNameDraft] = useState("");
  const [fileUrlDraft, setFileUrlDraft] = useState("");

  const modalRef = useRef<HTMLDivElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);

  const milestoneSuggestions = useMemo(() => {
    const set = new Set<string>();
    for (const s of sprints) {
      if (s.milestone?.trim()) set.add(s.milestone.trim());
    }
    return Array.from(set);
  }, [sprints]);

  const openCreate = useCallback(
    (defaults?: { status: TaskStatus; sprintId: string | null }) => {
      const today = formatISODate(new Date());
      setIsNew(true);
      setEditingId(null);
      setInnerTab("description");
      setDraftTitle("");
      setDraftDescription("");
      setDraftStatus(defaults?.status ?? "not_started");
      setDraftSprintId(defaults?.sprintId ?? null);
      setDraftStartDate(today);
      setDraftEndDate(today);
      setDraftStartTime("");
      setDraftEndTime("");
      setDraftPriority("");
      setDraftAssigneeIds([]);
      setDraftMilestoneTags([]);
      setDraftProgress(0);
      setDraftEstimate(1);
      setCommentDraft("");
      setSubtaskDraft("");
      setFileNameDraft("");
      setFileUrlDraft("");
      setAssigneeSearch("");
      setModalOpen(true);
    },
    []
  );

  const openEdit = useCallback((task: WorkspaceTask) => {
    setIsNew(false);
    setEditingId(task.id);
    setInnerTab("description");
    setDraftTitle(task.title);
    setDraftDescription(task.description ?? "");
    setDraftStatus(task.status);
    setDraftSprintId(task.sprintId);
    setDraftStartDate(task.startDate);
    setDraftEndDate(task.endDate);
    setDraftStartTime(task.startTime ?? "");
    setDraftEndTime(task.endTime ?? "");
    setDraftPriority(task.priority ?? "");
    setDraftAssigneeIds(assigneeList(task));
    setDraftMilestoneTags(task.milestoneTags ?? []);
    setDraftProgress(task.progress ?? 0);
    setDraftEstimate(task.estimateHours ?? 1);
    setCommentDraft("");
    setSubtaskDraft("");
    setFileNameDraft("");
    setFileUrlDraft("");
    setAssigneeSearch("");
    setModalOpen(true);
  }, []);

  useEffect(() => {
    if (!createIntent) return;
    openCreate({
      status: createIntent.status,
      sprintId: createIntent.sprintId,
    });
    onConsumedCreateIntent();
  }, [createIntent, onConsumedCreateIntent, openCreate]);

  useEffect(() => {
    if (!modalOpen) return;
    const t = window.setTimeout(() => closeBtnRef.current?.focus(), 50);
    return () => window.clearTimeout(t);
  }, [modalOpen]);

  useEffect(() => {
    if (!modalOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setModalOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [modalOpen]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return tasks;
    return tasks.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        (t.description ?? "").toLowerCase().includes(q)
    );
  }, [tasks, search]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const ae = a.endDate || "";
      const be = b.endDate || "";
      return ae.localeCompare(be);
    });
  }, [filtered]);

  function persistDraftToTask(taskId: string) {
    const primary = draftAssigneeIds[0] ?? null;
    onUpdateTask(taskId, {
      title: draftTitle.trim() || "Untitled task",
      description: draftDescription.trim() || undefined,
      status: draftStatus,
      sprintId: draftSprintId,
      startDate: draftStartDate,
      endDate: draftEndDate,
      startTime: draftStartTime.trim() || undefined,
      endTime: draftEndTime.trim() || undefined,
      priority: draftPriority || undefined,
      assigneeId: primary,
      assigneeIds: draftAssigneeIds.length ? draftAssigneeIds : undefined,
      milestoneTags: draftMilestoneTags.length ? draftMilestoneTags : undefined,
      progress: Math.min(100, Math.max(0, draftProgress)),
      estimateHours: Math.max(0.25, draftEstimate),
    });
  }

  function handleSave() {
    if (!draftTitle.trim()) return;
    if (isNew) {
      const primary = draftAssigneeIds[0] ?? null;
      const id = onAddTask({
        title: draftTitle.trim(),
        status: draftStatus,
        sprintId: draftSprintId,
        assigneeId: primary,
        startDate: draftStartDate,
        endDate: draftEndDate,
      });
      if (id) {
        onUpdateTask(id, {
          description: draftDescription.trim() || undefined,
          startTime: draftStartTime.trim() || undefined,
          endTime: draftEndTime.trim() || undefined,
          priority: draftPriority || undefined,
          assigneeIds: draftAssigneeIds.length ? draftAssigneeIds : undefined,
          assigneeId: primary,
          milestoneTags: draftMilestoneTags.length ? draftMilestoneTags : undefined,
          progress: Math.min(100, Math.max(0, draftProgress)),
          estimateHours: Math.max(0.25, draftEstimate),
        });
      }
      setModalOpen(false);
      return;
    }
    if (editingId) persistDraftToTask(editingId);
    setModalOpen(false);
  }

  function handleMarkComplete() {
    if (isNew) {
      setDraftStatus("completed");
      return;
    }
    if (editingId) onUpdateTask(editingId, { status: "completed" });
    setDraftStatus("completed");
  }

  function toggleAssignee(id: string) {
    setDraftAssigneeIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function addMilestoneTag(tag: string) {
    const t = tag.trim();
    if (!t || draftMilestoneTags.includes(t)) return;
    setDraftMilestoneTags((prev) => [...prev, t]);
    setNewMilestoneInput("");
  }

  function removeMilestoneTag(tag: string) {
    setDraftMilestoneTags((prev) => prev.filter((x) => x !== tag));
  }

  const estimate = Math.max(0.25, draftEstimate);
  const progressPct = Math.min(100, Math.max(0, draftProgress));
  const loggedHours = estimate * (progressPct / 100);
  const remainingHours = Math.max(0, estimate - loggedHours);
  const barFilled = Math.round(progressPct / 10);

  const taskDateTriggerClass =
    "mt-1 w-full rounded-xl border border-border px-3 py-2 dark:border-zinc-600 dark:bg-zinc-800 relative flex min-h-[2.625rem] items-center text-left";

  const assigneePickList = teamMembers.filter((m) => {
    const q = assigneeSearch.trim().toLowerCase();
    if (!q) return true;
    return (
      m.name.toLowerCase().includes(q) ||
      m.email.toLowerCase().includes(q)
    );
  });

  const currentTask = editingId
    ? tasks.find((t) => t.id === editingId)
    : null;

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-bold text-text-primary dark:text-zinc-100">
            Tasks
          </h2>
          <p className="mt-1 text-sm text-text-secondary">
            All work items for this project. Same list powers Sprint Board,
            Backlog, and Gantt.
          </p>
        </div>
        <button
          type="button"
          onClick={() => openCreate()}
          className="shrink-0 rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-accent-hover"
        >
          + Add task
        </button>
      </div>

      <div className="relative mt-4 max-w-md">
        <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary/50" />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search tasks…"
          className="w-full rounded-xl border border-border bg-white py-2 pl-9 pr-3 text-sm text-text-primary outline-none focus:border-accent focus:ring-2 focus:ring-accent/15 dark:border-zinc-700 dark:bg-zinc-800/50"
        />
      </div>

      <div className="mt-6 overflow-x-auto rounded-2xl border border-border bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900/40">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="border-b border-border dark:border-zinc-800">
              <th className="px-4 py-3 font-semibold text-text-secondary">
                Task
              </th>
              <th className="px-4 py-3 font-semibold text-text-secondary">
                Status
              </th>
              <th className="px-4 py-3 font-semibold text-text-secondary">
                Sprint
              </th>
              <th className="px-4 py-3 font-semibold text-text-secondary">
                Dates
              </th>
              <th className="px-4 py-3 font-semibold text-text-secondary">
                Assignees
              </th>
              <th className="px-4 py-3 font-semibold text-text-secondary w-28">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border dark:divide-zinc-800">
            {sorted.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-12 text-center text-text-secondary"
                >
                  No tasks yet. Add one to see it on the sprint board and
                  timeline views.
                </td>
              </tr>
            ) : (
              sorted.map((t) => {
                const ids = assigneeList(t);
                return (
                  <tr
                    key={t.id}
                    className="transition-colors hover:bg-surface/60 dark:hover:bg-zinc-800/40"
                  >
                    <td className="px-4 py-3">
                      <span className="font-medium text-text-primary dark:text-zinc-100">
                        {t.title}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium text-white"
                        style={{
                          backgroundColor: TASK_STATUS_COLORS[t.status],
                        }}
                      >
                        {TASK_STATUS_LABELS[t.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-text-secondary">
                      {sprintLabel(sprints, t.sprintId)}
                    </td>
                    <td className="px-4 py-3 text-xs text-text-secondary">
                      {t.startDate} → {t.endDate}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {ids.length === 0 ? (
                          <span className="text-xs text-text-secondary">—</span>
                        ) : (
                          ids.map((aid) => {
                            const m = resolveAssigneeMember(aid);
                            return (
                              <span
                                key={aid}
                                className="inline-flex items-center gap-1 rounded-full bg-surface px-2 py-0.5 text-xs dark:bg-zinc-800"
                              >
                                <span className="font-medium">
                                  {m?.name ?? "Unknown"}
                                </span>
                              </span>
                            );
                          })
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => openEdit(t)}
                        className="text-sm font-medium text-accent hover:underline"
                      >
                        Open
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {modalOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setModalOpen(false);
          }}
        >
          <div
            ref={modalRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="task-modal-title"
            className="flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-border bg-white shadow-2xl dark:border-zinc-700 dark:bg-zinc-900"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3 border-b border-border px-5 py-4 dark:border-zinc-800">
              <button
                type="button"
                onClick={handleMarkComplete}
                className="mt-0.5 inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-xs font-semibold text-text-primary hover:bg-surface dark:border-zinc-600 dark:hover:bg-zinc-800"
              >
                <Check className="h-4 w-4" />
                Mark as completed
              </button>
              <div className="min-w-0 flex-1" />
              <button
                ref={closeBtnRef}
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-lg p-2 text-text-secondary hover:bg-surface dark:hover:bg-zinc-800"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto">
              <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
                {/* Left column */}
                <div className="space-y-4 border-b border-border p-5 lg:border-b-0 lg:border-r dark:border-zinc-800">
                  <div>
                    <label htmlFor="task-modal-title" className="sr-only">
                      Title
                    </label>
                    <input
                      id="task-modal-title"
                      value={draftTitle}
                      onChange={(e) => setDraftTitle(e.target.value)}
                      placeholder="Task title"
                      className="w-full border-0 bg-transparent text-xl font-bold text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:ring-0 dark:text-zinc-100"
                    />
                    <p className="mt-1 text-xs text-text-secondary">
                      Fill in details and use the tabs to add context, files,
                      and discussion.
                    </p>
                  </div>

                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-secondary">
                      Assignees
                    </p>
                    <input
                      type="search"
                      value={assigneeSearch}
                      onChange={(e) => setAssigneeSearch(e.target.value)}
                      placeholder="Search for a person"
                      className="w-full rounded-xl border border-border px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-800"
                    />
                    <div className="mt-2 max-h-32 space-y-1 overflow-y-auto rounded-xl border border-border p-2 dark:border-zinc-700">
                      {assigneePickList.length === 0 ? (
                        <p className="text-xs text-text-secondary">
                          No team members match. Add people on the Team page.
                        </p>
                      ) : (
                        assigneePickList.map((m) => (
                          <label
                            key={m.id}
                            className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-surface dark:hover:bg-zinc-800"
                          >
                            <input
                              type="checkbox"
                              checked={draftAssigneeIds.includes(m.id)}
                              onChange={() => toggleAssignee(m.id)}
                              className="rounded border-border"
                            />
                            <span className="text-sm">{m.name}</span>
                            <span className="text-xs text-text-secondary">
                              {m.role}
                            </span>
                          </label>
                        ))
                      )}
                    </div>
                    {draftAssigneeIds.length > 0 ? (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {draftAssigneeIds.map((id) => {
                          const m = resolveAssigneeMember(id);
                          return (
                            <span
                              key={id}
                              className="inline-flex items-center gap-1 rounded-full border border-border bg-surface px-2 py-0.5 text-xs dark:border-zinc-600 dark:bg-zinc-800"
                            >
                              {m?.name ?? "Unknown"}
                              <button
                                type="button"
                                onClick={() =>
                                  setDraftAssigneeIds((prev) =>
                                    prev.filter((x) => x !== id)
                                  )
                                }
                                className="text-text-secondary hover:text-text-primary"
                                aria-label="Remove"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </span>
                          );
                        })}
                      </div>
                    ) : null}
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label
                        htmlFor="task-start-date"
                        className="block text-xs font-medium text-text-secondary"
                      >
                        Start date
                      </label>
                      <CrmPopoverDateField
                        id="task-start-date"
                        value={draftStartDate}
                        onChange={setDraftStartDate}
                        displayFormat="numeric"
                        triggerClassName={taskDateTriggerClass}
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="task-end-date"
                        className="block text-xs font-medium text-text-secondary"
                      >
                        End date
                      </label>
                      <CrmPopoverDateField
                        id="task-end-date"
                        value={draftEndDate}
                        onChange={setDraftEndDate}
                        displayFormat="numeric"
                        triggerClassName={taskDateTriggerClass}
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="task-start-time"
                        className="block text-xs font-medium text-text-secondary"
                      >
                        Start time
                      </label>
                      <CrmPopoverTimeField
                        id="task-start-time"
                        value={draftStartTime}
                        onChange={setDraftStartTime}
                        triggerClassName={taskDateTriggerClass}
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="task-end-time"
                        className="block text-xs font-medium text-text-secondary"
                      >
                        End time
                      </label>
                      <CrmPopoverTimeField
                        id="task-end-time"
                        value={draftEndTime}
                        onChange={setDraftEndTime}
                        triggerClassName={taskDateTriggerClass}
                      />
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="block text-xs font-medium text-text-secondary">
                      Status
                      <select
                        value={draftStatus}
                        onChange={(e) =>
                          setDraftStatus(e.target.value as TaskStatus)
                        }
                        className="mt-1 w-full rounded-xl border border-border px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-800"
                      >
                        {STATUS_ORDER.map((s) => (
                          <option key={s} value={s}>
                            {TASK_STATUS_LABELS[s]}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="block text-xs font-medium text-text-secondary">
                      Priority
                      <select
                        value={draftPriority}
                        onChange={(e) =>
                          setDraftPriority(
                            e.target.value as typeof draftPriority
                          )
                        }
                        className="mt-1 w-full rounded-xl border border-border px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-800"
                      >
                        {PRIORITY_OPTIONS.map((o) => (
                          <option key={o.value || "none"} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>

                  <label className="block text-xs font-medium text-text-secondary">
                    Sprint / placement
                    <select
                      value={draftSprintId ?? ""}
                      onChange={(e) =>
                        setDraftSprintId(
                          e.target.value === "" ? null : e.target.value
                        )
                      }
                      className="mt-1 w-full rounded-xl border border-border px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-800"
                    >
                      <option value="">Backlog (no sprint)</option>
                      {sprints.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} · {s.milestone}
                        </option>
                      ))}
                    </select>
                  </label>

                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-secondary">
                      Milestones
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {draftMilestoneTags.map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex items-center gap-1 rounded-full border border-border bg-surface px-2 py-0.5 text-xs dark:border-zinc-600"
                        >
                          {tag}
                          <button
                            type="button"
                            onClick={() => removeMilestoneTag(tag)}
                            className="text-text-secondary hover:text-text-primary"
                            aria-label={`Remove ${tag}`}
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      ))}
                      <button
                        type="button"
                        onClick={() => {
                          if (newMilestoneInput.trim())
                            addMilestoneTag(newMilestoneInput);
                        }}
                        className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-dashed border-border text-text-secondary hover:bg-surface dark:border-zinc-600"
                        aria-label="Add milestone from field"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <input
                        value={newMilestoneInput}
                        onChange={(e) => setNewMilestoneInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            addMilestoneTag(newMilestoneInput);
                          }
                        }}
                        placeholder="Add tag"
                        className="min-w-[120px] flex-1 rounded-xl border border-border px-3 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-800"
                      />
                      {milestoneSuggestions.map((ms) =>
                        draftMilestoneTags.includes(ms) ? null : (
                          <button
                            key={ms}
                            type="button"
                            onClick={() => addMilestoneTag(ms)}
                            className="rounded-full border border-border px-2 py-0.5 text-xs hover:bg-surface dark:border-zinc-600"
                          >
                            + {ms}
                          </button>
                        )
                      )}
                    </div>
                  </div>

                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-secondary">
                      Time tracking
                    </p>
                    <div className="flex gap-0.5">
                      {Array.from({ length: 10 }).map((_, i) => (
                        <div
                          key={i}
                          className={`h-8 flex-1 rounded-sm ${
                            i < barFilled
                              ? "bg-accent"
                              : "bg-surface dark:bg-zinc-800"
                          }`}
                        />
                      ))}
                    </div>
                    <div className="mt-2 flex justify-between text-xs text-text-secondary">
                      <span>{formatDurationLabel(loggedHours)} logged</span>
                      <span>{formatDurationLabel(remainingHours)} remaining</span>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <label className="text-xs text-text-secondary">
                        Progress %
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={draftProgress}
                          onChange={(e) =>
                            setDraftProgress(Number(e.target.value) || 0)
                          }
                          className="mt-1 w-full rounded-xl border border-border px-2 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-800"
                        />
                      </label>
                      <label className="text-xs text-text-secondary">
                        Estimate (h)
                        <input
                          type="number"
                          min={0.25}
                          step={0.25}
                          value={draftEstimate}
                          onChange={(e) =>
                            setDraftEstimate(Number(e.target.value) || 1)
                          }
                          className="mt-1 w-full rounded-xl border border-border px-2 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-800"
                        />
                      </label>
                    </div>
                  </div>
                </div>

                {/* Right column */}
                <div className="flex flex-col p-5">
                  <div className="flex gap-1 border-b border-border dark:border-zinc-800">
                    {(
                      [
                        ["description", "Description", FileText],
                        ["files", "Files", Paperclip],
                        ["comments", "Comments", MessageSquare],
                        ["subtasks", "Subtasks", ListChecks],
                      ] as const
                    ).map(([id, label, Icon]) => {
                      const active = innerTab === id;
                      return (
                        <button
                          key={id}
                          type="button"
                          onClick={() => setInnerTab(id)}
                          className={`relative flex items-center gap-1.5 px-3 pb-2 text-sm font-medium ${
                            active
                              ? "text-accent"
                              : "text-text-secondary hover:text-text-primary"
                          }`}
                        >
                          <Icon className="h-4 w-4 opacity-80" />
                          {label}
                          {active ? (
                            <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-accent" />
                          ) : null}
                        </button>
                      );
                    })}
                  </div>

                  <div className="mt-4 min-h-[200px] flex-1">
                    {innerTab === "description" ? (
                      <textarea
                        value={draftDescription}
                        onChange={(e) => setDraftDescription(e.target.value)}
                        rows={10}
                        placeholder="Describe the task, acceptance criteria, links…"
                        className="w-full resize-y rounded-xl border border-border px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-800"
                      />
                    ) : null}

                    {innerTab === "files" ? (
                      <div className="space-y-3">
                        <p className="text-xs text-text-secondary">
                          Add file name and optional URL (uploads can connect to
                          storage later).
                        </p>
                        <div className="flex flex-wrap gap-2">
                          <input
                            value={fileNameDraft}
                            onChange={(e) => setFileNameDraft(e.target.value)}
                            placeholder="File name"
                            className="min-w-[140px] flex-1 rounded-xl border border-border px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-800"
                          />
                          <input
                            value={fileUrlDraft}
                            onChange={(e) => setFileUrlDraft(e.target.value)}
                            placeholder="URL (optional)"
                            className="min-w-[160px] flex-1 rounded-xl border border-border px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-800"
                          />
                          <button
                            type="button"
                            disabled={isNew || !editingId}
                            onClick={() => {
                              if (!editingId) return;
                              onAddAttachment(editingId, {
                                name: fileNameDraft,
                                url: fileUrlDraft || undefined,
                              });
                              setFileNameDraft("");
                              setFileUrlDraft("");
                            }}
                            className="rounded-xl bg-accent px-3 py-2 text-sm font-medium text-white disabled:opacity-40"
                          >
                            Add
                          </button>
                        </div>
                        {!isNew && currentTask?.attachments?.length ? (
                          <ul className="space-y-2">
                            {currentTask.attachments.map((a) => (
                              <li
                                key={a.id}
                                className="flex items-center justify-between rounded-xl border border-border px-3 py-2 dark:border-zinc-700"
                              >
                                <span className="text-sm font-medium">
                                  {a.name}
                                </span>
                                <div className="flex items-center gap-2">
                                  {a.url ? (
                                    <a
                                      href={a.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-xs text-accent hover:underline"
                                    >
                                    Open
                                    </a>
                                  ) : null}
                                  <button
                                    type="button"
                                    onClick={() =>
                                      editingId &&
                                      onRemoveAttachment(editingId, a.id)
                                    }
                                    className="text-text-secondary hover:text-red-600"
                                    aria-label="Remove file"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </div>
                              </li>
                            ))}
                          </ul>
                        ) : null}
                        {isNew ? (
                          <p className="text-xs text-amber-800 dark:text-amber-200">
                            Save the task first, then attach files.
                          </p>
                        ) : null}
                      </div>
                    ) : null}

                    {innerTab === "comments" ? (
                      <div className="flex h-full flex-col">
                        <div className="min-h-[120px] flex-1 space-y-3 overflow-y-auto">
                          {!isNew &&
                          currentTask?.comments &&
                          currentTask.comments.length > 0 ? (
                            currentTask.comments.map((c) => (
                              <div
                                key={c.id}
                                className="flex gap-3 rounded-xl border border-border p-3 dark:border-zinc-700"
                              >
                                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent/15 text-xs font-bold text-accent">
                                  {c.authorName.slice(0, 2).toUpperCase()}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="text-sm font-semibold">
                                      {c.authorName}
                                    </span>
                                    <span className="text-xs text-text-secondary">
                                      {new Date(c.createdAt).toLocaleString()}
                                    </span>
                                  </div>
                                  <p className="mt-1 whitespace-pre-wrap text-sm text-text-secondary">
                                    {c.body}
                                  </p>
                                </div>
                                <button
                                  type="button"
                                  className="shrink-0 text-text-secondary"
                                  aria-label="Comment menu"
                                >
                                  <MoreVertical className="h-4 w-4" />
                                </button>
                              </div>
                            ))
                          ) : (
                            <p className="text-sm text-text-secondary">
                              {isNew
                                ? "Save the task before adding comments."
                                : "No comments yet."}
                            </p>
                          )}
                        </div>
                        <div className="mt-4 border-t border-border pt-4 dark:border-zinc-800">
                          <textarea
                            value={commentDraft}
                            onChange={(e) => setCommentDraft(e.target.value)}
                            rows={3}
                            placeholder="Add your comment…"
                            disabled={isNew}
                            className="w-full rounded-xl border border-border px-3 py-2 text-sm disabled:opacity-50 dark:border-zinc-600 dark:bg-zinc-800"
                          />
                          <div className="mt-2 flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => setCommentDraft("")}
                              className="rounded-lg border border-border px-3 py-1.5 text-sm dark:border-zinc-600"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              disabled={isNew || !editingId}
                              onClick={() => {
                                if (!editingId) return;
                                onAddTaskComment(
                                  editingId,
                                  "You",
                                  commentDraft
                                );
                                setCommentDraft("");
                              }}
                              className="rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-white disabled:opacity-40"
                            >
                              Add comment
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : null}

                    {innerTab === "subtasks" ? (
                      <div className="space-y-3">
                        {!isNew &&
                        currentTask?.subtasks &&
                        currentTask.subtasks.length > 0 ? (
                          <ul className="space-y-2">
                            {currentTask.subtasks.map((s) => (
                              <li
                                key={s.id}
                                className="flex items-center gap-2 rounded-xl border border-border px-3 py-2 dark:border-zinc-700"
                              >
                                <input
                                  type="checkbox"
                                  checked={s.done}
                                  onChange={() =>
                                    editingId &&
                                    onUpdateSubtask(editingId, s.id, {
                                      done: !s.done,
                                    })
                                  }
                                  className="rounded border-border"
                                />
                                <span
                                  className={`flex-1 text-sm ${
                                    s.done
                                      ? "text-text-secondary line-through"
                                      : ""
                                  }`}
                                >
                                  {s.title}
                                </span>
                                <button
                                  type="button"
                                  onClick={() =>
                                    editingId &&
                                    onRemoveSubtask(editingId, s.id)
                                  }
                                  className="text-text-secondary hover:text-red-600"
                                  aria-label="Remove subtask"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-sm text-text-secondary">
                            {isNew
                              ? "Save the task to add subtasks."
                              : "No subtasks yet."}
                          </p>
                        )}
                        <div className="flex gap-2">
                          <input
                            value={subtaskDraft}
                            onChange={(e) => setSubtaskDraft(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                if (editingId && subtaskDraft.trim()) {
                                  onAddSubtask(editingId, subtaskDraft);
                                  setSubtaskDraft("");
                                }
                              }
                            }}
                            placeholder="New subtask"
                            disabled={isNew}
                            className="min-w-0 flex-1 rounded-xl border border-border px-3 py-2 text-sm disabled:opacity-50 dark:border-zinc-600 dark:bg-zinc-800"
                          />
                          <button
                            type="button"
                            disabled={isNew || !editingId}
                            onClick={() => {
                              if (!editingId || !subtaskDraft.trim()) return;
                              onAddSubtask(editingId, subtaskDraft);
                              setSubtaskDraft("");
                            }}
                            className="rounded-xl bg-accent px-3 py-2 text-sm font-medium text-white disabled:opacity-40"
                          >
                            Add
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border px-5 py-4 dark:border-zinc-800">
              <button
                type="button"
                disabled={isNew || !editingId}
                onClick={() => {
                  if (
                    editingId &&
                    window.confirm("Delete this task? This cannot be undone.")
                  ) {
                    onDeleteTask(editingId);
                    setModalOpen(false);
                  }
                }}
                className="inline-flex items-center gap-1 text-sm font-medium text-red-600 hover:underline disabled:opacity-40"
              >
                <Trash2 className="h-4 w-4" />
                Delete task
              </button>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="rounded-xl border border-border px-4 py-2 text-sm dark:border-zinc-600"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={!draftTitle.trim()}
                  className="rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
                >
                  {isNew ? "Create task" : "Save changes"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
