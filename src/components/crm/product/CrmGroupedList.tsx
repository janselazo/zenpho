"use client";

import { ChevronDown, ChevronRight, Plus } from "lucide-react";
import { useState } from "react";

export type CrmListGroup<T> = {
  id: string;
  label: string;
  items: T[];
};

type Props<T> = {
  groups: CrmListGroup<T>[];
  renderRow: (item: T) => React.ReactNode;
  getItemKey: (item: T) => string;
  emptyLabel?: string;
  onAddToGroup?: (groupId: string) => void;
  addLabel?: string;
};

export default function CrmGroupedList<T>({
  groups,
  renderRow,
  getItemKey,
  emptyLabel = "Nothing here yet.",
  onAddToGroup,
  addLabel = "Add",
}: Props<T>) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  return (
    <div className="rounded-xl border border-border bg-white dark:border-zinc-800 dark:bg-zinc-950/40">
      {groups.map((g) => {
        const isCollapsed = collapsed[g.id] === true;
        const count = g.items.length;
        return (
          <div key={g.id} className="border-b border-border last:border-b-0 dark:border-zinc-800/80">
            <div className="flex items-center gap-2 bg-surface/50 px-3 py-2 dark:bg-zinc-900/60">
              <button
                type="button"
                aria-expanded={!isCollapsed}
                onClick={() =>
                  setCollapsed((c) => ({ ...c, [g.id]: !isCollapsed }))
                }
                className="flex min-w-0 flex-1 items-center gap-2 text-left text-sm font-medium text-text-primary dark:text-zinc-200"
              >
                {isCollapsed ? (
                  <ChevronRight className="h-4 w-4 shrink-0 text-text-secondary" aria-hidden />
                ) : (
                  <ChevronDown className="h-4 w-4 shrink-0 text-text-secondary" aria-hidden />
                )}
                <span className="truncate">{g.label}</span>
                <span className="shrink-0 text-xs font-normal text-text-secondary dark:text-zinc-500">
                  {count}
                </span>
              </button>
              {onAddToGroup ? (
                <button
                  type="button"
                  onClick={() => onAddToGroup(g.id)}
                  className="inline-flex items-center gap-1 rounded-lg border border-border px-2 py-1 text-xs font-medium text-text-secondary transition-colors hover:bg-white dark:border-zinc-700 dark:hover:bg-zinc-800"
                >
                  <Plus className="h-3.5 w-3.5" aria-hidden />
                  {addLabel}
                </button>
              ) : null}
            </div>
            {!isCollapsed ? (
              <ul className="divide-y divide-border p-0 dark:divide-zinc-800/80">
                {count === 0 ? (
                  <li className="px-4 py-6 text-center text-sm text-text-secondary dark:text-zinc-500">
                    {emptyLabel}
                  </li>
                ) : (
                  g.items.map((item) => (
                    <li key={getItemKey(item)} className="list-none">
                      {renderRow(item)}
                    </li>
                  ))
                )}
              </ul>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
