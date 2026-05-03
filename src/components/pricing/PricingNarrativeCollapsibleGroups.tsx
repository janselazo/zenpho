"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import type { PackageIncludeGroup } from "@/lib/marketing/local-service-package-narratives";

function CollapsibleGroup({
  title,
  defaultOpen = true,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="border-b border-border/60 last:border-b-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-2 bg-surface/65 px-3 py-2.5 text-left text-xs font-bold uppercase tracking-[0.18em] text-text-primary transition-colors hover:bg-surface/80 dark:bg-zinc-800/40 dark:hover:bg-zinc-800/60"
      >
        <span className="leading-snug">{title}</span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-text-secondary transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          aria-hidden
        />
      </button>
      {open ? (
        <div className="border-t border-border/50 bg-white px-3 py-3 dark:border-zinc-700/60 dark:bg-zinc-900/25">
          {children}
        </div>
      ) : null}
    </div>
  );
}

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <li key={item} className="flex gap-2.5 text-sm leading-relaxed text-text-secondary">
          <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" aria-hidden />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

export function PricingNarrativeCollapsibleGroups({
  groups,
  className = "mt-6",
}: {
  groups: PackageIncludeGroup[];
  className?: string;
}) {
  return (
    <div className={`overflow-hidden rounded-lg border border-border/60 ${className}`}>
      {groups.map((g, i) => (
        <CollapsibleGroup key={`${g.heading}-${i}`} title={g.heading} defaultOpen>
          <BulletList items={g.items} />
        </CollapsibleGroup>
      ))}
    </div>
  );
}

export function PricingNarrativeCollapsiblePlatform({
  title,
  lines,
  className = "mt-6",
}: {
  title: string;
  lines: string[];
  className?: string;
}) {
  return (
    <div className={`overflow-hidden rounded-lg border border-border/60 ${className}`}>
      <CollapsibleGroup title={title} defaultOpen>
        <ul className="space-y-2">
          {lines.map((line) => (
            <li key={line} className="flex gap-2.5 text-xs leading-relaxed text-text-secondary">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" aria-hidden />
              <span>{line}</span>
            </li>
          ))}
        </ul>
      </CollapsibleGroup>
    </div>
  );
}
