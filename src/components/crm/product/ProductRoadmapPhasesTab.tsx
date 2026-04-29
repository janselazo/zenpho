"use client";

import { useCallback, useEffect, useState } from "react";
import {
  createRoadmapPhase,
  listRoadmapPhases,
  updateRoadmapPhase,
} from "@/app/(crm)/actions/product-manager";
import ProductRoadmapTab from "@/components/crm/product/ProductRoadmapTab";
import ProductTabHeading from "@/components/crm/product/ProductTabHeading";
import { PLAN_LABELS } from "@/lib/crm/mock-data";
import { Loader2, Plus } from "lucide-react";

type PhaseRow = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  target_date: string | null;
  phase_slug: string;
};

type ChildRow = {
  id: string;
  title: string;
  plan_stage: string | null;
  metadata: unknown;
  target_date?: string | null;
};

export default function ProductRoadmapPhasesTab({
  productId,
  projectId,
  childrenProjects,
}: {
  productId: string;
  projectId: string | null;
  childrenProjects: ChildRow[];
}) {
  const [rows, setRows] = useState<PhaseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await listRoadmapPhases(productId);
    setLoading(false);
    if (res.error) {
      setError(res.error);
      setRows([]);
      return;
    }
    setRows(
      (res.rows as PhaseRow[]).map((r) => ({
        id: r.id,
        title: String(r.title ?? ""),
        description: r.description != null ? String(r.description) : null,
        status: String(r.status ?? "planned"),
        target_date: r.target_date != null ? String(r.target_date).slice(0, 10) : null,
        phase_slug: String(r.phase_slug ?? ""),
      }))
    );
  }, [productId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function onAddPhase(e: React.FormEvent) {
    e.preventDefault();
    const t = newTitle.trim();
    if (!t) return;
    setCreating(true);
    setError(null);
    const res = await createRoadmapPhase(productId, { title: t });
    setCreating(false);
    if ("error" in res && res.error) {
      setError(res.error);
      return;
    }
    setNewTitle("");
    await load();
  }

  return (
    <div className="space-y-8">
      <ProductTabHeading
        title="Roadmap"
        description="High-level delivery phases your client can follow—from discovery through post-launch improvements."
        primaryAction={
          <form
            onSubmit={onAddPhase}
            className="flex flex-wrap items-center gap-2"
          >
            <input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Phase title"
              className="min-w-[10rem] rounded-lg border border-border px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-800"
            />
            <button
              type="submit"
              disabled={creating || !newTitle.trim()}
              className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
              Add phase
            </button>
          </form>
        }
      />
      {error ? (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      ) : null}
      {loading && rows.length === 0 ? (
        <p className="flex items-center gap-2 text-sm text-text-secondary">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading roadmap…
        </p>
      ) : (
        <ul className="space-y-2">
          {rows.map((r) => (
            <li
              key={r.id}
              className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-white px-4 py-3 text-sm dark:border-zinc-800 dark:bg-zinc-900/60"
            >
              <span className="font-medium text-text-primary dark:text-zinc-100">
                {r.title}
              </span>
              <select
                value={r.status}
                onChange={async (e) => {
                  const res = await updateRoadmapPhase(productId, r.id, {
                    status: e.target.value,
                  });
                  if ("error" in res && res.error) setError(res.error);
                  else await load();
                }}
                className="rounded-lg border border-border px-2 py-1 text-xs dark:border-zinc-600 dark:bg-zinc-800"
                aria-label={`Status for ${r.title}`}
              >
                {["planned", "active", "completed", "at_risk"].map((s) => (
                  <option key={s} value={s}>
                    {s.replace(/_/g, " ")}
                  </option>
                ))}
              </select>
              <input
                type="date"
                value={r.target_date ?? ""}
                onChange={async (e) => {
                  const v = e.target.value.trim();
                  const res = await updateRoadmapPhase(productId, r.id, {
                    target_date: v || null,
                  });
                  if ("error" in res && res.error) setError(res.error);
                  else await load();
                }}
                className="rounded-lg border border-border px-2 py-1 text-xs dark:border-zinc-600 dark:bg-zinc-800"
                aria-label={`Target date for ${r.title}`}
              />
            </li>
          ))}
        </ul>
      )}

      <div className="border-t border-border pt-8 dark:border-zinc-800">
        <h3 className="text-sm font-semibold text-text-primary dark:text-zinc-100">
          Timeline (workspace sprints)
        </h3>
        <p className="mt-1 text-xs text-text-secondary dark:text-zinc-500">
          Visual schedule still uses local sprint data until fully merged to Supabase.
        </p>
        {projectId ? (
          <div className="mt-4 overflow-x-auto">
            <ProductRoadmapTab
              productId={productId}
              projectId={projectId}
              childrenProjects={childrenProjects}
              planLabelMap={PLAN_LABELS}
            />
          </div>
        ) : (
          <p className="mt-4 text-sm text-text-secondary">
            Select a delivery project above to render the timeline.
          </p>
        )}
      </div>
    </div>
  );
}
