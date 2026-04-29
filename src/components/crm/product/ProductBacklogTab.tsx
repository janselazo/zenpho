"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  createWorkItem,
  listSprints,
  listWorkItems,
  updateWorkItem,
} from "@/app/(crm)/actions/product-manager";
import ProductTabHeading from "@/components/crm/product/ProductTabHeading";
import { ProductRowAssigneePicker } from "@/components/crm/product/ProductRowAssigneePicker";
import { useCrmTeamMembers } from "@/lib/crm/use-crm-team-members";
import { Loader2, Plus } from "lucide-react";

type WorkRow = {
  id: string;
  title: string;
  description: string | null;
  board_status: string;
  sprint_id: string | null;
  priority: string | null;
  assignee_member_id: string | null;
};

export default function ProductBacklogTab({
  productId,
  childProjectId,
  teamId,
  sprintParam,
  onSprintFilterChange,
}: {
  productId: string;
  childProjectId: string;
  teamId: string;
  sprintParam: string | null;
  onSprintFilterChange: (v: string | "all") => void;
}) {
  const [items, setItems] = useState<WorkRow[]>([]);
  const [sprints, setSprints] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [pending, setPending] = useState(false);
  const roster = useCrmTeamMembers();
  const members = useMemo(() => {
    const label = (m: { id: string; name: string; email: string }) =>
      m.name.trim() || m.email.trim() || "Member";
    const tid = teamId?.trim();
    const list = tid && tid !== "team-general"
      ? roster.filter((m) => m.teamId === tid)
      : roster;
    return list.map((m) => ({ id: m.id, name: label(m) }));
  }, [roster, teamId]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const backlogOnly =
      !sprintParam ||
      sprintParam === "all" ||
      sprintParam === "backlog";
    const [wi, sp] = await Promise.all([
      backlogOnly
        ? listWorkItems(productId, childProjectId, { backlogOnly: true })
        : listWorkItems(productId, childProjectId, {
            sprintId: sprintParam,
          }),
      listSprints(productId, childProjectId),
    ]);
    if (wi.error) setError(wi.error);
    if (sp.error && !wi.error) setError(sp.error);
    setItems(
      (wi.rows as WorkRow[]).map((r) => ({
        id: r.id,
        title: String(r.title ?? ""),
        description: r.description != null ? String(r.description) : null,
        board_status: String(r.board_status ?? "ready"),
        sprint_id: (r.sprint_id as string | null) ?? null,
        priority: (r.priority as string | null) ?? null,
        assignee_member_id: (r.assignee_member_id as string | null) ?? null,
      }))
    );
    setSprints(
      (sp.rows as { id: string; name: string }[]).map((s) => ({
        id: s.id,
        name: String(s.name ?? "Sprint"),
      }))
    );
    setLoading(false);
  }, [productId, childProjectId, sprintParam]);

  useEffect(() => {
    void load();
  }, [load]);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    const t = title.trim();
    if (!t) return;
    setPending(true);
    const res = await createWorkItem(productId, childProjectId, {
      title: t,
      sprint_id: null,
      board_status: "ready",
      item_type: "task",
    });
    setPending(false);
    if ("error" in res && res.error) {
      setError(res.error);
      return;
    }
    setTitle("");
    await load();
  }

  const filterControl = (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs text-text-secondary dark:text-zinc-500">
        Scope
      </span>
      <select
        value={
          !sprintParam || sprintParam === "all"
            ? "backlog"
            : sprintParam === "backlog"
              ? "backlog"
              : sprintParam
        }
        onChange={(e) => {
          const v = e.target.value;
          if (v === "backlog") onSprintFilterChange("backlog");
          else onSprintFilterChange(v);
        }}
        className="rounded-lg border border-border px-2 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-800"
        aria-label="Backlog scope"
      >
        <option value="backlog">Unscheduled / backlog</option>
        {sprints.map((s) => (
          <option key={s.id} value={s.id}>
            Sprint: {s.name}
          </option>
        ))}
      </select>
    </div>
  );

  return (
    <div className="space-y-6">
      <ProductTabHeading
        title="Backlog"
        description="Prioritized work items stored in Supabase—ready to pull into a sprint."
        primaryAction={filterControl}
      />

      <form
        onSubmit={onCreate}
        className="flex flex-wrap items-end gap-2 rounded-xl border border-border bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900/60"
      >
        <div className="min-w-[12rem] flex-1">
          <label className="text-xs font-medium text-text-secondary dark:text-zinc-500">
            New backlog item
          </label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-800"
            placeholder="Title"
          />
        </div>
        <button
          type="submit"
          disabled={pending || !title.trim()}
          className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          <Plus className="h-4 w-4" />
          {pending ? "Saving…" : "New backlog item"}
        </button>
      </form>

      {error ? (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      ) : null}

      {loading && items.length === 0 ? (
        <p className="flex items-center gap-2 text-sm text-text-secondary">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading backlog…
        </p>
      ) : items.length === 0 ? (
        <p className="text-sm text-text-secondary dark:text-zinc-500">
          No items in this view yet.
        </p>
      ) : (
        <ul className="divide-y divide-border rounded-xl border border-border bg-white dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-900/60">
          {items.map((it) => (
            <li
              key={it.id}
              className="flex flex-wrap items-center gap-3 px-4 py-3 text-sm"
            >
              <div className="min-w-0 flex-1">
                <p className="font-medium text-text-primary dark:text-zinc-100">
                  {it.title}
                </p>
                <p className="text-xs text-text-secondary dark:text-zinc-500">
                  {it.board_status.replace(/_/g, " ")}
                  {it.priority ? ` · ${it.priority}` : ""}
                </p>
              </div>
              <select
                value={it.sprint_id ?? ""}
                onChange={async (e) => {
                  const v = e.target.value;
                  const res = await updateWorkItem(productId, it.id, {
                    sprint_id: v ? v : null,
                  });
                  if ("error" in res && res.error) setError(res.error);
                  else await load();
                }}
                className="rounded-lg border border-border px-2 py-1 text-xs dark:border-zinc-600 dark:bg-zinc-800"
                aria-label={`Sprint for ${it.title}`}
              >
                <option value="">No sprint</option>
                {sprints.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
              <ProductRowAssigneePicker
                memberId={it.assignee_member_id}
                members={members}
                ariaSubject={it.title}
                unassignedHint="Assign"
                onAssign={(id) =>
                  void (async () => {
                    const res = await updateWorkItem(productId, it.id, {
                      assignee_member_id: id,
                    });
                    if ("error" in res && res.error) setError(res.error);
                    else await load();
                  })()
                }
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
