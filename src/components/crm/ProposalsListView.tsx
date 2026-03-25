"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  Clock,
  DollarSign,
  Eye,
  Loader2,
  Pencil,
  Plus,
  Search,
  Trash2,
  XCircle,
} from "lucide-react";
import { deleteProposal } from "@/app/(crm)/actions/proposals";
import ProposalsSubNav from "@/components/crm/ProposalsSubNav";
import type { ProposalListKpis } from "@/lib/crm/fetch-proposals-for-list";
import {
  formatProposalId,
  type ProposalListRow,
  type ProposalStatus,
} from "@/lib/crm/proposal-types";

function formatCurrency(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

function formatTableDate(iso: string) {
  if (!iso?.trim()) return "—";
  const [y, m, d] = iso.slice(0, 10).split("-");
  if (!y || !m || !d) return iso;
  return `${d}-${m}-${y}`;
}

const statusStyles: Record<ProposalStatus, string> = {
  draft:
    "bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200",
  sent: "bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-300",
  pending:
    "bg-amber-100 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200",
  accepted:
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300",
  declined: "bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-300",
  expired:
    "bg-orange-100 text-orange-900 dark:bg-orange-950/40 dark:text-orange-200",
};

function statusLabel(s: ProposalStatus) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export default function ProposalsListView({
  rows: initialRows,
  kpis,
}: {
  rows: ProposalListRow[];
  kpis: ProposalListKpis;
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
        r.clientName.toLowerCase().includes(q) ||
        formatProposalId(r.proposalNumber).toLowerCase().includes(q)
    );
  }, [initialRows, search]);

  async function onDelete(id: string) {
    if (!confirm("Delete this proposal?")) return;
    setDeletingId(id);
    const res = await deleteProposal(id);
    setDeletingId(null);
    if ("error" in res && res.error) {
      alert(res.error);
      return;
    }
    router.refresh();
  }

  return (
    <div className="space-y-8">
      <ProposalsSubNav />
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-text-secondary dark:text-zinc-500">
            App / Proposals
          </p>
          <h1 className="heading-display mt-1 text-2xl font-bold text-text-primary dark:text-zinc-100">
            Proposals
          </h1>
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
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-white px-4 py-2 text-sm font-semibold text-text-primary shadow-sm transition hover:bg-surface dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
          >
            <Plus className="h-4 w-4" aria-hidden />
            Add Proposal
          </Link>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          icon={DollarSign}
          value={formatCurrency(kpis.acceptedValue)}
          label="Accepted value"
        />
        <KpiCard
          icon={CheckCircle2}
          value={String(kpis.acceptedCount)}
          label="Accepted"
        />
        <KpiCard
          icon={Clock}
          value={String(kpis.pendingCount)}
          label="Pending"
        />
        <KpiCard
          icon={XCircle}
          value={String(kpis.declinedCount)}
          label="Declined"
        />
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-white dark:border-zinc-800 dark:bg-zinc-900/40">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] text-left text-sm">
            <thead>
              <tr className="border-b border-border bg-surface/80 text-[11px] font-semibold uppercase tracking-wider text-text-secondary dark:border-zinc-800 dark:bg-zinc-900/80 dark:text-zinc-500">
                <th className="px-4 py-3">ID#</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Proposed to</th>
                <th className="px-4 py-3">Title</th>
                <th className="px-4 py-3">Value</th>
                <th className="px-4 py-3">Valid until</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border dark:divide-zinc-800">
              {filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-12 text-center text-text-secondary dark:text-zinc-500"
                  >
                    No proposals yet.{" "}
                    <Link href="/proposals/new" className="text-accent underline">
                      Add one
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
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-text-primary dark:text-zinc-200">
                      {formatProposalId(r.proposalNumber)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-text-secondary dark:text-zinc-400">
                      {formatTableDate(r.issuedAt)}
                    </td>
                    <td className="max-w-[140px] truncate px-4 py-3 text-text-primary dark:text-zinc-200">
                      {r.clientName}
                    </td>
                    <td className="max-w-[180px] truncate px-4 py-3 text-text-primary dark:text-zinc-200">
                      {r.title}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 font-medium text-text-primary dark:text-zinc-100">
                      {formatCurrency(r.total)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-text-secondary dark:text-zinc-400">
                      {r.validUntil ? formatTableDate(r.validUntil) : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusStyles[r.status]}`}
                      >
                        {statusLabel(r.status)}
                      </span>
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
                        <Link
                          href={`/proposals/${r.id}`}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-text-secondary hover:bg-surface hover:text-text-primary dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                          title="View"
                        >
                          <Eye className="h-4 w-4" />
                        </Link>
                        {r.status !== "accepted" ? (
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
                        ) : null}
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

function KpiCard({
  icon: Icon,
  value,
  label,
}: {
  icon: typeof DollarSign;
  value: string;
  label: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900/40">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border bg-surface dark:border-zinc-700 dark:bg-zinc-800">
          <Icon className="h-5 w-5 text-text-secondary dark:text-zinc-400" />
        </span>
        <div className="min-w-0">
          <p className="text-2xl font-bold tracking-tight text-text-primary dark:text-zinc-100">
            {value}
          </p>
          <p className="text-xs font-medium text-text-secondary dark:text-zinc-500">
            {label}
          </p>
        </div>
      </div>
    </div>
  );
}
