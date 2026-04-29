"use client";

import { useCallback, useEffect, useState } from "react";
import {
  listDiscoverySections,
  updateDiscoverySection,
} from "@/app/(crm)/actions/product-manager";
import ProductTabHeading from "@/components/crm/product/ProductTabHeading";
import { Loader2 } from "lucide-react";

type Row = {
  id: string;
  title: string;
  body: string;
  section_key: string;
};

export default function ProductDiscoveryTab({ productId }: { productId: string }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await listDiscoverySections(productId);
    setLoading(false);
    if (res.error) {
      setError(res.error);
      setRows([]);
      return;
    }
    setRows(
      (res.rows as Row[]).map((r) => ({
        id: r.id,
        title: String(r.title ?? ""),
        body: String(r.body ?? ""),
        section_key: String(r.section_key ?? ""),
      }))
    );
  }, [productId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function save(row: Row, patch: Partial<Pick<Row, "title" | "body">>) {
    setSavingId(row.id);
    setError(null);
    const res = await updateDiscoverySection(productId, row.id, patch);
    setSavingId(null);
    if ("error" in res && res.error) {
      setError(res.error);
      return;
    }
    await load();
  }

  if (loading && rows.length === 0) {
    return (
      <p className="flex items-center gap-2 text-sm text-text-secondary">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        Loading discovery…
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <ProductTabHeading
        title="Discovery"
        description="Persistent discovery notes scoped to this product—requirements, goals, personas, scope, and decisions."
      />
      {error ? (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      ) : null}
      <div className="space-y-4">
        {rows.map((row) => (
          <div
            key={row.id}
            className="rounded-xl border border-border bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900/60"
          >
            <div className="flex items-center justify-between gap-2">
              <input
                className="w-full max-w-xl rounded-lg border border-border bg-transparent px-3 py-2 text-sm font-semibold dark:border-zinc-600"
                value={row.title}
                onChange={(e) =>
                  setRows((prev) =>
                    prev.map((r) =>
                      r.id === row.id ? { ...r, title: e.target.value } : r
                    )
                  )
                }
                onBlur={(e) => {
                  const t = e.target.value.trim();
                  if (t && t !== row.title) void save(row, { title: t });
                }}
                aria-label="Section title"
              />
              {savingId === row.id ? (
                <Loader2 className="h-4 w-4 shrink-0 animate-spin text-text-secondary" />
              ) : null}
            </div>
            <p className="mt-1 text-[11px] uppercase tracking-wide text-text-secondary dark:text-zinc-500">
              {row.section_key}
            </p>
            <textarea
              className="mt-3 min-h-[120px] w-full rounded-lg border border-border bg-transparent px-3 py-2 text-sm dark:border-zinc-600"
              value={row.body}
              onChange={(e) =>
                setRows((prev) =>
                  prev.map((r) =>
                    r.id === row.id ? { ...r, body: e.target.value } : r
                  )
                )
              }
              onBlur={(e) => {
                if (e.target.value !== row.body) void save(row, { body: e.target.value });
              }}
              placeholder="Notes…"
              aria-label={`${row.title} body`}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
