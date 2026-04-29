"use client";

import { useCallback, useEffect, useState } from "react";
import {
  createRelease,
  listReleases,
  updateRelease,
} from "@/app/(crm)/actions/product-manager";
import ProductTabHeading from "@/components/crm/product/ProductTabHeading";
import { Loader2, Plus } from "lucide-react";

type Rel = {
  id: string;
  title: string;
  target_date: string | null;
  approval_status: string;
  completion_pct: number;
};

export default function ProductReleasesTab({
  productId,
  childProjectId,
}: {
  productId: string;
  childProjectId: string;
}) {
  const [rows, setRows] = useState<Rel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [due, setDue] = useState("");
  const [pending, setPending] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await listReleases(productId, childProjectId);
    setLoading(false);
    if (res.error) {
      setError(res.error);
      setRows([]);
      return;
    }
    setRows(
      (res.rows as Record<string, unknown>[]).map((r) => ({
        id: String(r.id),
        title: String(r.title ?? ""),
        target_date:
          r.target_date != null ? String(r.target_date).slice(0, 10) : null,
        approval_status: String(r.approval_status ?? "pending"),
        completion_pct: Number(r.completion_pct ?? 0),
      }))
    );
  }, [productId, childProjectId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    const t = title.trim();
    if (!t) return;
    setPending(true);
    const res = await createRelease(productId, childProjectId, {
      title: t,
      target_date: due.trim() ? due.trim().slice(0, 10) : null,
    });
    setPending(false);
    if ("error" in res && res.error) {
      setError(res.error);
      return;
    }
    setTitle("");
    setDue("");
    await load();
  }

  return (
    <div className="space-y-6">
      <ProductTabHeading
        title="Releases"
        description="Delivery milestones with targets, completion progress, and approval status."
        primaryAction={null}
      />

      <form
        onSubmit={onCreate}
        className="flex flex-wrap items-end gap-2 rounded-xl border border-border bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900/60"
      >
        <div>
          <label className="text-xs text-text-secondary dark:text-zinc-500">
            Title
          </label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mt-1 block rounded-lg border border-border px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-800"
            placeholder="Release name"
          />
        </div>
        <div>
          <label className="text-xs text-text-secondary dark:text-zinc-500">
            Target date
          </label>
          <input
            type="date"
            value={due}
            onChange={(e) => setDue(e.target.value)}
            className="mt-1 block rounded-lg border border-border px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-800"
          />
        </div>
        <button
          type="submit"
          disabled={pending || !title.trim()}
          className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          <Plus className="h-4 w-4" />
          {pending ? "Saving…" : "New release"}
        </button>
      </form>

      {error ? (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      ) : null}

      {loading && rows.length === 0 ? (
        <p className="flex items-center gap-2 text-sm text-text-secondary">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading releases…
        </p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-text-secondary dark:text-zinc-500">
          No releases yet. Add one or migrate milestones from Settings.
        </p>
      ) : (
        <ul className="divide-y divide-border rounded-xl border border-border bg-white dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-900/60">
          {rows.map((r) => (
            <li
              key={r.id}
              className="flex flex-wrap items-center gap-3 px-4 py-3 text-sm"
            >
              <span className="min-w-0 flex-1 font-medium text-text-primary dark:text-zinc-100">
                {r.title}
              </span>
              <input
                type="date"
                value={r.target_date ?? ""}
                onChange={async (e) => {
                  const v = e.target.value.trim();
                  const res = await updateRelease(productId, r.id, {
                    target_date: v || null,
                  });
                  if ("error" in res && res.error) setError(res.error);
                  else await load();
                }}
                className="rounded-lg border border-border px-2 py-1 text-xs dark:border-zinc-600 dark:bg-zinc-800"
                aria-label={`Due ${r.title}`}
              />
              <select
                value={r.approval_status}
                onChange={async (e) => {
                  const res = await updateRelease(productId, r.id, {
                    approval_status: e.target.value,
                  });
                  if ("error" in res && res.error) setError(res.error);
                  else await load();
                }}
                className="rounded-lg border border-border px-2 py-1 text-xs dark:border-zinc-600 dark:bg-zinc-800"
              >
                {["pending", "approved", "rejected"].map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              <label className="flex items-center gap-1 text-xs text-text-secondary">
                %
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={r.completion_pct}
                  onChange={async (e) => {
                    const n = Math.min(
                      100,
                      Math.max(0, Number(e.target.value) || 0)
                    );
                    const res = await updateRelease(productId, r.id, {
                      completion_pct: n,
                    });
                    if ("error" in res && res.error) setError(res.error);
                    else await load();
                  }}
                  className="w-14 rounded border border-border px-1 py-0.5 dark:border-zinc-600 dark:bg-zinc-800"
                />
              </label>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
