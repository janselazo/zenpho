"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createSalesProposalDraft } from "@/app/(crm)/actions/sales-proposals";

export default function SalesProposalNewStarter() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function onClick() {
    setMsg(null);
    setBusy(true);
    const res = await createSalesProposalDraft({});
    setBusy(false);
    if ("error" in res && res.error) {
      setMsg(res.error);
      return;
    }
    if ("id" in res && res.id) router.replace(`/proposals/${res.id}`);
  }

  return (
    <div className="mt-12 space-y-4 text-center">
      {msg ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-200">
          {msg}
        </p>
      ) : null}
      <button
        type="button"
        disabled={busy}
        onClick={() => void onClick()}
        className="inline-flex rounded-xl bg-accent px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-accent-hover disabled:opacity-50"
      >
        {busy ? "Creating…" : "Start new proposal"}
      </button>
      <p className="text-xs text-text-secondary dark:text-zinc-500">
        You can attach a client and add catalog services on the next screen.
      </p>
      <Link
        href="/proposals"
        className="block text-sm text-accent underline underline-offset-2"
      >
        Back to proposals
      </Link>
    </div>
  );
}
