"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useProjectWorkspace } from "@/lib/crm/use-project-workspace";
import type {
  WorkspaceSprint,
  WorkspaceTask,
} from "@/lib/crm/project-workspace-types";
import type { ProductMilestoneMeta } from "@/lib/crm/product-project-metadata";
import { formatISODate } from "@/lib/crm/project-date-utils";
import CrmPopoverDateField from "@/components/crm/CrmPopoverDateField";
import { Loader2, Pencil, Star, Trash2, ListPlus } from "lucide-react";

type Props = {
  projectId: string;
  /** Product milestones for this delivery project (ids match task.productMilestoneId). */
  milestones: ProductMilestoneMeta[];
  onOpenTasksForSprint: (sprintId: string) => void;
  onOpenBacklogTasks: () => void;
};

function taskMatchesMilestoneSelection(
  t: WorkspaceTask,
  selectedMilestoneIds: Set<string>,
  includeNoMilestone: boolean
): boolean {
  const mid = t.productMilestoneId?.trim() || null;
  if (!mid) return includeNoMilestone;
  return selectedMilestoneIds.has(mid);
}

export default function ProductSprintsTab({
  projectId,
  milestones,
  onOpenTasksForSprint,
  onOpenBacklogTasks,
}: Props) {
  const {
    workspace,
    hydrated,
    addSprint,
    updateSprint,
    deleteSprint,
    setCurrentSprint,
    bulkAssignTasksToSprint,
  } = useProjectWorkspace(projectId);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [milestone, setMilestone] = useState("");
  const [startDate, setStartDate] = useState(() => formatISODate(new Date()));
  const [endDate, setEndDate] = useState(() => formatISODate(new Date()));

  const [addTasksSprintId, setAddTasksSprintId] = useState<string | null>(null);
  const [pickMilestoneIds, setPickMilestoneIds] = useState<Set<string>>(
    () => new Set()
  );
  const [pickNoMilestone, setPickNoMilestone] = useState(false);
  const [pickBacklogOnly, setPickBacklogOnly] = useState(true);

  const milestoneLabels = useMemo(
    () => milestones.map((m) => m.title),
    [milestones]
  );

  const backlogCount = useMemo(
    () => workspace.tasks.filter((t) => t.sprintId == null).length,
    [workspace.tasks]
  );

  const taskCountBySprint = useMemo(() => {
    const m = new Map<string, number>();
    for (const t of workspace.tasks) {
      if (t.sprintId) {
        m.set(t.sprintId, (m.get(t.sprintId) ?? 0) + 1);
      }
    }
    return m;
  }, [workspace.tasks]);

  const milestonePickStats = useMemo(() => {
    const stats = new Map<
      string,
      { backlog: number; total: number }
    >();
    for (const m of milestones) {
      let backlog = 0;
      let total = 0;
      for (const t of workspace.tasks) {
        if (t.productMilestoneId !== m.id) continue;
        total += 1;
        if (t.sprintId == null) backlog += 1;
      }
      stats.set(m.id, { backlog, total });
    }
    let noMsBacklog = 0;
    let noMsTotal = 0;
    for (const t of workspace.tasks) {
      if (t.productMilestoneId?.trim()) continue;
      noMsTotal += 1;
      if (t.sprintId == null) noMsBacklog += 1;
    }
    return { byId: stats, noMilestone: { backlog: noMsBacklog, total: noMsTotal } };
  }, [milestones, workspace.tasks]);

  function openCreate() {
    setEditingId(null);
    setName("");
    setMilestone(milestoneLabels[0] ?? "Sprint");
    const today = formatISODate(new Date());
    setStartDate(today);
    setEndDate(today);
    setModalOpen(true);
  }

  function openEdit(s: WorkspaceSprint) {
    setEditingId(s.id);
    setName(s.name);
    setMilestone(s.milestone);
    setStartDate(s.startDate);
    setEndDate(s.endDate);
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditingId(null);
  }

  function openAddTasksModal(sprintId: string) {
    setAddTasksSprintId(sprintId);
    setPickMilestoneIds(new Set());
    setPickNoMilestone(false);
    setPickBacklogOnly(true);
  }

  function closeAddTasksModal() {
    setAddTasksSprintId(null);
  }

  function togglePickMilestone(id: string) {
    setPickMilestoneIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function applyAddTasksToSprint() {
    if (!addTasksSprintId) return;
    if (pickMilestoneIds.size === 0 && !pickNoMilestone) {
      window.alert(
        "Select at least one milestone, or enable “Tasks without a milestone”."
      );
      return;
    }
    const ids: string[] = [];
    for (const t of workspace.tasks) {
      if (
        !taskMatchesMilestoneSelection(
          t,
          pickMilestoneIds,
          pickNoMilestone
        )
      ) {
        continue;
      }
      if (pickBacklogOnly && t.sprintId != null) continue;
      if (t.sprintId === addTasksSprintId) continue;
      ids.push(t.id);
    }
    if (ids.length === 0) {
      window.alert(
        "No matching tasks. Select at least one milestone (or “No milestone”), ensure tasks exist on the Tasks / Milestones tabs, and try “Include tasks already in a sprint” if they are not in the backlog."
      );
      return;
    }
    bulkAssignTasksToSprint(ids, addTasksSprintId);
    closeAddTasksModal();
  }

  function submitModal(e: FormEvent) {
    e.preventDefault();
    const n = name.trim();
    if (!n) return;
    const ms = milestone.trim() || "Sprint";
    if (editingId) {
      updateSprint(editingId, {
        name: n,
        milestone: ms,
        startDate,
        endDate,
      });
    } else {
      addSprint({
        name: n,
        milestone: ms,
        startDate,
        endDate,
        isCurrent: false,
      });
    }
    closeModal();
  }

  if (!hydrated) {
    return (
      <p className="flex items-center gap-2 text-sm text-text-secondary">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        Loading sprints…
      </p>
    );
  }

  const addTasksSprint = addTasksSprintId
    ? workspace.sprints.find((s) => s.id === addTasksSprintId)
    : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-3xl text-sm text-text-secondary dark:text-zinc-500">
          Plan iterations for the <strong>selected project</strong> above. Add
          tasks from your{" "}
          <strong>milestones</strong> (and backlog) into a sprint without
          leaving this tab. Sprints and tasks live in this project&apos;s
          workspace; switch the project dropdown to plan another phase.
        </p>
        <button
          type="button"
          onClick={openCreate}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white dark:bg-blue-600"
        >
          New sprint
        </button>
      </div>

      <div className="rounded-xl border border-dashed border-border bg-surface/30 p-4 dark:border-zinc-800 dark:bg-zinc-900/40">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-sm font-medium text-text-primary dark:text-zinc-100">
              Backlog
            </p>
            <p className="text-xs text-text-secondary dark:text-zinc-500">
              Tasks with no sprint · {backlogCount} task
              {backlogCount === 1 ? "" : "s"}
            </p>
          </div>
          <button
            type="button"
            onClick={onOpenBacklogTasks}
            className="text-sm font-medium text-accent hover:underline"
          >
            Open in Tasks
          </button>
        </div>
      </div>

      {workspace.sprints.length === 0 ? (
        <p className="text-sm text-text-secondary dark:text-zinc-500">
          No sprints yet. Create one, then use{" "}
          <strong>Add milestone tasks</strong> to pull backlog tasks (by
          product milestone) into that sprint.
        </p>
      ) : (
        <ul className="space-y-3">
          {workspace.sprints.map((s) => {
            const count = taskCountBySprint.get(s.id) ?? 0;
            return (
              <li
                key={s.id}
                className="rounded-xl border border-border bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900/60"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold text-text-primary dark:text-zinc-100">
                        {s.name}
                      </h3>
                      {s.isCurrent ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-accent/15 px-2 py-0.5 text-xs font-medium text-accent dark:bg-blue-500/20 dark:text-blue-400">
                          <Star className="h-3 w-3 fill-current" aria-hidden />
                          Current
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setCurrentSprint(s.id)}
                          className="text-xs font-medium text-text-secondary hover:text-accent dark:text-zinc-500"
                        >
                          Set as current
                        </button>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-text-secondary dark:text-zinc-500">
                      {s.milestone} · {s.startDate} → {s.endDate} · {count}{" "}
                      task{count === 1 ? "" : "s"}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => openAddTasksModal(s.id)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface/50 px-3 py-1.5 text-xs font-medium text-text-primary hover:bg-surface dark:border-zinc-600 dark:bg-zinc-800/50 dark:text-zinc-100"
                    >
                      <ListPlus className="h-3.5 w-3.5" aria-hidden />
                      Add milestone tasks
                    </button>
                    <button
                      type="button"
                      onClick={() => onOpenTasksForSprint(s.id)}
                      className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium dark:border-zinc-600"
                    >
                      Open in Tasks
                    </button>
                    <button
                      type="button"
                      onClick={() => openEdit(s)}
                      className="rounded-lg border border-border p-1.5 text-text-secondary dark:border-zinc-600"
                      aria-label="Edit sprint"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (
                          confirm(
                            `Delete sprint “${s.name}”? Tasks in this sprint move to backlog.`
                          )
                        ) {
                          deleteSprint(s.id);
                        }
                      }}
                      className="rounded-lg border border-border p-1.5 text-text-secondary hover:text-red-600 dark:border-zinc-600"
                      aria-label="Delete sprint"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {modalOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="presentation"
          onClick={closeModal}
        >
          <form
            className="w-full max-w-md rounded-2xl border border-border bg-white p-6 shadow-xl dark:border-zinc-700 dark:bg-zinc-900"
            onClick={(e) => e.stopPropagation()}
            onSubmit={submitModal}
          >
            <h3 className="text-lg font-semibold text-text-primary dark:text-zinc-100">
              {editingId ? "Edit sprint" : "New sprint"}
            </h3>
            <div className="mt-4 space-y-3">
              <label className="block text-sm text-text-secondary">
                Name
                <input
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-border px-3 py-2 dark:border-zinc-600 dark:bg-zinc-800"
                  placeholder="Sprint 1"
                />
              </label>
              <label className="block text-sm text-text-secondary">
                Milestone label
                <input
                  value={milestone}
                  onChange={(e) => setMilestone(e.target.value)}
                  list="sprint-milestone-suggestions"
                  className="mt-1 w-full rounded-lg border border-border px-3 py-2 dark:border-zinc-600 dark:bg-zinc-800"
                />
                <datalist id="sprint-milestone-suggestions">
                  {milestoneLabels.map((l) => (
                    <option key={l} value={l} />
                  ))}
                </datalist>
              </label>
              <div>
                <span className="block text-sm text-text-secondary">Start</span>
                <div className="mt-1">
                  <CrmPopoverDateField
                    id="product-sprint-start"
                    value={startDate}
                    onChange={setStartDate}
                    displayFormat="numeric"
                    triggerClassName="w-full"
                  />
                </div>
              </div>
              <div>
                <span className="block text-sm text-text-secondary">End</span>
                <div className="mt-1">
                  <CrmPopoverDateField
                    id="product-sprint-end"
                    value={endDate}
                    onChange={setEndDate}
                    displayFormat="numeric"
                    triggerClassName="w-full"
                  />
                </div>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={closeModal}
                className="rounded-lg border border-border px-4 py-2 text-sm dark:border-zinc-600"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white dark:bg-blue-600"
              >
                {editingId ? "Save" : "Create"}
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {addTasksSprintId && addTasksSprint ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="presentation"
          onClick={closeAddTasksModal}
        >
          <div
            className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-border bg-white p-6 shadow-xl dark:border-zinc-700 dark:bg-zinc-900"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-labelledby="add-milestone-tasks-title"
          >
            <h3
              id="add-milestone-tasks-title"
              className="text-lg font-semibold text-text-primary dark:text-zinc-100"
            >
              Add tasks to “{addTasksSprint.name}”
            </h3>
            <p className="mt-2 text-sm text-text-secondary dark:text-zinc-500">
              Select product milestones (from the Milestones tab). Matching
              tasks are assigned to this sprint. Task titles must already exist
              on the Tasks or Milestones tabs.
            </p>

            <div className="mt-4 space-y-3">
              {milestones.length === 0 ? (
                <p className="text-sm text-amber-800 dark:text-amber-200/90">
                  No milestones defined yet. Open the Milestones tab, save at
                  least one milestone, then add tasks linked to it.
                </p>
              ) : (
                milestones.map((m) => {
                  const st = milestonePickStats.byId.get(m.id) ?? {
                    backlog: 0,
                    total: 0,
                  };
                  const shown = pickBacklogOnly ? st.backlog : st.total;
                  return (
                    <label
                      key={m.id}
                      className="flex cursor-pointer items-start gap-3 rounded-lg border border-border p-3 dark:border-zinc-700"
                    >
                      <input
                        type="checkbox"
                        checked={pickMilestoneIds.has(m.id)}
                        onChange={() => togglePickMilestone(m.id)}
                        className="mt-1"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="font-medium text-text-primary dark:text-zinc-100">
                          {m.title}
                        </span>
                        <span className="mt-0.5 block text-xs text-text-secondary dark:text-zinc-500">
                          {pickBacklogOnly
                            ? `${st.backlog} in backlog`
                            : `${st.total} total`}{" "}
                          {shown === 0 ? "(none match filter)" : ""}
                        </span>
                      </span>
                    </label>
                  );
                })
              )}

              <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border p-3 dark:border-zinc-700">
                <input
                  type="checkbox"
                  checked={pickNoMilestone}
                  onChange={(e) => setPickNoMilestone(e.target.checked)}
                  className="mt-1"
                />
                <span className="min-w-0 flex-1">
                  <span className="font-medium text-text-primary dark:text-zinc-100">
                    Tasks without a milestone
                  </span>
                  <span className="mt-0.5 block text-xs text-text-secondary dark:text-zinc-500">
                    {pickBacklogOnly
                      ? `${milestonePickStats.noMilestone.backlog} in backlog`
                      : `${milestonePickStats.noMilestone.total} total`}
                  </span>
                </span>
              </label>

              <label className="flex cursor-pointer items-center gap-2 text-sm text-text-primary dark:text-zinc-200">
                <input
                  type="checkbox"
                  checked={pickBacklogOnly}
                  onChange={(e) => setPickBacklogOnly(e.target.checked)}
                />
                Only backlog tasks (skip tasks already in a sprint)
              </label>
            </div>

            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={closeAddTasksModal}
                className="rounded-lg border border-border px-4 py-2 text-sm dark:border-zinc-600"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={applyAddTasksToSprint}
                className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white dark:bg-blue-600"
              >
                Assign to sprint
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
