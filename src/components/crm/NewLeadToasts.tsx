"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Sparkles, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";

type LeadInsertRow = {
  id: string;
  name: string | null;
  source: string | null;
  organization_id: string | null;
  created_at: string | null;
};

type ToastEntry = {
  id: string;
  leadId: string;
  name: string;
  source: string;
};

const TOAST_TTL_MS = 12_000;
const MAX_VISIBLE = 4;

/**
 * Mount in the CRM shell. Subscribes to `INSERT` events on `public.lead` and
 * renders an in-app toast for each new row. RLS scopes the realtime stream to
 * the user's own organization (and, for non-admin staff, their owned rows).
 *
 * This is the in-app channel for new-lead notifications — email and SMS are
 * separately dispatched server-side from the webhook via `notifyNewLead()`.
 */
export default function NewLeadToasts() {
  const [toasts, setToasts] = useState<ToastEntry[]>([]);
  const seenIdsRef = useRef<Set<string>>(new Set());
  const initialMountRef = useRef<number>(Date.now());

  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    const supabase = createClient();
    const channel = supabase
      .channel(`new-lead-toasts-${Math.random().toString(36).slice(2)}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "lead" },
        (payload) => {
          const row = payload.new as Partial<LeadInsertRow> | null;
          if (!row?.id) return;
          if (seenIdsRef.current.has(row.id)) return;
          if (row.created_at) {
            const created = new Date(row.created_at).getTime();
            if (!Number.isNaN(created) && created < initialMountRef.current - 5000) {
              return;
            }
          }
          seenIdsRef.current.add(row.id);
          const entry: ToastEntry = {
            id: `${row.id}-${Date.now()}`,
            leadId: row.id,
            name: row.name?.trim() || "(no name)",
            source: row.source?.trim() || "New source",
          };
          setToasts((prev) => [entry, ...prev].slice(0, MAX_VISIBLE));
          window.setTimeout(() => {
            setToasts((prev) => prev.filter((t) => t.id !== entry.id));
          }, TOAST_TTL_MS);
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div
      className="pointer-events-none fixed right-4 top-4 z-[60] flex w-full max-w-sm flex-col gap-2 sm:right-6 sm:top-6"
      role="region"
      aria-live="polite"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          className="pointer-events-auto flex items-start gap-3 rounded-2xl border border-border bg-white p-3.5 shadow-lg ring-1 ring-black/5 dark:border-zinc-700 dark:bg-zinc-900 dark:ring-white/10"
          role="status"
        >
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
            aria-hidden
          >
            <Sparkles className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium uppercase tracking-wide text-text-secondary dark:text-zinc-400">
              New lead • {t.source}
            </p>
            <p className="mt-0.5 truncate text-sm font-semibold text-text-primary dark:text-zinc-100">
              {t.name}
            </p>
            <Link
              href={`/leads/${t.leadId}`}
              className="mt-1 inline-block text-xs font-semibold text-accent hover:underline"
            >
              Open in CRM
            </Link>
          </div>
          <button
            type="button"
            onClick={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))}
            className="rounded-lg p-1 text-text-secondary transition-colors hover:bg-surface hover:text-text-primary dark:text-zinc-500 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>
      ))}
    </div>
  );
}
