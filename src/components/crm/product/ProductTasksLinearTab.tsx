"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  getMembersForTeam,
  TASK_STATUS_COLORS,
  TASK_STATUS_LABELS,
  teamMembers,
  type TaskStatus,
} from "@/lib/crm/mock-data";
import { readProjectWorkspace } from "@/lib/crm/project-workspace-storage";
import { formatISODate } from "@/lib/crm/project-date-utils";
import { useProjectWorkspace } from "@/lib/crm/use-project-workspace";
import type { WorkspaceTask } from "@/lib/crm/project-workspace-types";
import {
  DEFAULT_TASK_STATUS_CYCLE,
  type TaskCustomFieldType,
  type WorkspaceTaskCustomFieldDef,
} from "@/lib/crm/project-workspace-types";
import {
  CRM_LABEL_PRESETS,
  crmLabelDisplayChipClass,
  crmLabelPickerChipClass,
} from "@/lib/crm/crm-label-presets";
import type { ProductMilestoneMeta } from "@/lib/crm/product-project-metadata";
import {
  CHILD_PROJECT_PRIORITY_LABELS,
  type ChildProjectPriority,
} from "@/lib/crm/product-project-metadata";
import { PriorityFlagIcon } from "@/components/crm/product/PriorityFlagIcon";
import { ProductRowAssigneePicker } from "@/components/crm/product/ProductRowAssigneePicker";
import CrmPopoverDateField from "@/components/crm/CrmPopoverDateField";
import ProductTaskStatusModal from "@/components/crm/product/ProductTaskStatusModal";
import {
  AlignLeft,
  Ban,
  Box,
  Calendar,
  Check,
  CheckCircle2,
  ChevronDown,
  Circle,
  CircleDashed,
  Hash,
  Loader2,
  Plus,
  Tag,
  Trash2,
  Type,
  UserPlus,
  X,
} from "lucide-react";

type TaskPriorityValue = NonNullable<WorkspaceTask["priority"]> | "";

const TASK_PRIORITY_OPTIONS: { id: TaskPriorityValue; label: string }[] = [
  { id: "urgent", label: CHILD_PROJECT_PRIORITY_LABELS.urgent },
  { id: "high", label: CHILD_PROJECT_PRIORITY_LABELS.high },
  { id: "medium", label: CHILD_PROJECT_PRIORITY_LABELS.medium },
  { id: "low", label: CHILD_PROJECT_PRIORITY_LABELS.low },
  { id: "", label: "Clear" },
];

function TaskPriorityCell({
  priority,
  onChange,
}: {
  priority: WorkspaceTask["priority"];
  onChange: (v: TaskPriorityValue) => void;
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const current: TaskPriorityValue = priority ?? "";

  const chipLabel =
    current && CHILD_PROJECT_PRIORITY_LABELS[current as ChildProjectPriority]
      ? CHILD_PROJECT_PRIORITY_LABELS[current as ChildProjectPriority]
      : null;

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const label =
    TASK_PRIORITY_OPTIONS.find((p) => p.id === current)?.label ?? "Clear";

  return (
    <div className="relative min-w-0 px-0.5" ref={wrapRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`flex h-8 w-full min-w-0 items-center justify-center gap-1.5 overflow-hidden rounded-lg border px-2 text-xs font-medium transition-colors ${
          current
            ? "border-border bg-white text-text-primary shadow-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
            : "border-transparent text-text-secondary hover:border-border hover:bg-white hover:text-text-primary dark:text-zinc-500 dark:hover:border-zinc-700 dark:hover:bg-zinc-900 dark:hover:text-zinc-200"
        }`}
        aria-label={`Priority: ${label}`}
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <PriorityFlagIcon
          level={current}
          className="h-4 w-4 shrink-0 opacity-80"
        />
        <span className="min-w-0 truncate">{chipLabel ?? "Priority"}</span>
        <ChevronDown
          className="h-3.5 w-3.5 shrink-0 opacity-60 dark:text-zinc-400"
          aria-hidden
        />
      </button>
      {open ? (
        <div
          className="absolute right-0 top-full z-[70] mt-1 w-52 overflow-hidden rounded-xl border border-border bg-white py-1 shadow-lg dark:border-zinc-700 dark:bg-zinc-950"
          role="listbox"
        >
          <p className="px-3 py-1.5 text-[11px] font-medium uppercase tracking-wide text-text-secondary dark:text-zinc-500">
            Priority
          </p>
          {TASK_PRIORITY_OPTIONS.map((p) => (
            <button
              key={p.id || "clear"}
              type="button"
              role="option"
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-text-primary hover:bg-surface/80 dark:text-zinc-100 dark:hover:bg-zinc-800"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                onChange(p.id);
                setOpen(false);
              }}
            >
              {p.id === "" ? (
                <Ban className="h-4 w-4 shrink-0 text-zinc-500" aria-hidden />
              ) : (
                <PriorityFlagIcon level={p.id} className="h-4 w-4" />
              )}
              <span className="flex-1">{p.label}</span>
              {current === p.id ? (
                <Check className="h-4 w-4 shrink-0 text-accent" aria-hidden />
              ) : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function statusDisplay(
  s: TaskStatus,
  overrides?: Partial<Record<TaskStatus, string>>
) {
  const o = overrides?.[s]?.trim();
  return o || TASK_STATUS_LABELS[s];
}

function TaskStatusGlyph({ status }: { status: TaskStatus }) {
  const color = TASK_STATUS_COLORS[status];
  switch (status) {
    case "not_started":
      return (
        <CircleDashed className="h-4 w-4 shrink-0" style={{ color }} aria-hidden />
      );
    case "completed":
      return (
        <CheckCircle2
          className="h-4 w-4 shrink-0 text-emerald-500"
          aria-hidden
          fill="currentColor"
          fillOpacity={0.25}
        />
      );
    case "action_started":
      return (
        <span className="inline-flex h-4 w-4 shrink-0" aria-hidden>
          <svg viewBox="0 0 16 16" className="h-4 w-4" style={{ color }}>
            <circle
              cx="8"
              cy="8"
              r="6"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            />
            <path
              d="M 8 2 A 6 6 0 0 0 8 14"
              fill="currentColor"
              opacity={0.35}
            />
          </svg>
        </span>
      );
    case "in_progress":
      return (
        <span className="inline-flex h-4 w-4 shrink-0" aria-hidden>
          <svg viewBox="0 0 16 16" className="h-4 w-4" style={{ color }}>
            <circle
              cx="8"
              cy="8"
              r="6"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            />
            <path
              d="M 8 2 A 6 6 0 0 1 8 14"
              fill="currentColor"
              opacity={0.55}
            />
          </svg>
        </span>
      );
    case "test_qa":
      return (
        <Circle
          className="h-4 w-4 shrink-0"
          style={{ color, fill: "currentColor", fillOpacity: 0.35 }}
          aria-hidden
        />
      );
    default:
      return (
        <Circle className="h-4 w-4 shrink-0" style={{ color }} aria-hidden />
      );
  }
}

type NewTaskMenu =
  | null
  | "status"
  | "priority"
  | "assignee"
  | "project"
  | "labels"
  | "due"
  | "milestone";

type Props = {
  projectId: string;
  teamId: string;
  milestones: ProductMilestoneMeta[];
  childProjects: { id: string; title: string }[];
  onCreatedOnProject?: (projectId: string) => void;
  sprintParam: string | null;
  onSprintFilterChange: (value: string) => void;
};

const ADD_FIELD_TYPES: {
  type: TaskCustomFieldType;
  label: string;
  icon: ReactNode;
}[] = [
  { type: "dropdown", label: "Dropdown", icon: <ChevronDown className="h-4 w-4 text-teal-400" /> },
  { type: "text", label: "Text", icon: <Type className="h-4 w-4 text-blue-400" /> },
  { type: "number", label: "Number", icon: <Hash className="h-4 w-4 text-teal-400" /> },
  { type: "labels", label: "Labels", icon: <Tag className="h-4 w-4 text-emerald-400" /> },
];

function addDaysISO(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return formatISODate(d);
}

export default function ProductTasksLinearTab({
  projectId,
  teamId,
  milestones,
  childProjects,
  onCreatedOnProject,
  sprintParam,
  onSprintFilterChange,
}: Props) {
  const {
    workspace,
    hydrated,
    addTask,
    updateTask,
    deleteTask,
    addTaskCustomField,
    removeTaskCustomField,
    setTaskStatusConfiguration,
  } = useProjectWorkspace(projectId);

  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newTaskStatus, setNewTaskStatus] = useState<TaskStatus>("not_started");
  const [newTaskPriority, setNewTaskPriority] = useState<TaskPriorityValue>("");
  const [newAssigneeId, setNewAssigneeId] = useState("");
  const [newTargetProjectId, setNewTargetProjectId] = useState(projectId);
  const [newTags, setNewTags] = useState<string[]>([]);
  const [newTagDraft, setNewTagDraft] = useState("");
  const [newDueDate, setNewDueDate] = useState(() => formatISODate(new Date()));
  const [newMilestoneId, setNewMilestoneId] = useState("");
  const [newTaskMenu, setNewTaskMenu] = useState<NewTaskMenu>(null);
  const [newTaskModalOpen, setNewTaskModalOpen] = useState(false);
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [addFieldOpen, setAddFieldOpen] = useState(false);
  const addFieldRef = useRef<HTMLDivElement>(null);
  const newTaskComposerRef = useRef<HTMLDivElement>(null);

  const milestoneById = useMemo(() => {
    const m = new Map<string, string>();
    for (const x of milestones) m.set(x.id, x.title);
    return m;
  }, [milestones]);

  const assigneeOptions = useMemo(() => {
    const fromTeam = getMembersForTeam(teamId);
    return fromTeam.length > 0 ? fromTeam : teamMembers;
  }, [teamId]);

  const sprintIds = useMemo(
    () => new Set(workspace.sprints.map((s) => s.id)),
    [workspace.sprints]
  );

  const sprintById = useMemo(() => {
    const m = new Map<string, string>();
    for (const s of workspace.sprints) m.set(s.id, s.name);
    return m;
  }, [workspace.sprints]);

  const sprintFilterMode = useMemo(() => {
    if (!sprintParam || sprintParam === "all") return "all" as const;
    if (sprintParam === "backlog") return "backlog" as const;
    if (sprintIds.has(sprintParam)) return "sprint" as const;
    return "all" as const;
  }, [sprintParam, sprintIds]);

  const selectSprintValue =
    sprintFilterMode === "sprint" && sprintParam ? sprintParam : sprintFilterMode;

  const filteredTasks = useMemo(() => {
    if (sprintFilterMode === "all") return workspace.tasks;
    if (sprintFilterMode === "backlog")
      return workspace.tasks.filter((t) => t.sprintId == null);
    return workspace.tasks.filter((t) => t.sprintId === sprintParam);
  }, [workspace.tasks, sprintFilterMode, sprintParam]);

  const cycleOrder = useMemo((): TaskStatus[] => {
    const o = workspace.taskStatusCycleOrder;
    return o && o.length === DEFAULT_TASK_STATUS_CYCLE.length
      ? o
      : [...DEFAULT_TASK_STATUS_CYCLE];
  }, [workspace.taskStatusCycleOrder]);

  const sortedTasks = useMemo(() => {
    const idx = (s: TaskStatus) => cycleOrder.indexOf(s);
    return [...filteredTasks].sort((a, b) => {
      const d = idx(a.status) - idx(b.status);
      if (d !== 0) return d;
      return a.title.localeCompare(b.title);
    });
  }, [filteredTasks, cycleOrder]);

  const defaultSprintIdForNewTask = useMemo((): string | null => {
    if (sprintFilterMode === "backlog") return null;
    if (sprintFilterMode === "sprint" && sprintParam) return sprintParam;
    const cur = workspace.sprints.find((s) => s.isCurrent);
    return cur?.id ?? null;
  }, [sprintFilterMode, sprintParam, workspace.sprints]);

  const resetNewTaskForm = useCallback(() => {
    setNewTitle("");
    setNewDescription("");
    setNewTaskPriority("");
    setNewAssigneeId("");
    setNewTags([]);
    setNewTagDraft("");
    setNewDueDate(formatISODate(new Date()));
    setNewMilestoneId("");
    setNewTaskMenu(null);
    setNewTargetProjectId(projectId);
    setNewTaskStatus(cycleOrder[0] ?? "not_started");
  }, [projectId, cycleOrder]);

  const closeNewTaskModal = useCallback(() => {
    setNewTaskModalOpen(false);
    setNewTaskMenu(null);
    resetNewTaskForm();
  }, [resetNewTaskForm]);

  useEffect(() => {
    setNewTargetProjectId(projectId);
  }, [projectId]);

  useEffect(() => {
    setNewTaskStatus((prev) =>
      cycleOrder.includes(prev) ? prev : cycleOrder[0] ?? "not_started"
    );
  }, [cycleOrder]);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!addFieldRef.current?.contains(e.target as Node)) {
        setAddFieldOpen(false);
      }
    }
    if (addFieldOpen) {
      document.addEventListener("mousedown", onDocClick);
      return () => document.removeEventListener("mousedown", onDocClick);
    }
  }, [addFieldOpen]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!newTaskComposerRef.current?.contains(e.target as Node)) {
        setNewTaskMenu(null);
      }
    }
    if (newTaskMenu && newTaskModalOpen) {
      document.addEventListener("mousedown", onDoc);
      return () => document.removeEventListener("mousedown", onDoc);
    }
  }, [newTaskMenu, newTaskModalOpen]);

  useEffect(() => {
    if (!newTaskModalOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") closeNewTaskModal();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [newTaskModalOpen, closeNewTaskModal]);

  if (!hydrated) {
    return (
      <p className="flex items-center gap-2 text-sm text-text-secondary">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        Loading tasks…
      </p>
    );
  }

  function cycleTaskStatus(task: WorkspaceTask) {
    const i = cycleOrder.indexOf(task.status);
    const next = cycleOrder[(i + 1) % cycleOrder.length];
    updateTask(task.id, { status: next });
  }

  function patchCustomValue(
    task: WorkspaceTask,
    fieldId: string,
    value: string | number | string[] | undefined
  ) {
    const next = { ...(task.customFieldValues ?? {}) };
    if (value === undefined || value === "" || (Array.isArray(value) && !value.length)) {
      delete next[fieldId];
    } else {
      next[fieldId] = value as string | number | string[];
    }
    updateTask(task.id, {
      customFieldValues: Object.keys(next).length ? next : undefined,
    });
  }

  function submitNewTask() {
    const t = newTitle.trim();
    if (!t) return;
    const target = newTargetProjectId;
    const today = formatISODate(new Date());
    let sprintId: string | null;
    if (target === projectId) {
      sprintId = defaultSprintIdForNewTask;
    } else {
      const w = readProjectWorkspace(target);
      sprintId = w.sprints.find((s) => s.isCurrent)?.id ?? null;
    }
    addTask({
      title: t,
      description: newDescription.trim() || undefined,
      status: newTaskStatus,
      sprintId,
      targetProjectId: target !== projectId ? target : undefined,
      assigneeId: newAssigneeId || null,
      startDate: today,
      endDate: newDueDate.trim() || today,
      productMilestoneId: newMilestoneId || null,
      priority: newTaskPriority || undefined,
      milestoneTags: newTags.length ? newTags : undefined,
    });
    if (target !== projectId) onCreatedOnProject?.(target);
    resetNewTaskForm();
    setNewTaskModalOpen(false);
  }

  function toggleNewMenu(key: NewTaskMenu) {
    setNewTaskMenu((m) => (m === key ? null : key));
  }

  const pillClass =
    "inline-flex items-center gap-1.5 rounded-full border border-border bg-white px-2.5 py-1.5 text-xs font-medium text-text-primary shadow-sm transition-colors hover:bg-surface/80 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800";
  const menuClass =
    "absolute left-0 z-[100] mt-1 max-h-72 min-w-[240px] overflow-y-auto rounded-xl border border-border bg-white py-1 shadow-lg dark:border-zinc-700 dark:bg-zinc-950";

  const selectedProjectTitle =
    childProjects.find((c) => c.id === newTargetProjectId)?.title ?? "Project";
  const selectedAssigneeName = newAssigneeId
    ? assigneeOptions.find((m) => m.id === newAssigneeId)?.name ?? "Member"
    : "Assignee";
  const newTaskPriorityLabel =
    TASK_PRIORITY_OPTIONS.find((p) => p.id === newTaskPriority)?.label ??
    "Priority";
  const milestonePillLabel = newMilestoneId
    ? milestoneById.get(newMilestoneId) ?? "Milestone"
    : "Milestone";
  const labelsPillLabel =
    newTags.length === 0
      ? "Labels"
      : newTags.length === 1
        ? newTags[0]
        : `${newTags.length} labels`;
  const duePillLabel = newDueDate
    ? new Intl.DateTimeFormat(undefined, {
        month: "short",
        day: "numeric",
      }).format(parseISODateLocal(newDueDate))
    : "Due date";

  function parseISODateLocal(iso: string) {
    const [y, mo, d] = iso.split("-").map(Number);
    return new Date(y, mo - 1, d);
  }

  function renderCustomCell(task: WorkspaceTask, def: WorkspaceTaskCustomFieldDef) {
    const raw = task.customFieldValues?.[def.id];

    if (def.type === "text") {
      return (
        <input
          type="text"
          defaultValue={typeof raw === "string" ? raw : ""}
          key={`${task.id}-${def.id}-${String(raw)}`}
          onBlur={(e) => patchCustomValue(task, def.id, e.target.value)}
          className="w-full min-w-[100px] rounded border border-transparent bg-transparent px-2 py-1 text-sm hover:border-border focus:border-accent focus:outline-none dark:hover:border-zinc-600"
          placeholder="—"
        />
      );
    }

    if (def.type === "number") {
      const n = typeof raw === "number" ? raw : raw != null ? Number(raw) : "";
      return (
        <input
          type="number"
          defaultValue={n === "" || Number.isNaN(n) ? "" : n}
          key={`${task.id}-${def.id}-${String(raw)}`}
          onBlur={(e) => {
            const v = e.target.value.trim();
            patchCustomValue(task, def.id, v === "" ? undefined : Number(v));
          }}
          className="w-full min-w-[72px] rounded border border-transparent bg-transparent px-2 py-1 text-sm hover:border-border focus:border-accent focus:outline-none dark:hover:border-zinc-600"
          placeholder="—"
        />
      );
    }

    if (def.type === "dropdown") {
      const opts = def.options ?? [];
      const v = typeof raw === "string" ? raw : "";
      return (
        <select
          value={v}
          onChange={(e) =>
            patchCustomValue(task, def.id, e.target.value || undefined)
          }
          className="w-full min-w-[100px] rounded border border-border bg-white px-2 py-1 text-sm dark:border-zinc-600 dark:bg-zinc-800"
        >
          <option value="">—</option>
          {opts.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      );
    }

    const selected: string[] = Array.isArray(raw)
      ? raw.map(String)
      : typeof raw === "string" && raw
        ? raw.split(",").map((s) => s.trim()).filter(Boolean)
        : [];
    const opts = def.options ?? [];

    return (
      <div className="flex min-w-[140px] flex-wrap gap-1">
        {opts.map((tag) => {
          const on = selected.includes(tag);
          return (
            <button
              key={tag}
              type="button"
              onClick={() => {
                const next = on
                  ? selected.filter((x) => x !== tag)
                  : [...selected, tag];
                patchCustomValue(task, def.id, next);
              }}
              className={`rounded-full px-2 py-0.5 text-xs font-medium transition-colors ${
                on
                  ? "bg-accent/20 text-accent dark:bg-blue-500/25 dark:text-blue-300"
                  : "bg-surface/80 text-text-secondary hover:bg-border dark:bg-zinc-800 dark:text-zinc-400"
              }`}
            >
              {tag}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid w-full grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-[5.5rem_16rem_minmax(0,1fr)] sm:items-center">
        <span
          id="tasks-sprint-filter-label"
          className="text-sm font-medium text-text-secondary dark:text-zinc-400"
        >
          Sprint
        </span>
        <select
          id="tasks-sprint-filter"
          aria-labelledby="tasks-sprint-filter-label"
          value={selectSprintValue}
          onChange={(e) => onSprintFilterChange(e.target.value)}
          className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-text-primary dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
        >
          <option value="all">All tasks</option>
          <option value="backlog">Backlog (no sprint)</option>
          {workspace.sprints.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
              {s.isCurrent ? " (current)" : ""}
            </option>
          ))}
        </select>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setStatusModalOpen(true)}
            className="rounded-lg border border-border px-3 py-2 text-sm font-medium text-text-primary dark:border-zinc-600 dark:text-zinc-200"
          >
            Edit statuses
          </button>
          <button
            type="button"
            onClick={() => setNewTaskModalOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-white dark:bg-blue-600"
          >
            <Plus className="h-4 w-4" aria-hidden />
            New tasks
          </button>
        </div>
      </div>

      {newTaskModalOpen ? (
        <div
          className="fixed inset-0 z-[80] flex items-start justify-center overflow-y-auto bg-black/40 p-4 py-10"
          role="presentation"
          onMouseDown={(ev) => {
            if (ev.target === ev.currentTarget) closeNewTaskModal();
          }}
        >
          <div
            ref={newTaskComposerRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="new-task-dialog-title"
            className="w-full max-w-2xl rounded-2xl border border-border bg-white shadow-xl dark:border-zinc-700 dark:bg-zinc-900"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border px-5 py-4 dark:border-zinc-800">
              <h2
                id="new-task-dialog-title"
                className="text-base font-semibold text-text-primary dark:text-zinc-100"
              >
                New task
              </h2>
              <button
                type="button"
                onClick={closeNewTaskModal}
                className="rounded-lg p-2 text-text-secondary hover:bg-surface dark:hover:bg-zinc-800"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-5">
        <input
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submitNewTask();
            }
          }}
          className="mt-2 w-full border-0 bg-transparent text-lg font-semibold text-text-primary placeholder:text-text-secondary/70 focus:outline-none focus:ring-0 dark:text-zinc-100"
          placeholder="Task title"
        />
        <textarea
          value={newDescription}
          onChange={(e) => setNewDescription(e.target.value)}
          rows={2}
          className="mt-2 w-full resize-none border-0 bg-transparent text-sm text-text-primary placeholder:text-text-secondary/60 focus:outline-none focus:ring-0 dark:text-zinc-200"
          placeholder="Add description…"
        />
        <div className="relative mt-3 flex flex-wrap gap-2">
          <div className="relative">
            <button
              type="button"
              className={pillClass}
              onClick={() => toggleNewMenu("status")}
              aria-expanded={newTaskMenu === "status"}
            >
              <TaskStatusGlyph status={newTaskStatus} />
              {statusDisplay(newTaskStatus, workspace.taskStatusLabels)}
            </button>
            {newTaskMenu === "status" ? (
              <div className={menuClass} role="listbox">
                <p className="border-b border-border px-3 py-2 text-xs text-text-secondary dark:border-zinc-800">
                  Change status…
                </p>
                {cycleOrder.map((s) => (
                  <button
                    key={s}
                    type="button"
                    role="option"
                    aria-selected={newTaskStatus === s}
                    onClick={() => {
                      setNewTaskStatus(s);
                      setNewTaskMenu(null);
                    }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-surface/80 dark:hover:bg-zinc-800"
                  >
                    <TaskStatusGlyph status={s} />
                    <span className="flex-1">
                      {statusDisplay(s, workspace.taskStatusLabels)}
                    </span>
                    {newTaskStatus === s ? (
                      <Check className="h-4 w-4 text-accent" aria-hidden />
                    ) : null}
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <div className="relative">
            <button
              type="button"
              className={pillClass}
              onClick={() => toggleNewMenu("priority")}
              aria-expanded={newTaskMenu === "priority"}
              aria-label={`Priority: ${newTaskPriorityLabel}`}
            >
              <PriorityFlagIcon level={newTaskPriority} className="h-4 w-4" />
              <ChevronDown
                className="h-3.5 w-3.5 shrink-0 text-text-secondary"
                aria-hidden
              />
            </button>
            {newTaskMenu === "priority" ? (
              <div className={menuClass}>
                <p className="border-b border-border px-3 py-2 text-xs text-text-secondary dark:border-zinc-800">
                  Priority
                </p>
                {TASK_PRIORITY_OPTIONS.map((p) => (
                  <button
                    key={p.id || "none"}
                    type="button"
                    onClick={() => {
                      setNewTaskPriority(p.id);
                      setNewTaskMenu(null);
                    }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-surface/80 dark:hover:bg-zinc-800"
                  >
                    {p.id === "" ? (
                      <Ban className="h-4 w-4 shrink-0 text-zinc-500" aria-hidden />
                    ) : (
                      <PriorityFlagIcon level={p.id} className="h-4 w-4" />
                    )}
                    <span className="min-w-0 flex-1">{p.label}</span>
                    {newTaskPriority === p.id ? (
                      <Check className="h-4 w-4 shrink-0 text-accent" aria-hidden />
                    ) : null}
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <div className="relative">
            <button
              type="button"
              className={pillClass}
              onClick={() => toggleNewMenu("assignee")}
              aria-expanded={newTaskMenu === "assignee"}
            >
              <UserPlus className="h-3.5 w-3.5 text-text-secondary" aria-hidden />
              {selectedAssigneeName}
            </button>
            {newTaskMenu === "assignee" ? (
              <div className={menuClass}>
                <p className="border-b border-border px-3 py-2 text-xs text-text-secondary dark:border-zinc-800">
                  Assign to…
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setNewAssigneeId("");
                    setNewTaskMenu(null);
                  }}
                  className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-surface/80 dark:hover:bg-zinc-800"
                >
                  Unassigned
                  {!newAssigneeId ? (
                    <Check className="h-4 w-4 text-accent" />
                  ) : null}
                </button>
                {assigneeOptions.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => {
                      setNewAssigneeId(m.id);
                      setNewTaskMenu(null);
                    }}
                    className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-surface/80 dark:hover:bg-zinc-800"
                  >
                    {m.name}
                    {newAssigneeId === m.id ? (
                      <Check className="h-4 w-4 text-accent" />
                    ) : null}
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          {childProjects.length > 0 ? (
            <div className="relative">
              <button
                type="button"
                className={pillClass}
                onClick={() => toggleNewMenu("project")}
                aria-expanded={newTaskMenu === "project"}
              >
                <Box className="h-3.5 w-3.5 text-text-secondary" />
                <span className="max-w-[140px] truncate">{selectedProjectTitle}</span>
              </button>
              {newTaskMenu === "project" ? (
                <div className={menuClass}>
                  <p className="border-b border-border px-3 py-2 text-xs text-text-secondary dark:border-zinc-800">
                    Project
                  </p>
                  {childProjects.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        setNewTargetProjectId(c.id);
                        setNewTaskMenu(null);
                      }}
                      className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-surface/80 dark:hover:bg-zinc-800"
                    >
                      <span className="truncate">{c.title}</span>
                      {newTargetProjectId === c.id ? (
                        <Check className="h-4 w-4 shrink-0 text-accent" />
                      ) : null}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}

          {milestones.length > 0 ? (
            <div className="relative">
              <button
                type="button"
                className={pillClass}
                onClick={() => toggleNewMenu("milestone")}
                aria-expanded={newTaskMenu === "milestone"}
              >
                <AlignLeft className="h-3.5 w-3.5 text-text-secondary" />
                <span className="max-w-[120px] truncate">{milestonePillLabel}</span>
              </button>
              {newTaskMenu === "milestone" ? (
                <div className={menuClass}>
                  <p className="border-b border-border px-3 py-2 text-xs text-text-secondary dark:border-zinc-800">
                    Milestone
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setNewMilestoneId("");
                      setNewTaskMenu(null);
                    }}
                    className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-surface/80 dark:hover:bg-zinc-800"
                  >
                    None
                    {!newMilestoneId ? (
                      <Check className="h-4 w-4 text-accent" />
                    ) : null}
                  </button>
                  {milestones.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => {
                        setNewMilestoneId(m.id);
                        setNewTaskMenu(null);
                      }}
                      className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-surface/80 dark:hover:bg-zinc-800"
                    >
                      {m.title}
                      {newMilestoneId === m.id ? (
                        <Check className="h-4 w-4 text-accent" />
                      ) : null}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}

          <div className="relative">
            <button
              type="button"
              className={pillClass}
              onClick={() => toggleNewMenu("labels")}
              aria-expanded={newTaskMenu === "labels"}
            >
              <Tag className="h-3.5 w-3.5 text-text-secondary" />
              <span className="max-w-[120px] truncate">{labelsPillLabel}</span>
            </button>
            {newTaskMenu === "labels" ? (
              <div className={menuClass}>
                <p className="border-b border-border px-3 py-2 text-xs text-text-secondary dark:border-zinc-800">
                  Add labels…
                </p>
                <div className="flex flex-wrap gap-1 border-b border-border p-2 dark:border-zinc-800">
                  {CRM_LABEL_PRESETS.map((tag) => {
                    const on = newTags.includes(tag);
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() =>
                          setNewTags((prev) =>
                            on ? prev.filter((x) => x !== tag) : [...prev, tag]
                          )
                        }
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${crmLabelPickerChipClass(tag, on)}`}
                      >
                        {tag}
                      </button>
                    );
                  })}
                </div>
                <form
                  className="flex gap-1 p-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const s = newTagDraft.trim();
                    if (s && !newTags.includes(s)) {
                      setNewTags((prev) => [...prev, s]);
                      setNewTagDraft("");
                    }
                  }}
                >
                  <input
                    value={newTagDraft}
                    onChange={(e) => setNewTagDraft(e.target.value)}
                    placeholder="Custom tag"
                    className="min-w-0 flex-1 rounded-lg border border-border px-2 py-1 text-xs dark:border-zinc-600 dark:bg-zinc-800"
                  />
                  <button
                    type="submit"
                    className="rounded-lg bg-accent px-2 py-1 text-xs font-medium text-white dark:bg-blue-600"
                  >
                    Add
                  </button>
                </form>
              </div>
            ) : null}
          </div>

          <div className="relative">
            <button
              type="button"
              className={pillClass}
              onClick={() => toggleNewMenu("due")}
              aria-expanded={newTaskMenu === "due"}
            >
              <Calendar className="h-3.5 w-3.5 text-text-secondary" />
              {duePillLabel}
            </button>
            {newTaskMenu === "due" ? (
              <div className={menuClass}>
                <p className="border-b border-border px-3 py-2 text-xs text-text-secondary dark:border-zinc-800">
                  Due date
                </p>
                <div className="px-3 py-2">
                  <CrmPopoverDateField
                    id="linear-new-task-due"
                    value={newDueDate}
                    onChange={setNewDueDate}
                    displayFormat="numeric"
                    compact
                    showTriggerChevron
                    emptyLabel="Due"
                    triggerClassName="!max-w-none"
                  />
                </div>
                <div className="border-t border-border px-1 py-1 dark:border-zinc-800">
                  <button
                    type="button"
                    onClick={() => {
                      setNewDueDate(addDaysISO(1));
                      setNewTaskMenu(null);
                    }}
                    className="flex w-full items-center justify-between rounded-lg px-2 py-2 text-left text-sm hover:bg-surface/80 dark:hover:bg-zinc-800"
                  >
                    <span>Tomorrow</span>
                    <span className="text-xs text-text-secondary dark:text-zinc-500">
                      {addDaysISO(1)}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setNewDueDate(addDaysISO(7));
                      setNewTaskMenu(null);
                    }}
                    className="flex w-full items-center justify-between rounded-lg px-2 py-2 text-left text-sm hover:bg-surface/80 dark:hover:bg-zinc-800"
                  >
                    <span>In one week</span>
                    <span className="text-xs text-text-secondary dark:text-zinc-500">
                      {addDaysISO(7)}
                    </span>
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={closeNewTaskModal}
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-text-primary dark:border-zinc-600 dark:text-zinc-200"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={submitNewTask}
            disabled={!newTitle.trim()}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 dark:bg-blue-600"
          >
            Create task
          </button>
        </div>
            </div>
          </div>
        </div>
      ) : null}

      <div className="overflow-x-auto rounded-xl border border-border bg-white dark:border-zinc-800 dark:bg-zinc-950">
        <table className="w-full min-w-[820px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-border bg-surface/60 dark:border-zinc-800 dark:bg-zinc-900/80">
              <th className="w-10 px-2 py-3 text-xs font-medium uppercase tracking-wide text-text-secondary dark:text-zinc-500">
                <span className="sr-only">Status</span>
              </th>
              <th className="min-w-[200px] px-3 py-3 text-xs font-medium uppercase tracking-wide text-text-secondary dark:text-zinc-500">
                Title
              </th>
              <th className="min-w-[8rem] px-2 py-2 text-[10px] font-medium uppercase tracking-wide text-text-secondary dark:text-zinc-500">
                Assignee
              </th>
              <th className="min-w-[8rem] px-2 py-2 text-[10px] font-medium uppercase tracking-wide text-text-secondary dark:text-zinc-500">
                Due date
              </th>
              <th className="min-w-[7rem] px-2 py-2 text-[10px] font-medium uppercase tracking-wide text-text-secondary dark:text-zinc-500">
                Priority
              </th>
              {workspace.taskCustomFields.map((def) => (
                <th
                  key={def.id}
                  className="group min-w-[120px] px-2 py-3 text-xs font-medium uppercase tracking-wide text-text-secondary dark:text-zinc-500"
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="truncate">{def.label}</span>
                    <button
                      type="button"
                      onClick={() => {
                        if (
                          confirm(
                            `Remove column “${def.label}”? Values on tasks will be deleted.`
                          )
                        ) {
                          removeTaskCustomField(def.id);
                        }
                      }}
                      className="shrink-0 rounded p-0.5 opacity-0 hover:bg-red-500/15 hover:text-red-600 group-hover:opacity-100 dark:hover:text-red-400"
                      aria-label={`Remove ${def.label}`}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </th>
              ))}
              <th className="w-12 px-1 py-3 text-center text-xs font-medium uppercase tracking-wide text-text-secondary dark:text-zinc-500">
                <span className="sr-only">Row actions</span>
              </th>
              <th className="relative w-12 px-1 py-3">
                <div ref={addFieldRef} className="flex justify-center">
                  <button
                    type="button"
                    onClick={() => setAddFieldOpen((o) => !o)}
                    className="rounded-lg p-1.5 text-text-secondary hover:bg-border hover:text-text-primary dark:hover:bg-zinc-800"
                    aria-expanded={addFieldOpen}
                    aria-haspopup="menu"
                    title="Add field"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                  {addFieldOpen ? (
                    <div
                      className="absolute right-0 top-full z-50 mt-1 w-56 rounded-xl border border-border bg-zinc-950 py-2 shadow-xl dark:border-zinc-700"
                      role="menu"
                    >
                      <p className="px-3 pb-1 text-[10px] font-medium uppercase tracking-wider text-zinc-500">
                        All
                      </p>
                      {ADD_FIELD_TYPES.map((row) => (
                        <button
                          key={row.type}
                          type="button"
                          role="menuitem"
                          onClick={() => {
                            addTaskCustomField(row.type);
                            setAddFieldOpen(false);
                          }}
                          className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm text-zinc-200 hover:bg-zinc-800"
                        >
                          {row.icon}
                          <span>{row.label}</span>
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedTasks.map((task) => {
              const ms = task.productMilestoneId
                ? milestoneById.get(task.productMilestoneId)
                : null;
              const assigneeVal = task.assigneeId ?? "";
              return (
                <tr
                  key={task.id}
                  className="border-b border-border transition-colors hover:bg-surface/50 dark:border-zinc-800/80 dark:hover:bg-zinc-900/50"
                >
                  <td className="px-2 py-2 align-middle">
                    <div className="flex min-w-0 items-center gap-1">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          cycleTaskStatus(task);
                        }}
                        className="shrink-0 cursor-pointer rounded-lg p-1.5 hover:bg-border/60 dark:hover:bg-zinc-800"
                        title={`${statusDisplay(task.status, workspace.taskStatusLabels)} — click to advance`}
                        aria-label={`Status ${statusDisplay(task.status, workspace.taskStatusLabels)}. Click the circle to cycle.`}
                      >
                        <TaskStatusGlyph status={task.status} />
                      </button>
                      <select
                        value={task.status}
                        onChange={(e) =>
                          updateTask(task.id, {
                            status: e.target.value as TaskStatus,
                          })
                        }
                        className="min-w-0 max-w-[7.5rem] truncate rounded border border-transparent bg-transparent py-0.5 text-xs text-text-primary hover:border-border dark:text-zinc-200 dark:hover:border-zinc-600"
                        aria-label="Set status"
                      >
                        {[...new Set([...cycleOrder, ...DEFAULT_TASK_STATUS_CYCLE, task.status])].map((s) => (
                          <option key={s} value={s}>
                            {statusDisplay(s, workspace.taskStatusLabels)}
                          </option>
                        ))}
                      </select>
                    </div>
                  </td>
                  <td className="max-w-xs px-3 py-2 align-middle">
                    <p className="font-medium text-text-primary dark:text-zinc-100">
                      {task.title}
                    </p>
                    {(ms || task.sprintId) && (
                      <p className="truncate text-xs text-text-secondary dark:text-zinc-500">
                        {[ms, task.sprintId ? sprintById.get(task.sprintId) : null]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    )}
                    {task.milestoneTags && task.milestoneTags.length > 0 ? (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {task.milestoneTags.map((tag) => (
                          <span
                            key={tag}
                            className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${crmLabelDisplayChipClass(tag)}`}
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </td>
                  <td className="min-w-[8rem] px-2 py-2 align-middle">
                    <ProductRowAssigneePicker
                      memberId={assigneeVal || null}
                      members={assigneeOptions}
                      ariaSubject={task.title}
                      onAssign={(id) =>
                        updateTask(task.id, {
                          assigneeId: id,
                          assigneeIds: id ? [id] : undefined,
                        })
                      }
                    />
                  </td>
                  <td className="min-w-[8rem] px-2 py-2 align-middle">
                    <CrmPopoverDateField
                      id={`linear-task-due-${task.id}`}
                      value={task.endDate}
                      onChange={(v) => updateTask(task.id, { endDate: v })}
                      displayFormat="numeric"
                      compact
                      showFooter
                      showTriggerChevron
                      emptyLabel="Due"
                      triggerClassName="!max-w-none w-full min-h-8"
                      aria-label={`Due date for ${task.title}`}
                    />
                  </td>
                  <td className="min-w-[7rem] px-1 py-2 align-middle">
                    <TaskPriorityCell
                      priority={task.priority}
                      onChange={(v) =>
                        updateTask(task.id, {
                          priority:
                            v === ""
                              ? undefined
                              : v === "low" ||
                                  v === "medium" ||
                                  v === "high" ||
                                  v === "urgent"
                                ? v
                                : undefined,
                        })
                      }
                    />
                  </td>
                  {workspace.taskCustomFields.map((def) => (
                    <td key={def.id} className="px-2 py-2 align-middle">
                      {renderCustomCell(task, def)}
                    </td>
                  ))}
                  <td className="px-1 py-2 align-middle text-center">
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm(`Delete “${task.title}”?`)) deleteTask(task.id);
                      }}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-text-secondary/70 transition-colors hover:bg-red-50 hover:text-red-600 dark:text-zinc-500 dark:hover:bg-red-950/30 dark:hover:text-red-400"
                      aria-label="Delete task"
                    >
                      <Trash2 className="h-4 w-4" aria-hidden />
                    </button>
                  </td>
                  <td className="px-1 py-2 align-middle" aria-hidden />
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <ProductTaskStatusModal
        open={statusModalOpen}
        onClose={() => setStatusModalOpen(false)}
        workspace={workspace}
        onApply={(payload) => setTaskStatusConfiguration(payload)}
      />
    </div>
  );
}
