"use client";

import { useEffect, useState, type FormEvent } from "react";
import {
  addCustomProjectStatus,
  deleteCustomProjectStatus,
  updateCustomProjectStatus,
} from "@/app/(crm)/actions/projects";
import { customStatusPresentation } from "@/lib/crm/custom-project-status";
import { Loader2, X } from "lucide-react";

type Props = {
  productId: string;
  open: boolean;
  mode: "create" | "edit";
  /** Required when mode is edit */
  initial: { id: string; label: string; color: string } | null;
  onClose: () => void;
  onSaved: () => void;
};

export default function ProductCustomProjectStatusModal({
  productId,
  open,
  mode,
  initial,
  onClose,
  onSaved,
}: Props) {
  const [label, setLabel] = useState("");
  const [color, setColor] = useState("#6366f1");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    if (mode === "edit" && initial) {
      setLabel(initial.label);
      setColor(initial.color);
    } else {
      setLabel("");
      setColor("#6366f1");
    }
    setError(null);
  }, [open, mode, initial]);

  if (!open) return null;

  const preview = customStatusPresentation({
    id: "preview",
    label: label.trim() || "New status",
    color,
  });

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    if (mode === "create") {
      const res = await addCustomProjectStatus(productId, {
        label: label.trim(),
        color,
      });
      setPending(false);
      if ("error" in res) {
        setError(res.error);
        return;
      }
      onSaved();
      onClose();
      return;
    }
    if (!initial?.id) {
      setPending(false);
      return;
    }
    const res = await updateCustomProjectStatus(productId, initial.id, {
      label: label.trim(),
      color,
    });
    setPending(false);
    if ("error" in res) {
      setError(res.error);
      return;
    }
    onSaved();
    onClose();
  }

  async function onDelete() {
    if (!initial?.id) return;
    if (!confirm(`Delete status “${initial.label}”?`)) return;
    setPending(true);
    setError(null);
    const res = await deleteCustomProjectStatus(productId, initial.id);
    setPending(false);
    if ("error" in res) {
      setError(res.error);
      return;
    }
    onSaved();
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-[80] flex items-start justify-center overflow-y-auto bg-black/40 p-4 py-16"
      role="presentation"
      onMouseDown={(ev) => {
        if (ev.target === ev.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="custom-status-title"
        className="w-full max-w-md rounded-2xl border border-border bg-white shadow-xl dark:border-zinc-700 dark:bg-zinc-950"
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-4 dark:border-zinc-800">
          <h2
            id="custom-status-title"
            className="text-sm font-semibold text-text-primary dark:text-zinc-100"
          >
            {mode === "create" ? "New status" : "Edit status"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-text-secondary hover:bg-surface/80 dark:hover:bg-zinc-800"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-4 px-5 py-4">
          <div>
            <label
              htmlFor="custom-status-label"
              className="text-xs font-medium text-text-secondary dark:text-zinc-400"
            >
              Name
            </label>
            <input
              id="custom-status-label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              maxLength={64}
              className="mt-1.5 w-full rounded-xl border border-border px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
              placeholder="e.g. QA, Review, Blocked"
            />
          </div>

          <div>
            <span className="text-xs font-medium text-text-secondary dark:text-zinc-400">
              Color
            </span>
            <div className="mt-1.5 flex items-center gap-3">
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="h-10 w-14 cursor-pointer rounded-lg border border-border bg-white p-1 dark:border-zinc-600"
                aria-label="Pick color"
              />
              <input
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="min-w-0 flex-1 rounded-xl border border-border px-3 py-2 font-mono text-sm dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
                spellCheck={false}
              />
            </div>
          </div>

          <div>
            <p className="text-xs text-text-secondary dark:text-zinc-500">
              Preview
            </p>
            <div className="mt-2">
              <span
                className="inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-semibold tracking-wide"
                style={{
                  backgroundColor: preview.color,
                  color: preview.foreground,
                }}
              >
                {preview.labelUpper}
              </span>
            </div>
          </div>

          {error ? (
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          ) : null}

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-4 dark:border-zinc-800">
            {mode === "edit" && initial ? (
              <button
                type="button"
                onClick={onDelete}
                disabled={pending}
                className="text-sm font-medium text-red-600 hover:underline disabled:opacity-50 dark:text-red-400"
              >
                Delete column
              </button>
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-border px-4 py-2 text-sm font-medium dark:border-zinc-600"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={pending || !label.trim()}
                className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 dark:bg-blue-600"
              >
                {pending ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                ) : null}
                {mode === "create" ? "Add status" : "Save"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
