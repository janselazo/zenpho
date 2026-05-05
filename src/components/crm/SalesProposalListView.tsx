"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Plus, Search, Trash2, Loader2, Pencil } from "lucide-react";
import { deleteSalesProposal } from "@/app/(crm)/actions/sales-proposals";
import { useRouter } from "next/navigation";
import type { SalesProposalListRow } from "@/lib/crm/sales-proposal-types";

function formatTableDate(iso: string) {
  if (!iso?.trim()) return "—";
  const [y, m, d] = iso.slice(0, 10).split("-");
  if (!y || !m || !d) return iso;
  return `${d}-${m}-${y}`;
}

export default function SalesProposalListView({
  rows: initialRows,
}: {
  rows: SalesProposalListRow[];
}) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return initialRows;
    return initialRows.filter(
      (r) =>
        r.title.toLowerCase().includes(q) ||
        (r.clientName?.toLowerCase().includes(q) ?? false)
    );
  }, [initialRows, search]);

  async function onDelete(id: string) {
    if (!confirm("Delete this proposal document?")) return;
    setDeletingId(id);
    const res = await deleteSalesProposal(id);
    setDeletingId(null);
    if ("error" in res && res.error) {
      alert(res.error);
      return;
    }
    router.refresh();
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-text-secondary dark:text-zinc-500">
            App / Proposals
          </p>
          <h1 className="heading-display mt-1 text-2xl font-bold text-text-primary dark:text-zinc-100">
            Proposals
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-text-secondary dark:text-zinc-400">
            Client-facing narratives about your studio, positioning, services, and highlighted offerings pulled from Products & Services.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search…"
              className="w-full min-w-[200px] rounded-xl border border-border bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 sm:w-56"
            />
          </div>
          <Link
            href="/proposals/new"
            prefetch={false}
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-white px-4 py-2 text-sm font-semibold text-text-primary shadow-sm transition hover:bg-surface dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
          >
            <Plus className="h-4 w-4" aria-hidden />
            New proposal
          </Link>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-white dark:border-zinc-800 dark:bg-zinc-900/40">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-border bg-surface/80 text-[11px] font-semibold uppercase tracking-wider text-text-secondary dark:border-zinc-800 dark:bg-zinc-900/80 dark:text-zinc-500">
                <th className="px-4 py-3">Title</th>
                <th className="px-4 py-3">Buyer</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Updated</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border dark:divide-zinc-800">
              {filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-12 text-center text-text-secondary dark:text-zinc-500"
                  >
                    No proposals yet.{" "}
                    <Link
                      href="/proposals/new"
                      prefetch={false}
                      className="text-accent underline"
                    >
                      Create one
                    </Link>
                    .
                  </td>
                </tr>
              ) : (
                filtered.map((r) => (
                  <tr
                    key={r.id}
                    className="transition hover:bg-surface/50 dark:hover:bg-zinc-800/30"
                  >
                    <td className="max-w-[220px] truncate px-4 py-3 font-medium text-text-primary dark:text-zinc-200">
                      {r.title}
                    </td>
                    <td className="max-w-[180px] truncate px-4 py-3 text-text-secondary dark:text-zinc-400">
                      {r.clientName ?? "—"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <span className="inline-flex rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-semibold capitalize text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200">
                        {r.status}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-text-secondary dark:text-zinc-400">
                      {formatTableDate(r.updatedAt)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        <Link
                          href={`/proposals/${r.id}`}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-text-secondary hover:bg-surface hover:text-text-primary dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                          title="Edit"
                        >
                          <Pencil className="h-4 w-4" />
                        </Link>
                        <button
                          type="button"
                          title="Delete"
                          disabled={deletingId === r.id}
                          onClick={() => void onDelete(r.id)}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-red-600 hover:bg-red-50 disabled:opacity-50 dark:text-red-400 dark:hover:bg-red-950/40"
                        >
                          {deletingId === r.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
