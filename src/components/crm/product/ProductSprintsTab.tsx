"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useProjectWorkspace } from "@/lib/crm/use-project-workspace";
import type { WorkspaceSprint } from "@/lib/crm/project-workspace-types";
import type { ProductMilestoneMeta } from "@/lib/crm/product-project-metadata";
import { formatISODate } from "@/lib/crm/project-date-utils";
import { Loader2, Pencil, Star, Trash2 } from "lucide-react";

type Props = {
  projectId: string;
  milestoneLabels: string[];
  onOpenTasksForSprint: (sprintId: string) => void;
  onOpenBacklogTasks: () => void;
};

export default function ProductSprintsTab({
  projectId,
  milestoneLabels,
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
  } = useProjectWorkspace(projectId);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [milestone, setMilestone] = useState("");
  const [startDate, setStartDate] = useState(() => formatISODate(new Date()));
  const [endDate, setEndDate] = useState(() => formatISODate(new Date()));

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

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-text-secondary dark:text-zinc-500">
          Plan iterations for this project. Tasks can be assigned to a sprint
          from the Tasks tab (filter by sprint). Deleting a sprint moves its
          tasks to the backlog.
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
          No sprints yet. Create one to group tasks by iteration.
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
              <label className="block text-sm text-text-secondary">
                Start
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-border px-3 py-2 dark:border-zinc-600 dark:bg-zinc-800"
                />
              </label>
              <label className="block text-sm text-text-secondary">
                End
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-border px-3 py-2 dark:border-zinc-600 dark:bg-zinc-800"
                />
              </label>
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
    </div>
  );
}
