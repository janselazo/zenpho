"use client";

import { useMemo, useState } from "react";
import {
  getMemberById,
  TASK_STATUS_COLORS,
  TASK_STATUS_LABELS,
  type TaskStatus,
} from "@/lib/crm/mock-data";
import { useProjectWorkspace } from "@/lib/crm/use-project-workspace";
import type { WorkspaceTask } from "@/lib/crm/project-workspace-types";
import type { ProductMilestoneMeta } from "@/lib/crm/product-project-metadata";
import CrmGroupedList, { type CrmListGroup } from "@/components/crm/product/CrmGroupedList";
import { Circle, Loader2 } from "lucide-react";

const GROUP_ORDER: { id: string; label: string; statuses: TaskStatus[] }[] = [
  { id: "todo", label: "Todo", statuses: ["not_started"] },
  {
    id: "active",
    label: "In progress",
    statuses: ["action_started", "in_progress"],
  },
  { id: "qa", label: "Test / QA", statuses: ["test_qa"] },
  { id: "done", label: "Done", statuses: ["completed"] },
];

function shortRef(taskId: string) {
  const tail = taskId.replace(/^[^-]+-/, "").slice(0, 4) || taskId.slice(-4);
  return `TSK-${tail.toUpperCase()}`;
}

type Props = {
  projectId: string;
  milestones: ProductMilestoneMeta[];
  sprintParam: string | null;
  onSprintFilterChange: (value: string) => void;
};

export default function ProductTasksLinearTab({
  projectId,
  milestones,
  sprintParam,
  onSprintFilterChange,
}: Props) {
  const {
    workspace,
    hydrated,
    addTask,
    updateTask,
    deleteTask,
  } = useProjectWorkspace(projectId);

  const [newTitle, setNewTitle] = useState("");
  const [newMilestoneId, setNewMilestoneId] = useState("");
  const [targetGroup, setTargetGroup] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const milestoneById = useMemo(() => {
    const m = new Map<string, string>();
    for (const x of milestones) m.set(x.id, x.title);
    return m;
  }, [milestones]);

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

  const defaultSprintIdForNewTask = useMemo((): string | null => {
    if (sprintFilterMode === "backlog") return null;
    if (sprintFilterMode === "sprint" && sprintParam) return sprintParam;
    const cur = workspace.sprints.find((s) => s.isCurrent);
    return cur?.id ?? null;
  }, [sprintFilterMode, sprintParam, workspace.sprints]);

  const groups: CrmListGroup<WorkspaceTask>[] = useMemo(() => {
    return GROUP_ORDER.map((g) => ({
      id: g.id,
      label: g.label,
      items: filteredTasks.filter((t) => g.statuses.includes(t.status)),
    }));
  }, [filteredTasks]);

  if (!hydrated) {
    return (
      <p className="flex items-center gap-2 text-sm text-text-secondary">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        Loading tasks…
      </p>
    );
  }

  function openAdd(groupId: string) {
    setTargetGroup(groupId);
    setNewTitle("");
    setNewMilestoneId("");
  }

  function submitQuickAdd(e: React.FormEvent) {
    e.preventDefault();
    const t = newTitle.trim();
    if (!t || !targetGroup) return;
    const g = GROUP_ORDER.find((x) => x.id === targetGroup);
    const status = g?.statuses[0] ?? "not_started";
    addTask({
      title: t,
      status,
      sprintId: defaultSprintIdForNewTask,
      productMilestoneId: newMilestoneId || null,
    });
    setNewTitle("");
    setNewMilestoneId("");
    setTargetGroup(null);
  }

  async function cycleStatus(task: WorkspaceTask) {
    const order: TaskStatus[] = [
      "not_started",
      "action_started",
      "in_progress",
      "test_qa",
      "completed",
    ];
    const i = order.indexOf(task.status);
    const next = order[Math.min(i + 1, order.length - 1)];
    setBusyId(task.id);
    updateTask(task.id, { status: next });
    setBusyId(null);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex flex-wrap items-center gap-2 text-sm text-text-secondary dark:text-zinc-400">
          <span className="font-medium">Sprint</span>
          <select
            value={selectSprintValue}
            onChange={(e) => onSprintFilterChange(e.target.value)}
            className="min-w-[200px] rounded-lg border border-border bg-white px-3 py-2 text-sm text-text-primary dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
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
        </label>
      </div>

      {targetGroup ? (
        <form
          onSubmit={submitQuickAdd}
          className="flex flex-wrap items-end gap-2 rounded-xl border border-border bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900/60"
        >
          <div className="min-w-[200px] flex-1">
            <label className="mb-1 block text-xs font-medium text-text-secondary">
              New task in{" "}
              {GROUP_ORDER.find((g) => g.id === targetGroup)?.label ?? ""}
            </label>
            <input
              autoFocus
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className="w-full rounded-lg border border-border px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-800"
              placeholder="Task title"
            />
            {milestones.length > 0 ? (
              <select
                value={newMilestoneId}
                onChange={(e) => setNewMilestoneId(e.target.value)}
                className="mt-2 w-full rounded-lg border border-border px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-800"
              >
                <option value="">Milestone (optional)</option>
                {milestones.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.title}
                  </option>
                ))}
              </select>
            ) : null}
          </div>
          <button
            type="submit"
            disabled={!newTitle.trim()}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            Add
          </button>
          <button
            type="button"
            onClick={() => setTargetGroup(null)}
            className="rounded-lg border border-border px-4 py-2 text-sm dark:border-zinc-600"
          >
            Cancel
          </button>
        </form>
      ) : null}

      <CrmGroupedList
        groups={groups}
        getItemKey={(t) => t.id}
        onAddToGroup={openAdd}
        addLabel="Add"
        renderRow={(task) => {
          const assignee =
            task.assigneeId != null
              ? getMemberById(task.assigneeId)?.name ?? task.assigneeId
              : "—";
          const ms = task.productMilestoneId
            ? milestoneById.get(task.productMilestoneId)
            : null;
          return (
            <div className="flex items-center gap-3 px-3 py-2.5 text-sm transition-colors hover:bg-surface/80 dark:hover:bg-zinc-800/50">
              <button
                type="button"
                disabled={busyId === task.id}
                onClick={() => void cycleStatus(task)}
                className="shrink-0 rounded-full p-0.5 text-text-secondary hover:text-text-primary"
                title={TASK_STATUS_LABELS[task.status]}
                aria-label={`Status: ${TASK_STATUS_LABELS[task.status]}. Click to advance.`}
              >
                <Circle
                  className="h-4 w-4"
                  style={{ color: TASK_STATUS_COLORS[task.status] }}
                  fill="currentColor"
                  fillOpacity={task.status === "completed" ? 1 : 0.15}
                  aria-hidden
                />
              </button>
              <span className="w-14 shrink-0 font-mono text-xs text-text-secondary dark:text-zinc-500">
                {shortRef(task.id)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-text-primary dark:text-zinc-100">
                  {task.title}
                </p>
                {ms || task.sprintId ? (
                  <p className="truncate text-xs text-text-secondary dark:text-zinc-500">
                    {[ms, task.sprintId ? sprintById.get(task.sprintId) : null]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                ) : null}
              </div>
              <span className="hidden w-28 shrink-0 truncate text-xs text-text-secondary sm:block dark:text-zinc-500">
                {assignee}
              </span>
              <span className="w-24 shrink-0 text-right text-xs text-text-secondary dark:text-zinc-500">
                {task.endDate}
              </span>
              <button
                type="button"
                onClick={() => {
                  if (confirm(`Delete “${task.title}”?`)) deleteTask(task.id);
                }}
                className="shrink-0 text-xs text-red-600 hover:underline dark:text-red-400"
              >
                Delete
              </button>
            </div>
          );
        }}
      />
    </div>
  );
}
