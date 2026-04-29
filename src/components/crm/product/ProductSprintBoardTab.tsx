"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  createSprint,
  createWorkItem,
  listSprints,
  listWorkItems,
  updateWorkItem,
} from "@/app/(crm)/actions/product-manager";
import KanbanBoard, { type KanbanColumn } from "@/components/crm/KanbanBoard";
import ProductTabHeading from "@/components/crm/product/ProductTabHeading";
import { SPRINT_BOARD_COLUMNS } from "@/lib/crm/product-manager-types";
import { Loader2, Plus } from "lucide-react";

type WorkRow = {
  id: string;
  title: string;
  board_status: string;
  sprint_id: string | null;
};

export default function ProductSprintBoardTab({
  productId,
  childProjectId,
}: {
  productId: string;
  childProjectId: string;
}) {
  const [items, setItems] = useState<WorkRow[]>([]);
  const [sprints, setSprints] = useState<
    { id: string; name: string; is_current?: boolean }[]
  >([]);
  const [sprintId, setSprintId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [creating, setCreating] = useState(false);

  const [newSprintName, setNewSprintName] = useState("");
  const [sprintCreating, setSprintCreating] = useState(false);

  const loadSprints = useCallback(async () => {
    const sp = await listSprints(productId, childProjectId);
    if (sp.error) return { error: sp.error, rows: [] as typeof sprints };
    const rows = (sp.rows as Record<string, unknown>[]).map((r) => ({
      id: String(r.id),
      name: String(r.name ?? "Sprint"),
      is_current: Boolean(r.is_current),
    }));
    return { error: null as string | null, rows };
  }, [productId, childProjectId]);

  const loadItems = useCallback(async () => {
    if (!sprintId) return { error: null as string | null, rows: [] as WorkRow[] };
    const wi = await listWorkItems(productId, childProjectId, {
      sprintId,
    });
    if (wi.error) return { error: wi.error, rows: [] };
    const rows = (wi.rows as WorkRow[]).map((r) => ({
      id: r.id,
      title: String(r.title ?? ""),
      board_status: String(r.board_status ?? "ready"),
      sprint_id: (r.sprint_id as string | null) ?? null,
    }));
    return { error: null, rows };
  }, [productId, childProjectId, sprintId]);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    const sp = await loadSprints();
    if (sp.error) {
      setError(sp.error);
      setLoading(false);
      return;
    }
    setSprints(sp.rows);
    const preferred =
      sp.rows.find((s) => s.is_current)?.id ?? sp.rows[0]?.id ?? null;
    setSprintId((prev) => {
      if (prev && sp.rows.some((s) => s.id === prev)) return prev;
      return preferred;
    });
    setLoading(false);
  }, [loadSprints]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!sprintId) {
      setItems([]);
      return;
    }
    let cancelled = false;
    void (async () => {
      const wi = await loadItems();
      if (cancelled) return;
      if (wi.error) setError(wi.error);
      setItems(wi.rows);
    })();
    return () => {
      cancelled = true;
    };
  }, [sprintId, loadItems]);

  const columns: KanbanColumn<WorkRow>[] = useMemo(() => {
    return SPRINT_BOARD_COLUMNS.map((c) => ({
      id: c.slug,
      label: c.label,
      color: "#6366f1",
      items: items.filter((i) => i.board_status === c.slug),
    }));
  }, [items]);

  async function onCreateSprint(e: React.FormEvent) {
    e.preventDefault();
    const n = newSprintName.trim();
    if (!n) return;
    setSprintCreating(true);
    const res = await createSprint(productId, childProjectId, { name: n });
    setSprintCreating(false);
    if ("error" in res && res.error) setError(res.error);
    else {
      setNewSprintName("");
      await refresh();
    }
  }

  async function onMove(itemId: string, _from: string, toColumnId: string) {
    const res = await updateWorkItem(productId, itemId, {
      board_status: toColumnId,
    });
    if ("error" in res && res.error) {
      setError(res.error);
      return;
    }
    setItems((prev) =>
      prev.map((i) =>
        i.id === itemId ? { ...i, board_status: toColumnId } : i
      )
    );
  }

  async function addToColumn(columnId: string) {
    if (!sprintId) return;
    const t = newTitle.trim() || "New task";
    setCreating(true);
    const res = await createWorkItem(productId, childProjectId, {
      title: t,
      sprint_id: sprintId,
      board_status: columnId as (typeof SPRINT_BOARD_COLUMNS)[number]["slug"],
      item_type: "task",
    });
    setCreating(false);
    if ("error" in res && res.error) {
      setError(res.error);
      return;
    }
    setNewTitle("");
    const wi = await loadItems();
    if (!wi.error) setItems(wi.rows);
  }

  return (
    <div className="space-y-6">
      <ProductTabHeading
        title="Sprint board"
        description="Kanban for the selected sprint—columns match your delivery workflow (configure overrides in Settings)."
        primaryAction={
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={sprintId ?? ""}
              onChange={(e) => setSprintId(e.target.value || null)}
              className="rounded-lg border border-border px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-800"
              aria-label="Sprint"
            >
              <option value="">Select sprint…</option>
              {sprints.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                  {s.is_current ? " (current)" : ""}
                </option>
              ))}
            </select>
          </div>
        }
      />

      <form
        onSubmit={onCreateSprint}
        className="flex flex-wrap items-end gap-2 rounded-xl border border-border bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900/60"
      >
        <input
          value={newSprintName}
          onChange={(e) => setNewSprintName(e.target.value)}
          placeholder="New sprint name"
          className="min-w-[12rem] flex-1 rounded-lg border border-border px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-800"
        />
        <button
          type="submit"
          disabled={sprintCreating || !newSprintName.trim()}
          className="rounded-lg border border-border px-4 py-2 text-sm font-medium dark:border-zinc-600 disabled:opacity-50"
        >
          {sprintCreating ? "…" : "Create sprint"}
        </button>
      </form>

      <div className="flex flex-wrap items-end gap-2 rounded-xl border border-border bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900/60">
        <input
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          placeholder="Task title (optional)"
          className="min-w-[12rem] flex-1 rounded-lg border border-border px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-800"
        />
        <button
          type="button"
          disabled={creating || !sprintId}
          onClick={() => void addToColumn("ready")}
          className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          <Plus className="h-4 w-4" />
          New task
        </button>
      </div>

      {error ? (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      ) : null}

      {!sprintId ? (
        <p className="text-sm text-text-secondary dark:text-zinc-500">
          Create a sprint from the backlog or CRM tooling, then select it above.
        </p>
      ) : loading ? (
        <p className="flex items-center gap-2 text-sm text-text-secondary">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading board…
        </p>
      ) : (
        <KanbanBoard
          columns={columns}
          emptyColumnLabel="No tasks"
          onMove={(id, from, to) => void onMove(id, from, to)}
          onAddNew={(col) => void addToColumn(col)}
          renderCard={(it) => (
            <div className="rounded-lg border border-border bg-white p-3 text-sm shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
              <p className="font-medium text-text-primary dark:text-zinc-100">
                {it.title}
              </p>
            </div>
          )}
        />
      )}
    </div>
  );
}
