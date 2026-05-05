"use client";

import { useState } from "react";
import { Download, Loader2, Mail, Save } from "lucide-react";

export default function ProposalActionsBar({
  proposalId,
  recipientEmail,
  busySave,
  disabled,
  onSaveDraft,
  onMarkFinal,
  onSendEmail,
  /** Persist current editor state (e.g. Spanish body) before PDF is built from the server. */
  onBeforePdf,
}: {
  proposalId: string;
  recipientEmail?: string | null;
  busySave?: boolean;
  disabled?: boolean;
  onSaveDraft: () => Promise<void> | void;
  onMarkFinal: () => Promise<void> | void;
  onSendEmail?: () => Promise<void> | void;
  onBeforePdf?: () => Promise<void>;
}) {
  const [busyPdf, setBusyPdf] = useState(false);
  const [busySend, setBusySend] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function downloadPdf() {
    if (!proposalId) return;
    setErr(null);
    setBusyPdf(true);
    try {
      if (onBeforePdf) {
        await onBeforePdf();
      }
      const res = await fetch("/api/crm/sales-proposal-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ proposalId }),
      });
      if (!res.ok) {
        const t = await res.text();
        let msg = `PDF failed (${res.status})`;
        try {
          const j = JSON.parse(t) as { error?: string };
          if (j.error) msg = j.error;
        } catch {
          msg = t.slice(0, 200) || msg;
        }
        throw new Error(msg);
      }
      const disposition = res.headers.get("Content-Disposition");
      const fname =
        disposition?.match(/filename="([^"]+)"/)?.[1] ??
        `proposal-${proposalId.slice(0, 8)}.pdf`;
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fname;
      a.rel = "noopener";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "PDF export failed.");
    } finally {
      setBusyPdf(false);
    }
  }

  async function sendEmail() {
    if (!onSendEmail) return;
    setErr(null);
    setBusySend(true);
    try {
      await onSendEmail();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not send proposal email.");
    } finally {
      setBusySend(false);
    }
  }

  return (
    <div className="rounded-2xl border border-border bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
      {err ? (
        <p className="mb-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-800 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200">
          {err}
        </p>
      ) : null}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={disabled || busySave}
          onClick={() => void onSaveDraft()}
          className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {busySave ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save draft
        </button>
        <button
          type="button"
          disabled={disabled || busySave}
          onClick={() => void onMarkFinal()}
          className="rounded-xl border border-border px-4 py-2 text-sm font-semibold dark:border-zinc-700"
        >
          Mark final
        </button>
        <button
          type="button"
          disabled={disabled || busyPdf}
          onClick={() => void downloadPdf()}
          className="inline-flex items-center gap-2 rounded-xl border border-emerald-600 bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {busyPdf ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          Download PDF
        </button>
        {onSendEmail ? (
          <button
            type="button"
            disabled={disabled || busySend || !recipientEmail?.trim()}
            onClick={() => void sendEmail()}
            title={
              recipientEmail?.trim()
                ? `Send to ${recipientEmail}`
                : "Add an email to the linked lead/client first."
            }
            className="inline-flex items-center gap-2 rounded-xl border border-text-primary bg-text-primary px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-45 dark:border-white dark:bg-white dark:text-zinc-950"
          >
            {busySend ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
            Send via email
          </button>
        ) : null}
      </div>
      {recipientEmail ? (
        <p className="mt-2 text-[11px] text-text-secondary">Recipient: {recipientEmail}</p>
      ) : onSendEmail ? (
        <p className="mt-2 text-[11px] text-text-secondary">
          Email sending needs a linked lead/client email.
        </p>
      ) : null}
    </div>
  );
}
