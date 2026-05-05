"use client";

import { useEffect, useState } from "react";
import {
  createCrmCatalogItem,
  deleteCrmCatalogItem,
  updateCrmCatalogItem,
} from "@/app/(crm)/actions/crm-catalog";
import type { CrmProductServiceRow } from "@/lib/crm/crm-catalog-types";

function formatMoney(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(n);
}

export default function ProductsServicesPageClient({
  initialItems,
}: {
  initialItems: CrmProductServiceRow[];
}) {
  const [items, setItems] = useState(initialItems);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const [creating, setCreating] = useState(false);
  const [draftNew, setDraftNew] = useState({
    name: "",
    description: "",
    unitPrice: "",
    sku: "",
    sortOrder: "0",
  });

  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftEdit, setDraftEdit] = useState({
    name: "",
    description: "",
    unitPrice: "",
    sku: "",
    isActive: true,
    sortOrder: "0",
  });

  useEffect(() => {
    setItems(initialItems);
  }, [initialItems]);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    const price = parseFloat(draftNew.unitPrice);
    const sortOrder = parseInt(draftNew.sortOrder, 10);
    setBusyId("__new");
    const res = await createCrmCatalogItem({
      name: draftNew.name,
      description: draftNew.description,
      unitPrice: Number.isFinite(price) ? price : 0,
      sku: draftNew.sku.trim() ? draftNew.sku.trim() : null,
      sortOrder: Number.isFinite(sortOrder) ? sortOrder : 0,
    });
    setBusyId(null);
    if ("error" in res && res.error) {
      setMsg(res.error);
      return;
    }
    setDraftNew({
      name: "",
      description: "",
      unitPrice: "",
      sku: "",
      sortOrder: "0",
    });
    setCreating(false);
    window.location.reload();
  }

  async function onSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingId) return;
    setMsg(null);
    const price = parseFloat(draftEdit.unitPrice);
    const sortOrder = parseInt(draftEdit.sortOrder, 10);
    setBusyId(editingId);
    const res = await updateCrmCatalogItem(editingId, {
      name: draftEdit.name,
      description: draftEdit.description,
      unitPrice: Number.isFinite(price) ? price : 0,
      sku: draftEdit.sku.trim() ? draftEdit.sku.trim() : null,
      isActive: draftEdit.isActive,
      sortOrder: Number.isFinite(sortOrder) ? sortOrder : 0,
    });
    setBusyId(null);
    if ("error" in res && res.error) {
      setMsg(res.error);
      return;
    }
    setEditingId(null);
    window.location.reload();
  }

  async function onDelete(id: string) {
    if (!confirm("Remove this catalog item? It will unlink from future picks; invoice lines keep their snapshot.")) return;
    setBusyId(id);
    setMsg(null);
    const res = await deleteCrmCatalogItem(id);
    setBusyId(null);
    if ("error" in res && res.error) setMsg(res.error);
    else window.location.reload();
  }

  function startEdit(row: CrmProductServiceRow) {
    setEditingId(row.id);
    setDraftEdit({
      name: row.name,
      description: row.description,
      unitPrice: String(row.unit_price),
      sku: row.sku ?? "",
      isActive: row.is_active,
      sortOrder: String(row.sort_order),
    });
  }

  const inputClass =
    "w-full rounded-lg border border-border bg-white px-2 py-1.5 text-sm outline-none focus:border-blue-400 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100";

  return (
    <div className="mt-8 space-y-6">
      {msg ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200">
          {msg}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setCreating((c) => !c)}
          className="rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-accent-hover"
        >
          {creating ? "Cancel" : "Add product or service"}
        </button>
      </div>

      {creating ? (
        <form
          onSubmit={(e) => void onCreate(e)}
          className="rounded-2xl border border-border bg-zinc-50/80 p-4 dark:border-zinc-700 dark:bg-zinc-900/40"
        >
          <p className="mb-3 text-xs font-bold uppercase tracking-wider text-text-secondary dark:text-zinc-500">
            New catalog item
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-medium text-text-secondary dark:text-zinc-400">
                Name
              </label>
              <input
                className={inputClass}
                value={draftNew.name}
                onChange={(e) =>
                  setDraftNew((d) => ({ ...d, name: e.target.value }))
                }
                required
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-medium text-text-secondary dark:text-zinc-400">
                Description
              </label>
              <textarea
                className={`${inputClass} min-h-[72px]`}
                value={draftNew.description}
                onChange={(e) =>
                  setDraftNew((d) => ({ ...d, description: e.target.value }))
                }
                rows={3}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-text-secondary dark:text-zinc-400">
                Unit price (USD)
              </label>
              <input
                className={inputClass}
                type="number"
                min={0}
                step={0.01}
                value={draftNew.unitPrice}
                onChange={(e) =>
                  setDraftNew((d) => ({ ...d, unitPrice: e.target.value }))
                }
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-text-secondary dark:text-zinc-400">
                SKU (optional)
              </label>
              <input className={inputClass} value={draftNew.sku} onChange={(e) =>
                setDraftNew((d) => ({ ...d, sku: e.target.value }))
              } />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-text-secondary dark:text-zinc-400">
                Sort order
              </label>
              <input className={inputClass} type="number" value={draftNew.sortOrder} onChange={(e) =>
                setDraftNew((d) => ({ ...d, sortOrder: e.target.value }))
              } />
            </div>
          </div>
          <button
            type="submit"
            disabled={busyId === "__new"}
            className="mt-4 rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {busyId === "__new" ? "Saving…" : "Save item"}
          </button>
        </form>
      ) : null}

      <div className="overflow-x-auto rounded-2xl border border-border bg-white dark:border-zinc-800 dark:bg-zinc-900/40">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="border-b border-border bg-zinc-50 text-xs uppercase tracking-wide text-text-secondary dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-500">
            <tr>
              <th className="px-3 py-2 font-semibold">Name</th>
              <th className="px-3 py-2 font-semibold">Price</th>
              <th className="px-3 py-2 font-semibold">SKU</th>
              <th className="px-3 py-2 font-semibold">Order</th>
              <th className="px-3 py-2 font-semibold">Active</th>
              <th className="px-3 py-2 font-semibold"> </th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td
                  className="px-3 py-8 text-center text-text-secondary dark:text-zinc-500"
                  colSpan={6}
                >
                  No catalog items yet. Add products and services you sell; they appear on invoice line-item pickers.
                </td>
              </tr>
            ) : null}
            {items.map((row) =>
              editingId === row.id ? (
                <tr key={row.id} className="border-b border-border dark:border-zinc-800 align-top bg-blue-50/50 dark:bg-zinc-950/50">
                  <td colSpan={6} className="p-3">
                    <form onSubmit={(e) => void onSaveEdit(e)} className="space-y-3">
                      <div className="grid gap-2 sm:grid-cols-2">
                        <div className="sm:col-span-2">
                          <label className="mb-1 block text-xs font-medium">Name</label>
                          <input className={inputClass} required value={draftEdit.name} onChange={(e) =>
                            setDraftEdit((d) => ({ ...d, name: e.target.value }))
                          } />
                        </div>
                        <div className="sm:col-span-2">
                          <label className="mb-1 block text-xs font-medium">Description</label>
                          <textarea className={`${inputClass} min-h-[64px]`} value={draftEdit.description} rows={3} onChange={(e) =>
                            setDraftEdit((d) => ({ ...d, description: e.target.value }))
                          } />
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-medium">Unit price</label>
                          <input type="number" min={0} step={0.01} className={inputClass} value={draftEdit.unitPrice} onChange={(e) =>
                            setDraftEdit((d) => ({ ...d, unitPrice: e.target.value }))
                          } />
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-medium">SKU</label>
                          <input className={inputClass} value={draftEdit.sku} onChange={(e) =>
                            setDraftEdit((d) => ({ ...d, sku: e.target.value }))
                          } />
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-medium">Sort order</label>
                          <input type="number" className={inputClass} value={draftEdit.sortOrder} onChange={(e) =>
                            setDraftEdit((d) => ({ ...d, sortOrder: e.target.value }))
                          } />
                        </div>
                        <div className="flex items-end">
                          <label className="flex cursor-pointer items-center gap-2 text-sm">
                            <input
                              type="checkbox"
                              checked={draftEdit.isActive}
                              onChange={(e) =>
                                setDraftEdit((d) => ({
                                  ...d,
                                  isActive: e.target.checked,
                                }))
                              }
                            />
                            Active (shown in pickers)
                          </label>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="submit"
                          disabled={busyId === row.id}
                          className="rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingId(null)}
                          className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold dark:border-zinc-600"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  </td>
                </tr>
              ) : (
                <tr
                  key={row.id}
                  className="border-b border-border last:border-b-0 dark:border-zinc-800"
                >
                  <td className="px-3 py-2 align-top font-medium text-text-primary dark:text-zinc-100">
                    {row.name}
                    {row.description ? (
                      <p className="mt-1 text-xs font-normal text-text-secondary line-clamp-2 dark:text-zinc-400">
                        {row.description}
                      </p>
                    ) : null}
                  </td>
                  <td className="px-3 py-2 align-top tabular-nums">
                    {formatMoney(row.unit_price)}
                  </td>
                  <td className="px-3 py-2 align-top text-text-secondary dark:text-zinc-400">
                    {row.sku ?? "—"}
                  </td>
                  <td className="px-3 py-2 align-top">{row.sort_order}</td>
                  <td className="px-3 py-2 align-top">
                    {row.is_active ? (
                      <span className="text-emerald-700 dark:text-emerald-400">Yes</span>
                    ) : (
                      <span className="text-zinc-500">No</span>
                    )}
                  </td>
                  <td className="px-3 py-2 align-top text-right">
                    <button
                      type="button"
                      onClick={() => startEdit(row)}
                      className="text-xs font-semibold text-accent hover:underline"
                    >
                      Edit
                    </button>
                    {" · "}
                    <button
                      type="button"
                      onClick={() => void onDelete(row.id)}
                      disabled={busyId === row.id}
                      className="text-xs font-semibold text-red-600 hover:underline dark:text-red-400"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              )
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
