"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  markContractSent,
  recordContractSignature,
} from "@/app/(crm)/actions/contracts";
import type { ContractDetail } from "@/lib/crm/proposal-types";
import { formatProposalId } from "@/lib/crm/proposal-types";
import { Loader2 } from "lucide-react";

function formatCurrency(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

const statusClass: Record<string, string> = {
  draft:
    "bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200",
  sent: "bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-300",
  signed:
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300",
};

export default function ContractDetailView({
  initial,
}: {
  initial: ContractDetail;
}) {
  const router = useRouter();
  const [signerName, setSignerName] = useState("");
  const [busy, setBusy] = useState<"send" | "sign" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onMarkSent() {
    setError(null);
    setBusy("send");
    const res = await markContractSent(initial.id);
    setBusy(null);
    if ("error" in res && res.error) {
      setError(res.error);
      return;
    }
    router.refresh();
  }

  async function onSign(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy("sign");
    const res = await recordContractSignature(initial.id, signerName);
    setBusy(null);
    if ("error" in res && res.error) {
      setError(res.error);
      return;
    }
    setSignerName("");
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8 p-8">
      <div>
        <Link
          href="/invoices"
          className="text-sm text-text-secondary hover:text-text-primary dark:text-zinc-500"
        >
          ← Invoices
        </Link>
        <h1 className="heading-display mt-4 text-2xl font-bold text-text-primary dark:text-zinc-100">
          Contract
        </h1>
        <p className="mt-1 text-sm text-text-secondary dark:text-zinc-400">
          From invoice {formatProposalId(initial.proposalNumber)} —{" "}
          <Link
            href={`/invoices/${initial.proposalId}`}
            className="text-accent underline"
          >
            View invoice
          </Link>
        </p>
      </div>

      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200">
          {error}
        </p>
      ) : null}

      <div className="rounded-2xl border border-border bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900/40">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-text-secondary dark:text-zinc-500">
              Client
            </p>
            <p className="text-lg font-semibold text-text-primary dark:text-zinc-100">
              {initial.clientName}
            </p>
          </div>
          <span
            className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold capitalize ${statusClass[initial.status] ?? statusClass.draft}`}
          >
            {initial.status}
          </span>
        </div>

        <dl className="mt-6 grid gap-3 text-sm">
          <div className="flex justify-between gap-4 border-t border-border pt-4 dark:border-zinc-800">
            <dt className="text-text-secondary dark:text-zinc-500">
              Proposal title
            </dt>
            <dd className="font-medium text-text-primary dark:text-zinc-200">
              {initial.proposalTitle}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-text-secondary dark:text-zinc-500">
              Issued
            </dt>
            <dd className="text-text-primary dark:text-zinc-200">
              {initial.issuedAt || "—"}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-text-secondary dark:text-zinc-500">
              Total value
            </dt>
            <dd className="text-lg font-bold text-text-primary dark:text-zinc-100">
              {formatCurrency(initial.total)}
            </dd>
          </div>
        </dl>

        {initial.termsSnapshot?.trim() ? (
          <div className="mt-6 border-t border-border pt-4 dark:border-zinc-800">
            <p className="text-xs font-semibold uppercase tracking-wider text-text-secondary dark:text-zinc-500">
              Terms (snapshot)
            </p>
            <p className="mt-2 whitespace-pre-wrap text-sm text-text-primary dark:text-zinc-300">
              {initial.termsSnapshot}
            </p>
          </div>
        ) : null}

        {initial.status === "signed" ? (
          <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50/80 p-4 dark:border-emerald-900/40 dark:bg-emerald-950/20">
            <p className="text-sm font-semibold text-emerald-900 dark:text-emerald-200">
              Signed
            </p>
            {initial.signerName ? (
              <p className="mt-1 text-sm text-emerald-800 dark:text-emerald-300">
                {initial.signerName}
              </p>
            ) : null}
            {initial.signedAt ? (
              <p className="text-xs text-emerald-700 dark:text-emerald-400">
                {new Date(initial.signedAt).toLocaleString()}
              </p>
            ) : null}
          </div>
        ) : (
          <div className="mt-6 space-y-4 border-t border-border pt-6 dark:border-zinc-800">
            {initial.status === "draft" ? (
              <button
                type="button"
                disabled={busy === "send"}
                onClick={() => void onMarkSent()}
                className="rounded-xl bg-text-primary px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
              >
                {busy === "send" ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Updating…
                  </span>
                ) : (
                  "Mark sent"
                )}
              </button>
            ) : null}

            {initial.status === "sent" ? (
              <form onSubmit={(e) => void onSign(e)} className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-text-secondary dark:text-zinc-500">
                  Record signature
                </p>
                <input
                  value={signerName}
                  onChange={(e) => setSignerName(e.target.value)}
                  required
                  placeholder="Signer full name"
                  className="w-full rounded-xl border border-border bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                />
                <button
                  type="submit"
                  disabled={busy === "sign"}
                  className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  {busy === "sign" ? (
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Saving…
                    </span>
                  ) : (
                    "Record signature"
                  )}
                </button>
              </form>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
