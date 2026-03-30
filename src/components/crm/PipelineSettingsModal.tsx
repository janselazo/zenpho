"use client";

import { useEffect, useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  GripVertical,
  Loader2,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import {
  reassignDealsFromStage,
  reassignLeadsFromStage,
  saveCrmPipelineSettings,
} from "@/app/(crm)/actions/crm";
import {
  newPipelineColumnSlug,
  type PipelineColumnDef,
} from "@/lib/crm/pipeline-columns";

const COLOR_PRESETS = [
  "#64748b",
  "#ea580c",
  "#3b82f6",
  "#8b5cf6",
  "#f59e0b",
  "#10b981",
  "#ef4444",
  "#06b6d4",
  "#db2777",
  "#6b7280",
];

type Props = {
  open: boolean;
  onClose: () => void;
  kind: "lead" | "deal";
  columns: PipelineColumnDef[];
  /** Items currently in each stage slug (for delete warnings / reassignment). */
  stageCounts: Record<string, number>;
  onSaved: () => void;
};

export default function PipelineSettingsModal({
  open,
  onClose,
  kind,
  columns,
  stageCounts,
  onSaved,
}: Props) {
  const [draft, setDraft] = useState<PipelineColumnDef[]>(columns);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reassign, setReassign] = useState<{
    slug: string;
    count: number;
  } | null>(null);
  const [reassignTarget, setReassignTarget] = useState("");

  useEffect(() => {
    if (open) {
      setDraft(columns.map((c) => ({ ...c })));
      setError(null);
      setReassign(null);
      setReassignTarget("");
    }
  }, [open, columns]);

  if (!open) return null;

  const title = kind === "deal" ? "Deal pipeline" : "Lead pipeline";

  function move(index: number, dir: -1 | 1) {
    const j = index + dir;
    if (j < 0 || j >= draft.length) return;
    setDraft((prev) => {
      const next = [...prev];
      const t = next[index];
      next[index] = next[j];
      next[j] = t;
      return next;
    });
  }

  function canDeleteSlug(slug: string): boolean {
    if (draft.length <= 1) return false;
    if (kind === "lead" && slug === "new") return false;
    if (kind === "deal") {
      if (
        slug === "prospect" ||
        slug === "closed_won" ||
        slug === "closed_lost"
      ) {
        return false;
      }
    }
    return true;
  }

  function requestDelete(col: PipelineColumnDef) {
    if (!canDeleteSlug(col.slug)) return;
    const n = stageCounts[col.slug] ?? 0;
    if (n > 0) {
      setReassign({ slug: col.slug, count: n });
      const firstOther = draft.find((c) => c.slug !== col.slug);
      setReassignTarget(firstOther?.slug ?? "");
      return;
    }
    setDraft((prev) => prev.filter((c) => c.slug !== col.slug));
  }

  async function confirmReassignAndRemove() {
    if (!reassign || !reassignTarget || reassign.slug === reassignTarget) {
      setError("Pick a target stage.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res =
        kind === "deal"
          ? await reassignDealsFromStage(reassign.slug, reassignTarget)
          : await reassignLeadsFromStage(reassign.slug, reassignTarget);
      if ("error" in res && res.error) {
        setError(res.error);
        return;
      }
      setDraft((prev) => prev.filter((c) => c.slug !== reassign.slug));
      setReassign(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    const payload = draft.map((c) => ({
      slug: String(c.slug).trim(),
      label: String(c.label).trim(),
      color: String(c.color).trim(),
    }));
    try {
      const res = await saveCrmPipelineSettings(
        kind === "deal"
          ? { dealPipeline: payload }
          : { leadPipeline: payload }
      );
      if ("error" in res && res.error) {
        setError(res.error);
        return;
      }
      onSaved();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-black/40 backdrop-blur-[1px]"
        onClick={() => !saving && onClose()}
      />
      <div className="relative z-10 flex max-h-[min(90vh,640px)] w-full max-w-lg flex-col rounded-2xl border border-border bg-white shadow-xl dark:border-zinc-700 dark:bg-zinc-900">
        <div className="flex items-center justify-between border-b border-border px-5 py-4 dark:border-zinc-700">
          <h2 className="text-lg font-semibold text-text-primary dark:text-zinc-100">
            {title}
          </h2>
          <button
            type="button"
            onClick={() => !saving && onClose()}
            className="rounded-lg p-1 text-text-secondary hover:bg-surface dark:hover:bg-zinc-800"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          <p className="text-sm text-text-secondary dark:text-zinc-400">
            Reorder stages, rename labels, adjust colors, or add stages. Slugs
            for default outcome stages stay fixed for deals (Open, Won, Lost).
          </p>

          <ul className="mt-4 space-y-3">
            {draft.map((col, index) => (
              <li
                key={col.slug}
                className="rounded-xl border border-border bg-surface/40 p-3 dark:border-zinc-700 dark:bg-zinc-800/40"
              >
                <div className="flex items-start gap-2">
                  <div className="flex flex-col gap-0.5 pt-1">
                    <button
                      type="button"
                      className="rounded p-0.5 text-text-secondary hover:bg-white dark:hover:bg-zinc-700"
                      aria-label="Move up"
                      disabled={index === 0 || saving}
                      onClick={() => move(index, -1)}
                    >
                      <ChevronUp className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      className="rounded p-0.5 text-text-secondary hover:bg-white dark:hover:bg-zinc-700"
                      aria-label="Move down"
                      disabled={index === draft.length - 1 || saving}
                      onClick={() => move(index, 1)}
                    >
                      <ChevronDown className="h-4 w-4" />
                    </button>
                  </div>
                  <GripVertical className="mt-2 h-4 w-4 shrink-0 text-text-secondary/50" aria-hidden />
                  <div className="min-w-0 flex-1 space-y-2">
                    <label className="block text-[11px] font-medium uppercase tracking-wide text-text-secondary dark:text-zinc-500">
                      Label
                      <input
                        value={col.label}
                        onChange={(e) =>
                          setDraft((prev) =>
                            prev.map((c) =>
                              c.slug === col.slug
                                ? { ...c, label: e.target.value }
                                : c
                            )
                          )
                        }
                        className="mt-0.5 w-full rounded-lg border border-border bg-white px-2.5 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-900"
                        disabled={saving}
                      />
                    </label>
                    <div>
                      <p className="text-[11px] font-medium uppercase tracking-wide text-text-secondary dark:text-zinc-500">
                        Color
                      </p>
                      <div className="mt-1 flex flex-wrap gap-1.5">
                        {COLOR_PRESETS.map((hex) => (
                          <button
                            key={hex}
                            type="button"
                            className={`h-6 w-6 rounded-full border border-black/10 shadow-sm dark:border-white/15 ${
                              col.color.toLowerCase() === hex.toLowerCase()
                                ? "ring-2 ring-accent ring-offset-2"
                                : ""
                            }`}
                            style={{ backgroundColor: hex }}
                            aria-label={`Color ${hex}`}
                            disabled={saving}
                            onClick={() =>
                              setDraft((prev) =>
                                prev.map((c) =>
                                  c.slug === col.slug ? { ...c, color: hex } : c
                                )
                              )
                            }
                          />
                        ))}
                      </div>
                    </div>
                    <p className="font-mono text-[10px] text-text-secondary/70 dark:text-zinc-500">
                      {col.slug}
                      {(stageCounts[col.slug] ?? 0) > 0
                        ? ` · ${stageCounts[col.slug]} items`
                        : ""}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => requestDelete(col)}
                    disabled={!canDeleteSlug(col.slug) || saving}
                    className="rounded-lg p-2 text-red-500/80 hover:bg-red-50 disabled:opacity-30 dark:hover:bg-red-950/40"
                    aria-label="Remove stage"
                    title={
                      !canDeleteSlug(col.slug)
                        ? "Cannot remove this system stage"
                        : undefined
                    }
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>

          <button
            type="button"
            onClick={() =>
              setDraft((prev) => [
                ...prev,
                {
                  slug: newPipelineColumnSlug(),
                  label: "New stage",
                  color: "#64748b",
                },
              ])
            }
            disabled={saving || draft.length >= 20}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border py-2.5 text-sm font-medium text-text-secondary hover:border-accent hover:text-accent dark:border-zinc-600"
          >
            <Plus className="h-4 w-4" />
            Add stage
          </button>

        </div>

        <div className="shrink-0 border-t border-border px-5 py-4 dark:border-zinc-700">
          {error ? (
            <p
              className="mb-3 text-sm text-red-600 dark:text-red-400"
              role="alert"
            >
              {error}
            </p>
          ) : null}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => !saving && onClose()}
              className="rounded-xl border border-border px-4 py-2 text-sm font-medium dark:border-zinc-600"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-hover disabled:opacity-60"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Save pipeline
            </button>
          </div>
        </div>
      </div>

      {reassign && (
        <div className="absolute inset-0 z-[90] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" />
          <div className="relative w-full max-w-sm rounded-xl border border-border bg-white p-5 shadow-xl dark:border-zinc-700 dark:bg-zinc-900">
            <h3 className="font-semibold text-text-primary dark:text-zinc-100">
              Move {reassign.count} item{reassign.count === 1 ? "" : "s"}
            </h3>
            <p className="mt-2 text-sm text-text-secondary dark:text-zinc-400">
              Reassign from <code className="text-xs">{reassign.slug}</code>{" "}
              before removing this stage.
            </p>
            <label className="mt-4 block text-sm">
              <span className="text-text-secondary dark:text-zinc-400">
                Target stage
              </span>
              <select
                value={reassignTarget}
                onChange={(e) => setReassignTarget(e.target.value)}
                className="mt-1 w-full rounded-lg border border-border bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-900"
              >
                {draft
                  .filter((c) => c.slug !== reassign.slug)
                  .map((c) => (
                    <option key={c.slug} value={c.slug}>
                      {c.label} ({c.slug})
                    </option>
                  ))}
              </select>
            </label>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setReassign(null)}
                className="rounded-lg px-3 py-1.5 text-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void confirmReassignAndRemove()}
                disabled={saving}
                className="rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-white"
              >
                Move & remove
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
