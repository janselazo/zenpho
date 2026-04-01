"use client";

import { useEffect, useState } from "react";
import { Loader2, Plus, Trash2, X } from "lucide-react";
import { createLeadTag, deleteLeadTag } from "@/app/(crm)/actions/crm";
import type { LeadTagCatalogRow } from "@/lib/crm/lead-tag-catalog";

/** Preset swatches aligned with the Manage Tags design (blue default selected). */
export const LEAD_TAG_COLOR_PRESETS = [
  "#2563eb",
  "#34d399",
  "#f87171",
  "#a78bfa",
  "#eab308",
  "#f472b6",
  "#22d3ee",
  "#fb923c",
  "#9ca3af",
] as const;

type Props = {
  open: boolean;
  onClose: () => void;
  initialTags: LeadTagCatalogRow[];
  onChanged: () => void;
};

export default function ManageLeadTagsModal({
  open,
  onClose,
  initialTags,
  onChanged,
}: Props) {
  const [tags, setTags] = useState<LeadTagCatalogRow[]>(initialTags);
  const [tagName, setTagName] = useState("");
  const [selectedColor, setSelectedColor] = useState<string>(
    LEAD_TAG_COLOR_PRESETS[0]
  );
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setTags(initialTags);
      setTagName("");
      setSelectedColor(LEAD_TAG_COLOR_PRESETS[0]);
      setError(null);
    }
  }, [open, initialTags]);

  if (!open) return null;

  async function handleAdd() {
    const name = tagName.trim();
    if (!name) {
      setError("Enter a tag name.");
      return;
    }
    setCreating(true);
    setError(null);
    const res = await createLeadTag(name, selectedColor);
    setCreating(false);
    if ("error" in res && res.error) {
      setError(res.error);
      return;
    }
    setTagName("");
    onChanged();
  }

  async function handleDelete(row: LeadTagCatalogRow) {
    const n = row.leadCount;
    const msg =
      n > 0
        ? `Remove “${row.name}”? It is on ${n} lead${n === 1 ? "" : "s"}; those links will be removed.`
        : `Delete tag “${row.name}”?`;
    if (!confirm(msg)) return;
    setDeletingId(row.id);
    setError(null);
    const res = await deleteLeadTag(row.id);
    setDeletingId(null);
    if ("error" in res && res.error) {
      setError(res.error);
      return;
    }
    setTags((prev) => prev.filter((t) => t.id !== row.id));
    onChanged();
  }

  const busy = creating || deletingId !== null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
        onClick={() => !busy && onClose()}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="manage-lead-tags-title"
        className="relative z-10 flex max-h-[min(90vh,720px)] w-full max-w-md flex-col rounded-2xl border border-zinc-200 bg-white shadow-xl dark:border-zinc-700 dark:bg-zinc-900"
      >
        <div className="flex items-start justify-between gap-3 border-b border-zinc-200 px-5 py-4 dark:border-zinc-700">
          <div>
            <h2
              id="manage-lead-tags-title"
              className="text-lg font-semibold text-zinc-900 dark:text-zinc-50"
            >
              Manage Tags
            </h2>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              Create and organize tags to categorize your leads
            </p>
          </div>
          <button
            type="button"
            onClick={() => !busy && onClose()}
            className="shrink-0 rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5">
          <div className="flex gap-2">
            <input
              type="text"
              value={tagName}
              onChange={(e) => setTagName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void handleAdd();
                }
              }}
              placeholder="Enter tag name…"
              disabled={busy}
              className="min-w-0 flex-1 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none placeholder:text-zinc-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 disabled:opacity-60 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100 dark:placeholder:text-zinc-500"
            />
            <button
              type="button"
              onClick={() => void handleAdd()}
              disabled={busy}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-500 text-white shadow-sm transition hover:bg-blue-600 disabled:opacity-50"
              aria-label="Add tag"
            >
              {creating ? (
                <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
              ) : (
                <Plus className="h-5 w-5" aria-hidden />
              )}
            </button>
          </div>

          <div className="mt-4 flex flex-wrap gap-2.5">
            {LEAD_TAG_COLOR_PRESETS.map((hex) => {
              const selected = selectedColor === hex;
              return (
                <button
                  key={hex}
                  type="button"
                  disabled={busy}
                  onClick={() => setSelectedColor(hex)}
                  title={hex}
                  className={`h-8 w-8 rounded-full border-2 transition ${
                    selected
                      ? "scale-110 border-zinc-900 ring-2 ring-zinc-900/20 dark:border-zinc-100 dark:ring-zinc-100/20"
                      : "border-transparent hover:scale-105"
                  }`}
                  style={{ backgroundColor: hex }}
                  aria-label={`Color ${hex}`}
                  aria-pressed={selected}
                />
              );
            })}
          </div>

          {error ? (
            <p className="mt-3 text-sm text-red-600 dark:text-red-400" role="alert">
              {error}
            </p>
          ) : null}

          <div className="my-6 border-t border-zinc-200 dark:border-zinc-700" />

          <div className="flex items-center justify-between gap-2">
            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Your tags
            </h3>
            <span className="flex h-6 min-w-[1.5rem] items-center justify-center rounded-full bg-zinc-100 px-2 text-xs font-semibold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
              {tags.length}
            </span>
          </div>

          <ul className="mt-3 space-y-0 divide-y divide-zinc-100 dark:divide-zinc-800">
            {tags.length === 0 ? (
              <li className="py-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
                No tags yet. Add one above.
              </li>
            ) : (
              tags.map((row) => (
                <li
                  key={row.id}
                  className="flex items-center gap-3 py-3 first:pt-0"
                >
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: row.color }}
                    aria-hidden
                  />
                  <span className="min-w-0 flex-1 font-semibold text-zinc-900 dark:text-zinc-100">
                    {row.name}
                  </span>
                  <span className="shrink-0 text-sm text-zinc-500 dark:text-zinc-400">
                    {row.leadCount} lead{row.leadCount === 1 ? "" : "s"}
                  </span>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void handleDelete(row)}
                    className="shrink-0 rounded-lg p-1.5 text-zinc-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40 dark:hover:text-red-400"
                    aria-label={`Delete tag ${row.name}`}
                  >
                    {deletingId === row.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                    ) : (
                      <Trash2 className="h-4 w-4" aria-hidden />
                    )}
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}
