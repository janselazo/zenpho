"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import InvoiceSubNav from "@/components/crm/InvoiceSubNav";
import {
  formatProposalId,
  type ContractStatus,
} from "@/lib/crm/proposal-types";
import type { AgreementListRow } from "@/lib/crm/fetch-contracts-for-agreements-list";

function formatCurrency(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

function formatTableDate(iso: string) {
  if (!iso?.trim()) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

const statusStyles: Record<ContractStatus, string> = {
  draft:
    "bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200",
  sent: "bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-300",
  signed:
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300",
};

export default function AgreementsListView({
  rows: initialRows,
}: {
  rows: AgreementListRow[];
}) {
  const [search, setSearch] = useState("");

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

  return (
    <div className="space-y-8">
      <InvoiceSubNav />
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-text-secondary dark:text-zinc-500">
            App / Invoices / Agreements
          </p>
          <h1 className="heading-display mt-1 text-2xl font-bold text-text-primary dark:text-zinc-100">
            Agreements
          </h1>
          <p className="mt-1 text-sm text-text-secondary dark:text-zinc-400">
            Contracts generated from accepted invoices. Edit terms before
            sending for signature.
          </p>
        </div>
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
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-white dark:border-zinc-800 dark:bg-zinc-900/40">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-border bg-surface/80 text-[11px] font-semibold uppercase tracking-wider text-text-secondary dark:border-zinc-800 dark:bg-zinc-900/80 dark:text-zinc-500">
                <th className="px-4 py-3">Invoice</th>
                <th className="px-4 py-3">Client</th>
                <th className="px-4 py-3">Agreement</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Updated</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border dark:divide-zinc-800">
              {filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-12 text-center text-text-secondary dark:text-zinc-500"
                  >
                    No agreements yet. Accept an invoice to generate a contract.
                  </td>
                </tr>
              ) : (
                filtered.map((r) => (
                  <tr
                    key={r.contractId}
                    className="transition hover:bg-surface/50 dark:hover:bg-zinc-800/30"
                  >
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-text-primary dark:text-zinc-200">
                      {formatProposalId(r.proposalNumber)}
                    </td>
                    <td className="px-4 py-3 text-text-primary dark:text-zinc-200">
                      {r.clientName}
                    </td>
                    <td className="max-w-[200px] truncate px-4 py-3 text-text-primary dark:text-zinc-200">
                      {r.title}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 font-medium text-text-primary dark:text-zinc-100">
                      {formatCurrency(r.total)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${statusStyles[r.status]}`}
                      >
                        {r.status}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-text-secondary dark:text-zinc-400">
                      {formatTableDate(r.updatedAt)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right">
                      <Link
                        href={`/invoices/agreements/${r.contractId}`}
                        className="font-medium text-accent hover:underline"
                      >
                        Open
                      </Link>
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
