"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { createSalesProposalDraft } from "@/app/(crm)/actions/sales-proposals";

/**
 * Creates a proposal row client-side then navigates with ?proposal=.
 * Avoids invoking the server action during RSC render (revalidatePath + redirect),
 * which can surface as opaque 500s on Vercel.
 */
export default function ProposalDraftBootstrap() {
  const router = useRouter();
  const [err, setErr] = useState<string | null>(null);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    let cancelled = false;
    (async () => {
      const res = await createSalesProposalDraft({});
      if (cancelled) return;
      if ("error" in res && res.error) {
        setErr(res.error);
        return;
      }
      const id = "id" in res && res.id ? res.id : null;
      if (!id) {
        setErr("Could not create a draft proposal.");
        return;
      }
      router.replace(`/proposals/new?proposal=${encodeURIComponent(id)}`);
      router.refresh();
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  if (err) {
    return (
      <div className="mx-auto max-w-lg">
        <h1 className="heading-display text-2xl font-bold text-text-primary dark:text-zinc-100">
          Proposal generation
        </h1>
        <p className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
          {err}
        </p>
        <Link
          href="/proposals"
          className="mt-6 inline-block text-sm font-semibold text-accent underline underline-offset-2"
        >
          Back to proposals
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-md flex-col items-center justify-center py-24 text-center">
      <Loader2
        className="h-10 w-10 animate-spin text-accent"
        aria-hidden
      />
      <p className="mt-4 text-sm text-text-secondary dark:text-zinc-400">
        Creating draft…
      </p>
      <p className="mt-2 text-xs text-text-secondary dark:text-zinc-500">
        You&apos;ll jump to lead selection next.
      </p>
    </div>
  );
}
