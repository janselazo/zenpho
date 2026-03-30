"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { updateCrmChildProjectMilestones } from "@/app/(crm)/actions/projects";
import type { ProductMilestoneMeta } from "@/lib/crm/product-project-metadata";
import { Loader2, Plus, Trash2 } from "lucide-react";

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
  const [items, setItems] = useState<ProductMilestoneMeta[]>(initialMilestones);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState("");

  const initialKey = JSON.stringify(initialMilestones);
  useEffect(() => {
    setItems(initialMilestones);
  }, [childProjectId, initialKey, initialMilestones]);

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
        Milestones for this project. Click <strong>Save</strong> after edits.
      </p>

      {error ? (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      ) : null}

      <ul className="space-y-2 rounded-xl border border-border bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900/60">
        {items.length === 0 ? (
          <li className="text-sm text-text-secondary">No milestones yet.</li>
        ) : (
          items.map((m, idx) => (
            <li
              key={m.id}
              className="flex flex-wrap items-center gap-2 border-b border-border pb-3 last:border-b-0 last:pb-0 dark:border-zinc-800/80"
            >
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
            </li>
          ))
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
