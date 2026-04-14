"use client";

import type { LucideIcon } from "lucide-react";
import { Bell, Construction } from "lucide-react";

export interface ProspectingPendingContentProps {
  title: string;
  description: string;
  features: string[];
  icon: LucideIcon;
  /** Default: page-style H1. Use `tab` for tab panels or nested sections. */
  titleLevel?: "page" | "tab";
}

/**
 * Shared “Landing Pages” pending UI: icon + badge, title, description, feature cards, CTA, footer.
 */
export default function ProspectingPendingContent({
  title,
  description,
  features,
  icon: MainIcon,
  titleLevel = "page",
}: ProspectingPendingContentProps) {
  const TitleTag = titleLevel === "page" ? "h1" : "h2";
  const titleClass =
    titleLevel === "page"
      ? "heading-display text-2xl font-bold text-text-primary dark:text-zinc-100"
      : "heading-display text-xl font-bold text-text-primary dark:text-zinc-100 sm:text-2xl";

  return (
    <div className="mx-auto max-w-lg px-4 py-6 text-center sm:py-10">
      <div className="relative mx-auto mb-5 flex h-16 w-16 items-center justify-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/10 text-accent dark:bg-blue-500/15 dark:text-blue-400">
          <MainIcon className="h-7 w-7" strokeWidth={1.5} aria-hidden />
        </div>
        <span
          className="absolute -right-1 -top-1 flex h-7 w-7 items-center justify-center rounded-full bg-amber-100 text-amber-800 dark:bg-amber-500/25 dark:text-amber-200"
          title="In development"
        >
          <Construction className="h-4 w-4" aria-hidden />
        </span>
      </div>
      <TitleTag className={titleClass}>{title}</TitleTag>
      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-text-secondary dark:text-zinc-400">
        {description}
      </p>
      <ul className="mt-8 space-y-3 text-left">
        {features.map((text) => (
          <li
            key={text}
            className="flex gap-3 rounded-2xl border border-border bg-white px-4 py-3 text-sm text-text-primary shadow-sm ring-1 ring-black/[0.02] dark:border-zinc-800/80 dark:bg-zinc-900/40 dark:text-zinc-200 dark:ring-white/[0.04]"
          >
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent/10 dark:bg-blue-500/15">
              <span className="h-2 w-2 rounded-full bg-accent dark:bg-blue-400" />
            </span>
            <span>{text}</span>
          </li>
        ))}
      </ul>
      <button
        type="button"
        className="mt-8 inline-flex items-center justify-center gap-2 rounded-full border border-border bg-white px-6 py-3 text-sm font-semibold text-text-primary shadow-sm transition-colors hover:bg-surface dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
        onClick={() => {
          window.location.href =
            "mailto:hello@zenpho.com?subject=Prospecting%20module%20interest";
        }}
      >
        <Bell className="h-4 w-4 opacity-70" aria-hidden />
        Notify me when it&apos;s ready
      </button>
      <p className="mt-6 text-xs text-text-secondary/70 dark:text-zinc-500">
        Part of AI Product Studio · Coming soon
      </p>
    </div>
  );
}
