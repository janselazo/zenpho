"use client";

import { useEffect, useState, type FormEvent } from "react";
import { updateProductChildDeliveryStatusesBulk } from "@/app/(crm)/actions/projects";
import {
  resolveChildDeliveryPresentation,
  type ChildDeliveryStatusUiConfig,
} from "@/lib/crm/child-delivery-status-ui";
import {
  CHILD_DELIVERY_STATUSES,
  type ChildDeliveryStatus,
} from "@/lib/crm/product-project-metadata";
import { Loader2, X } from "lucide-react";

type RowState = { id: ChildDeliveryStatus; label: string; color: string };

type Props = {
  productId: string;
  open: boolean;
  statusUi: ChildDeliveryStatusUiConfig;
  onClose: () => void;
  onSaved: () => void;
};

export default function ProductChildDeliveryStatusesBulkModal({
  productId,
  open,
  statusUi,
  onClose,
  onSaved,
}: Props) {
  const [rows, setRows] = useState<RowState[]>([]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setRows(
      CHILD_DELIVERY_STATUSES.map((id) => {
        const p = resolveChildDeliveryPresentation(id, statusUi);
        return { id, label: p.label, color: p.color };
      })
    );
    setError(null);
  }, [open, statusUi]);

  if (!open) return null;

  function baselineRows(): RowState[] {
    return CHILD_DELIVERY_STATUSES.map((id) => {
      const p = resolveChildDeliveryPresentation(id, statusUi);
      return { id, label: p.label, color: p.color };
    });
  }

  function effectiveRows(): RowState[] {
    return rows.length === CHILD_DELIVERY_STATUSES.length ? rows : baselineRows();
  }

  function patchRow(
    id: ChildDeliveryStatus,
    patch: Partial<Pick<RowState, "label" | "color">>
  ) {
    setRows((prev) => {
      const base =
        prev.length === CHILD_DELIVERY_STATUSES.length ? prev : baselineRows();
      return base.map((r) => (r.id === id ? { ...r, ...patch } : r));
    });
  }

  function orderedPayload(): RowState[] {
    const base = effectiveRows();
    return CHILD_DELIVERY_STATUSES.map((id) => base.find((r) => r.id === id)!);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const payload = orderedPayload();
    const invalid = payload.some((r) => !r.label.trim());
    if (invalid) {
      setError("Each status needs a name.");
      return;
    }
    setPending(true);
    setError(null);
    const res = await updateProductChildDeliveryStatusesBulk(productId, payload);
    setPending(false);
    if ("error" in res) {
      setError(res.error);
      return;
    }
    onSaved();
    onClose();
  }

  async function onResetAll() {
    const payload = CHILD_DELIVERY_STATUSES.map((id) => {
      const p = resolveChildDeliveryPresentation(id, {});
      return { id, label: p.label, color: p.color };
    });
    setPending(true);
    setError(null);
    const res = await updateProductChildDeliveryStatusesBulk(productId, payload);
    setPending(false);
    if ("error" in res) {
      setError(res.error);
      return;
    }
    onSaved();
    onClose();
  }

  const forDisplay = effectiveRows();

  return (
    <div
      className="fixed inset-0 z-[80] flex items-start justify-center overflow-y-auto bg-black/40 p-4 py-12"
      role="presentation"
      onMouseDown={(ev) => {
        if (ev.target === ev.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="delivery-status-bulk-title"
        className="w-full max-w-xl rounded-2xl border border-border bg-white shadow-xl dark:border-zinc-700 dark:bg-zinc-950"
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-4 dark:border-zinc-800">
          <div>
            <h2
              id="delivery-status-bulk-title"
              className="text-sm font-semibold text-text-primary dark:text-zinc-100"
            >
              Status names & colors
            </h2>
            <p className="mt-0.5 text-xs text-text-secondary dark:text-zinc-400">
              Changes apply to all project rows in these columns.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-lg p-1.5 text-text-secondary hover:bg-surface/80 dark:hover:bg-zinc-800"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-3 px-5 py-4">
          <div className="max-h-[min(60vh,28rem)] space-y-3 overflow-y-auto pr-1">
            {CHILD_DELIVERY_STATUSES.map((id) => {
              const row = forDisplay.find((r) => r.id === id)!;
              const preview = resolveChildDeliveryPresentation(id, {
                ...statusUi,
                [id]: { label: row.label.trim() || undefined, color: row.color },
              });
              return (
                <div
                  key={id}
                  className="flex flex-col gap-2 rounded-xl border border-border/80 p-3 dark:border-zinc-800 sm:flex-row sm:items-center sm:gap-3"
                >
                  <span
                    className="h-3 w-3 shrink-0 rounded-full sm:mt-0.5"
                    style={{ backgroundColor: row.color }}
                    aria-hidden
                  />
                  <input
                    value={row.label}
                    onChange={(e) => patchRow(id, { label: e.target.value })}
                    maxLength={64}
                    className="min-w-0 flex-1 rounded-lg border border-border px-2.5 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
                    aria-label={`Name for ${id.replace(/_/g, " ")}`}
                  />
                  <div className="flex shrink-0 items-center gap-2">
                    <input
                      type="color"
                      value={row.color}
                      onChange={(e) => patchRow(id, { color: e.target.value })}
                      className="h-9 w-12 cursor-pointer rounded-lg border border-border bg-white p-0.5 dark:border-zinc-600"
                      aria-label={`Color for ${row.label || id}`}
                    />
                    <span
                      className="hidden min-w-[5.5rem] items-center justify-center rounded-md px-2 py-0.5 text-[10px] font-semibold tracking-wide sm:inline-flex"
                      style={{
                        backgroundColor: preview.color,
                        color: preview.foreground,
                      }}
                    >
                      {preview.labelUpper}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {error ? (
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          ) : null}

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-4 dark:border-zinc-800">
            <button
              type="button"
              onClick={() => void onResetAll()}
              disabled={pending}
              className="text-sm font-medium text-text-secondary hover:text-text-primary disabled:opacity-50 dark:text-zinc-400 dark:hover:text-zinc-200"
            >
              Reset all to defaults
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
                disabled={pending}
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
