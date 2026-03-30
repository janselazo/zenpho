"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { updateCrmChildProjectMilestones } from "@/app/(crm)/actions/projects";
import type { ProductMilestoneMeta } from "@/lib/crm/product-project-metadata";
import { formatISODate } from "@/lib/crm/project-date-utils";
import { useProjectWorkspace } from "@/lib/crm/use-project-workspace";
import { TASK_STATUS_LABELS } from "@/lib/crm/mock-data";
import { Loader2, ListTodo, Plus, Trash2, X } from "lucide-react";

type Props = {
  productId: string;
  childProjectId: string;
  initialMilestones: ProductMilestoneMeta[];
};

export default function ProductMilestonesTab({
  productId,
  childProjectId,
  initialMilestones,
}: Props) {
  const router = useRouter();
  const {
    workspace,
    hydrated: workspaceHydrated,
    addTask,
    deleteTask,
  } = useProjectWorkspace(childProjectId);
  const [items, setItems] = useState<ProductMilestoneMeta[]>(initialMilestones);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [taskDrafts, setTaskDrafts] = useState<Record<string, string>>({});

  const initialKey = JSON.stringify(initialMilestones);
  useEffect(() => {
    setItems(initialMilestones);
  }, [childProjectId, initialKey, initialMilestones]);

  const tasksByMilestoneId = useMemo(() => {
    const m = new Map<string, typeof workspace.tasks>();
    for (const t of workspace.tasks) {
      const mid = t.productMilestoneId?.trim();
      if (!mid) continue;
      const list = m.get(mid) ?? [];
      list.push(t);
      m.set(mid, list);
    }
    return m;
  }, [workspace.tasks]);

  function setDraft(milestoneId: string, value: string) {
    setTaskDrafts((prev) => ({ ...prev, [milestoneId]: value }));
  }

  function addTaskToMilestone(m: ProductMilestoneMeta) {
    const raw = taskDrafts[m.id]?.trim() ?? "";
    if (!raw) return;
    const today = formatISODate(new Date());
    const sprintId =
      workspace.sprints.find((s) => s.isCurrent)?.id ?? null;
    const end =
      m.targetDate?.trim() && /^\d{4}-\d{2}-\d{2}$/.test(m.targetDate.trim())
        ? m.targetDate.trim()
        : today;
    addTask({
      title: raw,
      status: "not_started",
      sprintId,
      productMilestoneId: m.id,
      startDate: today,
      endDate: end,
    });
    setTaskDrafts((prev) => {
      const next = { ...prev };
      delete next[m.id];
      return next;
    });
  }

  async function persist(next: ProductMilestoneMeta[]) {
    setSaving(true);
    setError(null);
    const res = await updateCrmChildProjectMilestones(
      productId,
      childProjectId,
      next
    );
    setSaving(false);
    if ("error" in res && res.error) {
      setError(res.error);
      return;
    }
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-text-secondary dark:text-zinc-500">
        Milestones for this project. Click <strong>Save milestones</strong> after
        editing names or dates. Tasks you add under a milestone use the same
        workspace as the <strong>Tasks</strong> tab (current sprint when one is
        selected).
      </p>

      {error ? (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      ) : null}

      <ul className="space-y-2 rounded-xl border border-border bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900/60">
        {items.length === 0 ? (
          <li className="text-sm text-text-secondary">No milestones yet.</li>
        ) : (
          items.map((m, idx) => {
            const linked =
              workspaceHydrated ? (tasksByMilestoneId.get(m.id) ?? []) : [];
            return (
              <li
                key={m.id}
                className="flex flex-col gap-3 border-b border-border pb-4 last:border-b-0 last:pb-0 dark:border-zinc-800/80"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className="flex h-8 w-8 shrink-0 items-center justify-center text-text-secondary"
                    aria-hidden
                  >
                    ◇
                  </span>
                  <input
                    value={m.title}
                    onChange={(e) =>
                      setItems((prev) =>
                        prev.map((x, i) =>
                          i === idx ? { ...x, title: e.target.value } : x
                        )
                      )
                    }
                    className="min-w-[160px] flex-1 rounded-lg border border-border px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-800"
                  />
                  <input
                    type="date"
                    value={m.targetDate ?? ""}
                    onChange={(e) =>
                      setItems((prev) =>
                        prev.map((x, i) =>
                          i === idx
                            ? { ...x, targetDate: e.target.value || null }
                            : x
                        )
                      )
                    }
                    className="rounded-lg border border-border px-2 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-800"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setItems((prev) => prev.filter((_, i) => i !== idx))
                    }
                    className="shrink-0 rounded-lg border border-border p-2 text-text-secondary hover:text-red-600 dark:border-zinc-600"
                    aria-label="Remove milestone"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                <div className="ml-0 border-l-2 border-border pl-4 dark:border-zinc-700 sm:ml-10">
                  <div className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-text-secondary dark:text-zinc-500">
                    <ListTodo className="h-3.5 w-3.5" aria-hidden />
                    Tasks for this milestone
                  </div>
                  {!workspaceHydrated ? (
                    <p className="text-xs text-text-secondary dark:text-zinc-500">
                      Loading tasks…
                    </p>
                  ) : linked.length === 0 ? (
                    <p className="text-xs text-text-secondary dark:text-zinc-500">
                      No tasks yet.
                    </p>
                  ) : (
                    <ul className="mb-2 space-y-1">
                      {linked.map((t) => (
                        <li
                          key={t.id}
                          className="flex items-center justify-between gap-2 rounded-lg bg-surface/50 px-2 py-1.5 text-sm dark:bg-zinc-800/40"
                        >
                          <span className="min-w-0 truncate text-text-primary dark:text-zinc-100">
                            {t.title}
                          </span>
                          <span className="flex shrink-0 items-center gap-1">
                            <span className="text-[10px] uppercase tracking-wide text-text-secondary dark:text-zinc-500">
                              {TASK_STATUS_LABELS[t.status]}
                            </span>
                            <button
                              type="button"
                              onClick={() => deleteTask(t.id)}
                              className="rounded p-1 text-text-secondary hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-400"
                              aria-label={`Remove task ${t.title}`}
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      value={taskDrafts[m.id] ?? ""}
                      onChange={(e) => setDraft(m.id, e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addTaskToMilestone(m);
                        }
                      }}
                      placeholder="New task title…"
                      disabled={!workspaceHydrated}
                      className="min-w-[12rem] flex-1 rounded-lg border border-border px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-800"
                    />
                    <button
                      type="button"
                      onClick={() => addTaskToMilestone(m)}
                      disabled={
                        !workspaceHydrated || !(taskDrafts[m.id]?.trim())
                      }
                      className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-medium disabled:opacity-50 dark:border-zinc-600"
                    >
                      <Plus className="h-3.5 w-3.5" aria-hidden />
                      Add task
                    </button>
                  </div>
                </div>
              </li>
            );
          })
        )}
      </ul>

      <div className="flex flex-wrap items-end gap-2">
        <div className="min-w-[200px] flex-1">
          <label className="mb-1 block text-xs font-medium text-text-secondary">
            New milestone
          </label>
          <input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            className="w-full rounded-lg border border-border px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-800"
            placeholder="e.g. Design"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                const t = newTitle.trim();
                if (!t) return;
                setItems((prev) => [
                  ...prev,
                  { id: crypto.randomUUID(), title: t, targetDate: null },
                ]);
                setNewTitle("");
              }
            }}
          />
        </div>
        <button
          type="button"
          onClick={() => {
            const t = newTitle.trim();
            if (!t) return;
            setItems((prev) => [
              ...prev,
              { id: crypto.randomUUID(), title: t, targetDate: null },
            ]);
            setNewTitle("");
          }}
          disabled={!newTitle.trim() || saving}
          className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium dark:border-zinc-600"
        >
          <Plus className="h-4 w-4" aria-hidden />
          Add
        </button>
        <button
          type="button"
          onClick={() => void persist(items)}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          ) : null}
          Save milestones
        </button>
      </div>
    </div>
  );
}
