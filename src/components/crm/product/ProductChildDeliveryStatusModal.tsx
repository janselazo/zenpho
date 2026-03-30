"use client";

import { useEffect, useState, type FormEvent } from "react";
import { updateProductChildDeliveryStatusUi } from "@/app/(crm)/actions/projects";
import {
  resolveChildDeliveryPresentation,
  type ChildDeliveryStatusUiConfig,
} from "@/lib/crm/child-delivery-status-ui";
import type { ChildDeliveryStatus } from "@/lib/crm/product-project-metadata";
import { Loader2, X } from "lucide-react";

type Props = {
  productId: string;
  open: boolean;
  statusId: ChildDeliveryStatus | null;
  statusUi: ChildDeliveryStatusUiConfig;
  onClose: () => void;
  onSaved: () => void;
};

export default function ProductChildDeliveryStatusModal({
  productId,
  open,
  statusId,
  statusUi,
  onClose,
  onSaved,
}: Props) {
  const [label, setLabel] = useState("");
  const [color, setColor] = useState("#7c3aed");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !statusId) return;
    const pres = resolveChildDeliveryPresentation(statusId, statusUi);
    setLabel(pres.label);
    setColor(pres.color);
    setError(null);
  }, [open, statusId, statusUi]);

  if (!open || !statusId) return null;

  const preview = resolveChildDeliveryPresentation(statusId, {
    ...statusUi,
    [statusId]: { label: label.trim() || undefined, color },
  });

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!statusId) return;
    setPending(true);
    setError(null);
    const res = await updateProductChildDeliveryStatusUi(productId, statusId, {
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

  async function onReset() {
    if (!statusId) return;
    setPending(true);
    setError(null);
    const res = await updateProductChildDeliveryStatusUi(productId, statusId, {
      resetToDefaults: true,
    });
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
        aria-labelledby="delivery-status-edit-title"
        className="w-full max-w-md rounded-2xl border border-border bg-white shadow-xl dark:border-zinc-700 dark:bg-zinc-950"
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-4 dark:border-zinc-800">
          <h2
            id="delivery-status-edit-title"
            className="text-sm font-semibold text-text-primary dark:text-zinc-100"
          >
            Edit status column
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
              htmlFor="delivery-status-label"
              className="text-xs font-medium text-text-secondary dark:text-zinc-400"
            >
              Name
            </label>
            <input
              id="delivery-status-label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              maxLength={64}
              className="mt-1.5 w-full rounded-xl border border-border px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
              placeholder="Status name"
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
            <button
              type="button"
              onClick={onReset}
              disabled={pending}
              className="text-sm font-medium text-text-secondary hover:text-text-primary disabled:opacity-50 dark:text-zinc-400 dark:hover:text-zinc-200"
            >
              Reset to default
            </button>
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
                Save
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
