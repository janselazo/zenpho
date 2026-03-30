"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { updateCrmChildProjectMilestones } from "@/app/(crm)/actions/projects";
import type { ProductMilestoneMeta } from "@/lib/crm/product-project-metadata";
import { formatISODate, parseISODate } from "@/lib/crm/project-date-utils";
import { useProjectWorkspace } from "@/lib/crm/use-project-workspace";
import { TASK_STATUS_LABELS } from "@/lib/crm/mock-data";
import { MilestoneProgressRing } from "@/components/crm/product/MilestoneProgressRing";
import { Loader2, ListTodo, Plus, Trash2, X } from "lucide-react";

type Props = {
  productId: string;
  childProjectId: string;
  initialMilestones: ProductMilestoneMeta[];
};

function formatDueDisplay(iso: string | null | undefined): string {
  if (!iso?.trim()) return "—";
  const d = parseISODate(iso.slice(0, 10));
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function ProductMilestonesTab({
  productId,
  childProjectId,
  initialMilestones,
}: Props) {
  const router = useRouter();
  const newMilestoneRef = useRef<HTMLInputElement>(null);
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

  function scrollToNewMilestone() {
    newMilestoneRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
    requestAnimationFrame(() => newMilestoneRef.current?.focus());
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-text-secondary dark:text-zinc-500">
        Milestones group tasks for this delivery project. Completing tasks on
        the <strong>Tasks</strong> tab (or below) increases each milestone’s
        progress ring. Set a <strong>due date</strong> per milestone; save when
        you change names or dates.
      </p>

      {error ? (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      ) : null}

      <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-700/80 dark:bg-gradient-to-b dark:from-zinc-900 dark:to-zinc-950">
        <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3 dark:border-zinc-700/90">
          <h2 className="text-base font-semibold text-text-primary dark:text-zinc-100">
            Project Milestones
          </h2>
          <button
            type="button"
            onClick={scrollToNewMilestone}
            className="rounded-lg p-2 text-text-primary hover:bg-zinc-100 dark:text-zinc-100 dark:hover:bg-zinc-800"
            aria-label="Add milestone"
          >
            <Plus className="h-5 w-5" />
          </button>
        </div>

        <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
          {items.length === 0 ? (
            <li className="px-4 py-6 text-sm text-text-secondary dark:text-zinc-500">
              No milestones yet. Add one below.
            </li>
          ) : (
            items.map((m, idx) => {
              const linked =
                workspaceHydrated ? (tasksByMilestoneId.get(m.id) ?? []) : [];
              const done = linked.filter((t) => t.status === "completed")
                .length;
              const total = linked.length;
              const pct =
                total <= 0 ? 0 : Math.min(100, Math.round((done / total) * 100));

              return (
                <li key={m.id} className="px-4 py-4">
                  <div className="flex flex-wrap items-center gap-3 gap-y-2">
                    <MilestoneProgressRing
                      completed={done}
                      total={total}
                      size={40}
                      className="shrink-0"
                    />
                    <div className="min-w-0 flex flex-1 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
                      <input
                        value={m.title}
                        onChange={(e) =>
                          setItems((prev) =>
                            prev.map((x, i) =>
                              i === idx ? { ...x, title: e.target.value } : x
                            )
                          )
                        }
                        className="min-w-0 flex-1 rounded-lg border border-transparent bg-transparent px-1 py-0.5 text-sm font-semibold text-text-primary outline-none focus-visible:border-border focus-visible:ring-2 focus-visible:ring-accent/30 dark:text-zinc-50 dark:focus-visible:border-zinc-600 dark:focus-visible:ring-violet-500/30"
                        aria-label="Milestone name"
                      />
                      <span className="shrink-0 text-sm text-text-secondary dark:text-zinc-500">
                        {total <= 0
                          ? "0% of 0"
                          : `${pct}% of ${total}`}
                      </span>
                    </div>
                    <div className="ml-auto flex shrink-0 flex-col items-end gap-0.5 sm:ml-0">
                      <span className="text-[10px] font-medium uppercase tracking-wide text-text-secondary dark:text-zinc-500">
                        Due date
                      </span>
                      <div className="flex items-center gap-2">
                        <input
                          type="date"
                          value={m.targetDate ?? ""}
                          onChange={(e) =>
                            setItems((prev) =>
                              prev.map((x, i) =>
                                i === idx
                                  ? {
                                      ...x,
                                      targetDate: e.target.value || null,
                                    }
                                  : x
                              )
                            )
                          }
                          className="max-w-[9.5rem] rounded-md border border-border px-2 py-1 text-xs dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
                          aria-label={`Due date for ${m.title}`}
                        />
                        <span
                          className="hidden w-14 text-right text-sm tabular-nums text-text-secondary dark:text-zinc-400 sm:inline"
                          aria-hidden
                        >
                          {formatDueDisplay(m.targetDate)}
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setItems((prev) => prev.filter((_, i) => i !== idx))
                      }
                      className="shrink-0 rounded-lg border border-border p-2 text-text-secondary hover:text-red-600 dark:border-zinc-600 dark:hover:text-red-400"
                      aria-label={`Remove milestone ${m.title}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="mt-3 border-l-2 border-zinc-200 pl-4 dark:border-zinc-700 sm:ml-[52px]">
                    <div className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-text-secondary dark:text-zinc-500">
                      <ListTodo className="h-3.5 w-3.5" aria-hidden />
                      Tasks grouped under this milestone
                    </div>
                    {!workspaceHydrated ? (
                      <p className="text-xs text-text-secondary dark:text-zinc-500">
                        Loading tasks…
                      </p>
                    ) : linked.length === 0 ? (
                      <p className="text-xs text-text-secondary dark:text-zinc-500">
                        No tasks yet. Add one below — mark them completed on the
                        Tasks tab to raise this milestone’s percentage.
                      </p>
                    ) : (
                      <ul className="mb-2 space-y-1">
                        {linked.map((t) => (
                          <li
                            key={t.id}
                            className="flex items-center justify-between gap-2 rounded-lg bg-zinc-50 px-2 py-1.5 text-sm dark:bg-zinc-800/50"
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
      </div>

      <div className="flex flex-wrap items-end gap-2">
        <div className="min-w-[200px] flex-1">
          <label
            htmlFor="product-new-milestone-title"
            className="mb-1 block text-xs font-medium text-text-secondary dark:text-zinc-500"
          >
            New milestone
          </label>
          <input
            id="product-new-milestone-title"
            ref={newMilestoneRef}
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            className="w-full rounded-lg border border-border px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-800"
            placeholder="e.g. Security review"
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
