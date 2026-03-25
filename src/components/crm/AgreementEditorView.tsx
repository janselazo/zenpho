"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  markContractSent,
  recordContractSignature,
  updateContractTermsSnapshot,
} from "@/app/(crm)/actions/contracts";
import type { ContractDetail } from "@/lib/crm/proposal-types";
import { formatProposalId } from "@/lib/crm/proposal-types";
import { Eye, EyeOff, Loader2, MoreHorizontal, Zap } from "lucide-react";

function formatCurrency(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(n);
}

const statusClass: Record<string, string> = {
  draft:
    "bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200",
  sent: "bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-300",
  signed:
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300",
};

export default function AgreementEditorView({
  initial,
}: {
  initial: ContractDetail;
}) {
  const router = useRouter();
  const signSectionRef = useRef<HTMLDivElement>(null);
  const [terms, setTerms] = useState(initial.termsSnapshot ?? "");
  const [preview, setPreview] = useState(false);
  const [signerName, setSignerName] = useState("");
  const [busy, setBusy] = useState<"save" | "send" | "sign" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  useEffect(() => {
    setTerms(initial.termsSnapshot ?? "");
  }, [initial.id, initial.termsSnapshot]);

  const readOnly = initial.status === "signed";
  const propRef = formatProposalId(initial.proposalNumber);

  async function onSaveTerms() {
    if (readOnly) return;
    setError(null);
    setSaveMsg(null);
    setBusy("save");
    const res = await updateContractTermsSnapshot(initial.id, terms);
    setBusy(null);
    if ("error" in res && res.error) {
      setError(res.error);
      return;
    }
    setSaveMsg("Agreement saved.");
    router.refresh();
  }

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

  function scrollToSign() {
    signSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <div className="min-h-0 flex-1">
      {/* Top bar */}
      <div className="sticky top-0 z-10 border-b border-border bg-surface/95 px-4 py-3 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/90">
        <div className="mx-auto flex max-w-[1400px] flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <nav className="flex flex-wrap items-center gap-1 text-xs text-text-secondary dark:text-zinc-500">
            <Link href="/proposals" className="hover:text-accent">
              Proposals
            </Link>
            <span aria-hidden>/</span>
            <Link href="/proposals/agreements" className="hover:text-accent">
              Agreements
            </Link>
            <span aria-hidden>/</span>
            <span className="font-mono text-text-primary dark:text-zinc-300">
              {propRef}
            </span>
            <span aria-hidden>/</span>
            <span className="max-w-[12rem] truncate font-medium text-text-primary dark:text-zinc-200">
              {initial.proposalTitle}
            </span>
          </nav>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setPreview((p) => !p)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-white px-3 py-2 text-sm font-medium text-text-primary shadow-sm hover:bg-surface dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
            >
              {preview ? (
                <>
                  <EyeOff className="h-4 w-4" aria-hidden />
                  Edit
                </>
              ) : (
                <>
                  <Eye className="h-4 w-4" aria-hidden />
                  Preview
                </>
              )}
            </button>
            <button
              type="button"
              disabled
              className="inline-flex cursor-not-allowed items-center gap-1.5 rounded-xl border border-transparent px-3 py-2 text-sm font-medium text-text-secondary/50 dark:text-zinc-600"
              title="Coming soon"
            >
              <Zap className="h-4 w-4" aria-hidden />
              Automation
            </button>
            {!readOnly ? (
              <button
                type="button"
                onClick={scrollToSign}
                className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700"
              >
                Sign contract
              </button>
            ) : null}
            <button
              type="button"
              className="rounded-xl border border-border p-2 text-text-secondary hover:bg-surface dark:border-zinc-700 dark:hover:bg-zinc-800"
              aria-label="More options"
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto grid max-w-[1400px] gap-6 px-4 py-6 lg:grid-cols-[1fr_280px]">
        {error ? (
          <p className="lg:col-span-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200">
            {error}
          </p>
        ) : null}
        {saveMsg ? (
          <p className="lg:col-span-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-200">
            {saveMsg}
          </p>
        ) : null}

        {/* Document column */}
        <div className="min-w-0">
          <div className="rounded-2xl border border-border bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
            <div className="border-b border-zinc-100 px-6 py-5 dark:border-zinc-800">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-400">
                Agreement
              </p>
              <h1 className="mt-1 text-xl font-bold text-text-primary dark:text-zinc-100">
                {initial.proposalTitle}
              </h1>
            </div>
            <div className="p-6">
              {readOnly ? (
                <div className="min-h-[320px] whitespace-pre-wrap rounded-xl border border-dashed border-zinc-200 bg-zinc-50/80 px-4 py-4 text-sm leading-relaxed text-text-primary dark:border-zinc-700 dark:bg-zinc-900/50 dark:text-zinc-200">
                  {terms.trim() ? terms : "No terms on file."}
                </div>
              ) : preview ? (
                <div className="min-h-[320px] whitespace-pre-wrap rounded-xl border border-zinc-200 bg-white px-4 py-4 text-sm leading-relaxed text-text-primary shadow-inner dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-200">
                  {terms.trim() ? terms : "Nothing to preview yet."}
                </div>
              ) : (
                <textarea
                  value={terms}
                  onChange={(e) => {
                    setTerms(e.target.value);
                    setSaveMsg(null);
                  }}
                  placeholder="Add agreement terms… (plain text; line breaks are preserved)"
                  rows={18}
                  className="min-h-[320px] w-full resize-y rounded-xl border border-zinc-200 bg-white px-4 py-4 text-sm leading-relaxed text-text-primary outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400/20 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                />
              )}
            </div>
            {!readOnly && !preview ? (
              <div className="flex justify-end gap-2 border-t border-zinc-100 px-6 py-4 dark:border-zinc-800">
                <button
                  type="button"
                  disabled={busy === "save"}
                  onClick={() => void onSaveTerms()}
                  className="rounded-xl bg-text-primary px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
                >
                  {busy === "save" ? (
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Saving…
                    </span>
                  ) : (
                    "Save agreement"
                  )}
                </button>
              </div>
            ) : null}
          </div>

          {/* Sign / send — below document on mobile; ref for scroll */}
          <div ref={signSectionRef} className="mt-8 scroll-mt-24">
            <div className="rounded-2xl border border-border bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900/40">
              {initial.status === "signed" ? (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 p-4 dark:border-emerald-900/40 dark:bg-emerald-950/20">
                  <p className="text-sm font-semibold text-emerald-900 dark:text-emerald-200">
                    Signed
                  </p>
                  {initial.signerName ? (
                    <p className="mt-1 text-sm text-emerald-800 dark:text-emerald-300">
                      {initial.signerName}
                    </p>
                  ) : null}
                  {initial.signedAt ? (
                    <p className="mt-1 text-xs text-emerald-700 dark:text-emerald-400">
                      {new Date(initial.signedAt).toLocaleString()}
                    </p>
                  ) : null}
                </div>
              ) : (
                <div className="space-y-6">
                  {initial.status === "draft" ? (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-text-secondary dark:text-zinc-500">
                        Send to client
                      </p>
                      <p className="mt-1 text-sm text-text-secondary dark:text-zinc-400">
                        Mark as sent when you have shared this agreement outside
                        the app.
                      </p>
                      <button
                        type="button"
                        disabled={busy === "send"}
                        onClick={() => void onMarkSent()}
                        className="mt-3 rounded-xl bg-text-primary px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
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
                    </div>
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
        </div>

        {/* Overview rail */}
        <aside className="space-y-6 lg:sticky lg:top-[4.5rem] lg:self-start">
          <div className="rounded-2xl border border-border bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900/40">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-text-secondary dark:text-zinc-500">
              Overview
            </h2>
            <dl className="mt-4 space-y-3 text-sm">
              <div>
                <dt className="text-text-secondary dark:text-zinc-500">Status</dt>
                <dd className="mt-1">
                  <span
                    className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${statusClass[initial.status] ?? statusClass.draft}`}
                  >
                    {initial.status}
                  </span>
                </dd>
              </div>
              <div>
                <dt className="text-text-secondary dark:text-zinc-500">Client</dt>
                <dd className="mt-1 font-medium text-text-primary dark:text-zinc-100">
                  {initial.clientName}
                </dd>
              </div>
              <div>
                <dt className="text-text-secondary dark:text-zinc-500">
                  Proposal
                </dt>
                <dd className="mt-1">
                  <Link
                    href={`/proposals/${initial.proposalId}`}
                    className="font-medium text-accent hover:underline"
                  >
                    {propRef}
                  </Link>
                </dd>
              </div>
              <div>
                <dt className="text-text-secondary dark:text-zinc-500">Amount</dt>
                <dd className="mt-1 text-lg font-bold text-text-primary dark:text-zinc-100">
                  {formatCurrency(initial.total)}
                </dd>
              </div>
              <div>
                <dt className="text-text-secondary dark:text-zinc-500">Issued</dt>
                <dd className="mt-1 text-text-primary dark:text-zinc-200">
                  {initial.issuedAt || "—"}
                </dd>
              </div>
            </dl>
          </div>
        </aside>
      </div>
    </div>
  );
}
