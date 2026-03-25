"use client";

import Link from "next/link";
import { ExternalLink } from "lucide-react";

/**
 * Empty state: connect accounts (Settings) — OAuth wiring comes in a later phase.
 */
export default function SocialMediaProspectingPlaceholder() {
  return (
    <div className="rounded-2xl border border-border bg-white p-8 shadow-sm dark:border-zinc-800/80 dark:bg-zinc-900/40 dark:shadow-none sm:p-10">
      <div className="flex flex-col gap-10 lg:flex-row lg:items-center lg:justify-between">
        <div className="max-w-md lg:flex-1">
          <h2 className="text-lg font-semibold text-text-primary dark:text-zinc-100">
            Connect your channels
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-text-secondary dark:text-zinc-400">
            When integrations are enabled, you&apos;ll post to LinkedIn, X, and
            other B2B-relevant networks from one place. Connect accounts in
            Settings to get started.
          </p>
        </div>
        <div className="flex flex-1 flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-surface/40 px-6 py-10 dark:border-zinc-700 dark:bg-zinc-800/20">
          <div className="flex flex-wrap justify-center gap-3">
            {[
              { bg: "bg-blue-100 dark:bg-blue-950/50", label: "in", abbr: "Li" },
              { bg: "bg-sky-100 dark:bg-sky-950/50", label: "X", abbr: "X" },
              { bg: "bg-violet-100 dark:bg-violet-950/50", label: "Meta", abbr: "M" },
              { bg: "bg-red-100 dark:bg-red-950/50", label: "YT", abbr: "▶" },
            ].map((p) => (
              <div
                key={p.label}
                className={`flex h-12 w-12 items-center justify-center rounded-xl text-sm font-bold text-text-primary ${p.bg} dark:text-zinc-200`}
                aria-hidden
              >
                {p.abbr}
              </div>
            ))}
          </div>
          <p className="mt-5 text-center text-sm font-semibold text-text-primary dark:text-zinc-100">
            Connect your social accounts
          </p>
          <p className="mx-auto mt-2 max-w-xs text-center text-xs text-text-secondary dark:text-zinc-500">
            OAuth and posting will live here. Use Settings to prepare API keys
            and workspace defaults.
          </p>
          <Link
            href="/settings"
            className="mt-6 inline-flex items-center gap-2 rounded-full border border-border bg-white px-5 py-2.5 text-sm font-semibold text-text-primary transition-colors hover:bg-surface dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
          >
            <ExternalLink className="h-4 w-4 opacity-70" aria-hidden />
            Go to Settings
          </Link>
        </div>
      </div>
    </div>
  );
}
