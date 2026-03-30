"use client";

import { useEffect, useState } from "react";
import {
  TASK_STATUS_LABELS,
  type TaskStatus,
} from "@/lib/crm/mock-data";
import {
  DEFAULT_TASK_STATUS_CYCLE,
  type ProjectWorkspace,
} from "@/lib/crm/project-workspace-types";
import { ChevronDown, ChevronUp, Info } from "lucide-react";

const STATUS_GROUPS: { title: string; statuses: TaskStatus[] }[] = [
  { title: "Not started", statuses: ["not_started"] },
  { title: "Active", statuses: ["action_started", "in_progress"] },
  { title: "Done", statuses: ["test_qa"] },
  { title: "Closed", statuses: ["completed"] },
];

type Props = {
  open: boolean;
  onClose: () => void;
  workspace: ProjectWorkspace;
  onApply: (payload: {
    labels: Partial<Record<TaskStatus, string>>;
    cycleOrder: TaskStatus[];
  }) => void;
};

function labelFor(
  s: TaskStatus,
  overrides: Partial<Record<TaskStatus, string>> | undefined
) {
  const o = overrides?.[s]?.trim();
  return o || TASK_STATUS_LABELS[s];
}

export default function ProductTaskStatusModal({
  open,
  onClose,
  workspace,
  onApply,
}: Props) {
  const [draftLabels, setDraftLabels] = useState<
    Partial<Record<TaskStatus, string>>
  >({});
  const [cycleOrder, setCycleOrder] = useState<TaskStatus[]>(
    DEFAULT_TASK_STATUS_CYCLE
  );

  useEffect(() => {
    if (!open) return;
    setDraftLabels({ ...(workspace.taskStatusLabels ?? {}) });
    const o = workspace.taskStatusCycleOrder;
    setCycleOrder(
      o && o.length === DEFAULT_TASK_STATUS_CYCLE.length
        ? [...o]
        : [...DEFAULT_TASK_STATUS_CYCLE]
    );
  }, [open, workspace.taskStatusLabels, workspace.taskStatusCycleOrder]);

  if (!open) return null;

  function moveCycle(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= cycleOrder.length) return;
    const next = [...cycleOrder];
    [next[i], next[j]] = [next[j], next[i]];
    setCycleOrder(next);
  }

  function apply() {
    const labels = Object.fromEntries(
      DEFAULT_TASK_STATUS_CYCLE.map((s) => [s, draftLabels[s] ?? ""])
    ) as Partial<Record<TaskStatus, string>>;
    onApply({ labels, cycleOrder });
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4"
      role="presentation"
      onClick={onClose}
    >
      <div
        className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-border bg-white shadow-2xl dark:border-zinc-700 dark:bg-zinc-950"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="task-status-modal-title"
      >
        <div className="border-b border-border px-6 py-4 dark:border-zinc-800">
          <h2
            id="task-status-modal-title"
            className="text-lg font-semibold text-text-primary dark:text-zinc-100"
          >
            Edit task statuses
          </h2>
          <p className="mt-1 text-sm text-text-secondary dark:text-zinc-500">
            Rename how each status appears in the task list. Cycle order controls
            what happens when you click the status icon on a row.
          </p>
        </div>

        <div className="flex min-h-0 flex-1 overflow-y-auto">
          <aside className="hidden w-52 shrink-0 border-r border-border bg-surface/40 p-4 dark:border-zinc-800 dark:bg-zinc-900/50 sm:block">
            <p className="text-xs font-medium uppercase tracking-wide text-text-secondary dark:text-zinc-500">
              Status type
            </p>
            <p className="mt-2 text-sm text-text-primary dark:text-zinc-200">
              Custom labels
            </p>
            <p className="mt-1 text-xs text-text-secondary dark:text-zinc-500">
              Names below map to your workflow; underlying keys stay the same for
              data compatibility.
            </p>
          </aside>

          <div className="min-w-0 flex-1 space-y-6 p-6">
            {STATUS_GROUPS.map((g) => (
              <section key={g.title}>
                <div className="mb-2 flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-text-primary dark:text-zinc-100">
                    {g.title}
                  </h3>
                  <Info
                    className="h-3.5 w-3.5 text-text-secondary dark:text-zinc-500"
                    aria-hidden
                  />
                </div>
                <ul className="space-y-2 rounded-xl border border-border bg-surface/30 p-3 dark:border-zinc-800 dark:bg-zinc-900/40">
                  {g.statuses.map((s) => (
                    <li key={s}>
                      <label className="block text-xs text-text-secondary dark:text-zinc-500">
                        {TASK_STATUS_LABELS[s]}
                        <input
                          type="text"
                          value={draftLabels[s] ?? ""}
                          placeholder={TASK_STATUS_LABELS[s]}
                          onChange={(e) =>
                            setDraftLabels((prev) => ({
                              ...prev,
                              [s]: e.target.value,
                            }))
                          }
                          className="mt-1 w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-text-primary dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
                        />
                      </label>
                    </li>
                  ))}
                </ul>
              </section>
            ))}

            <section>
              <h3 className="mb-2 text-sm font-semibold text-text-primary dark:text-zinc-100">
                Click-to-cycle order
              </h3>
              <p className="mb-2 text-xs text-text-secondary dark:text-zinc-500">
                Reorder with arrows. Clicking a task&apos;s status icon advances
                along this list, then wraps to the start.
              </p>
              <ul className="space-y-1 rounded-xl border border-border p-3 dark:border-zinc-800">
                {cycleOrder.map((s, i) => (
                  <li
                    key={`${s}-${i}`}
                    className="flex items-center gap-2 rounded-lg bg-surface/50 px-2 py-1.5 dark:bg-zinc-900/60"
                  >
                    <span className="min-w-0 flex-1 text-sm text-text-primary dark:text-zinc-200">
                      {labelFor(s, draftLabels)}
                    </span>
                    <span className="font-mono text-[10px] text-text-secondary dark:text-zinc-600">
                      {s}
                    </span>
                    <button
                      type="button"
                      disabled={i === 0}
                      onClick={() => moveCycle(i, -1)}
                      className="rounded p-1 hover:bg-border disabled:opacity-30 dark:hover:bg-zinc-700"
                      aria-label="Move up"
                    >
                      <ChevronUp className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      disabled={i === cycleOrder.length - 1}
                      onClick={() => moveCycle(i, 1)}
                      className="rounded p-1 hover:bg-border disabled:opacity-30 dark:hover:bg-zinc-700"
                      aria-label="Move down"
                    >
                      <ChevronDown className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-border px-6 py-4 dark:border-zinc-800">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-border px-4 py-2 text-sm dark:border-zinc-600"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={apply}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white dark:bg-blue-600"
          >
            Apply changes
          </button>
        </div>
      </div>
    </div>
  );
}
