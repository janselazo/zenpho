"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, UserPlus } from "lucide-react";

type Member = { id: string; name: string };

type Props = {
  memberId: string | null;
  members: Member[];
  /** Shown in aria-label and native title; e.g. project or task title */
  ariaSubject: string;
  /** Browser `title` when nobody is assigned (e.g. "Assign project") */
  unassignedHint?: string;
  disabled?: boolean;
  onAssign: (memberId: string | null) => void;
};

/**
 * Assignee control used on Product “Project Features” rows and Tasks table rows:
 * pill with avatar/initials or User+ badge, label, chevron.
 */
export function ProductRowAssigneePicker({
  memberId,
  members,
  ariaSubject,
  unassignedHint = "Assign",
  disabled = false,
  onAssign,
}: Props) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const assigned = memberId ? members.find((m) => m.id === memberId) : undefined;
  const displayName = assigned?.name ?? null;

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  return (
    <div className="relative min-w-0" ref={wrapRef}>
      <button
        type="button"
        disabled={disabled}
        aria-expanded={open}
        aria-haspopup="listbox"
        title={displayName ? `Assignee: ${displayName}` : unassignedHint}
        aria-label={`Assignee for ${ariaSubject}`}
        onClick={() => !disabled && setOpen((o) => !o)}
        className={`flex h-8 w-full min-w-0 items-center justify-center gap-1.5 overflow-hidden rounded-lg border px-2 text-xs font-medium transition-colors disabled:cursor-wait disabled:opacity-60 ${
          displayName
            ? "border-border bg-white text-text-primary shadow-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
            : "border-transparent text-text-secondary hover:border-border hover:bg-white hover:text-text-primary dark:text-zinc-500 dark:hover:border-zinc-700 dark:hover:bg-zinc-900 dark:hover:text-zinc-200"
        }`}
      >
        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-[10px] font-bold text-zinc-500 ring-1 ring-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:ring-zinc-700">
          {displayName ? (
            displayName.slice(0, 2).toUpperCase()
          ) : (
            <UserPlus className="h-3.5 w-3.5" aria-hidden />
          )}
        </span>
        <span className="min-w-0 truncate">{displayName ?? "Assign"}</span>
        <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-60" aria-hidden />
      </button>
      {open ? (
        <div
          role="listbox"
          className="absolute left-0 top-full z-[70] mt-1 max-h-64 w-56 overflow-y-auto rounded-xl border border-border bg-white py-1 shadow-lg dark:border-zinc-700 dark:bg-zinc-950"
        >
          <button
            type="button"
            role="option"
            className="flex w-full items-center justify-between px-3 py-2 text-left text-sm text-text-primary hover:bg-surface/80 dark:text-zinc-100 dark:hover:bg-zinc-800"
            onClick={() => {
              onAssign(null);
              setOpen(false);
            }}
          >
            Unassigned
            {!memberId ? (
              <Check className="h-4 w-4 shrink-0 text-accent" aria-hidden />
            ) : null}
          </button>
          {members.length === 0 ? (
            <p className="border-t border-border px-3 py-2 text-xs text-text-secondary dark:border-zinc-700 dark:text-zinc-500">
              No people on the roster. Open <strong>Team</strong> and add
              members first.
            </p>
          ) : (
            members.map((m) => (
              <button
                key={m.id}
                type="button"
                role="option"
                className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm text-text-primary hover:bg-surface/80 dark:text-zinc-100 dark:hover:bg-zinc-800"
                onClick={() => {
                  onAssign(m.id);
                  setOpen(false);
                }}
              >
                <span className="min-w-0 truncate">{m.name}</span>
                {memberId === m.id ? (
                  <Check className="h-4 w-4 shrink-0 text-accent" aria-hidden />
                ) : null}
              </button>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}
