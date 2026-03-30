"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  Circle,
  CircleDashed,
  Clock,
  Eye,
  Layers,
  Loader2,
  Rocket,
  Search,
  TestTube2,
} from "lucide-react";
import type { ChildDeliveryStatus } from "@/lib/crm/product-project-metadata";

export type StatusMenuGroup = {
  id: string;
  kind: "builtin" | "custom";
  builtinKey: ChildDeliveryStatus | null;
  presentation: {
    label: string;
    labelUpper: string;
    color: string;
    foreground: string;
  };
};

function sectionKey(g: StatusMenuGroup): string {
  if (g.kind === "custom") return "custom";
  const k = g.builtinKey;
  if (!k) return "active";
  if (k === "backlog" || k === "planned") return "not_started";
  if (k === "production") return "complete";
  return "active";
}

const SECTION_LABEL: Record<string, string> = {
  not_started: "Not started",
  active: "Active",
  complete: "Complete",
  custom: "Custom",
};

function BuiltinMenuIcon({
  status,
  accent,
}: {
  status: ChildDeliveryStatus;
  accent: string;
}) {
  switch (status) {
    case "backlog":
      return (
        <span className="flex h-7 w-7 items-center justify-center" aria-hidden>
          <CircleDashed className="h-4 w-4" style={{ color: accent }} />
        </span>
      );
    case "planned":
      return (
        <span className="flex h-7 w-7 items-center justify-center" aria-hidden>
          <Circle className="h-4 w-4" style={{ color: accent }} />
        </span>
      );
    case "in_progress":
      return (
        <span className="flex h-7 w-7 items-center justify-center" aria-hidden>
          <span className="relative flex h-4 w-4" style={{ color: accent }}>
            <svg viewBox="0 0 16 16" className="h-4 w-4">
              <circle
                cx="8"
                cy="8"
                r="6"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              />
              <path
                d="M 8 2 A 6 6 0 0 1 8 14"
                fill="currentColor"
                opacity={0.55}
              />
            </svg>
          </span>
        </span>
      );
    case "in_review":
      return (
        <span className="flex h-7 w-7 items-center justify-center" aria-hidden>
          <Eye className="h-4 w-4" style={{ color: accent }} />
        </span>
      );
    case "testing":
      return (
        <span className="flex h-7 w-7 items-center justify-center" aria-hidden>
          <TestTube2 className="h-4 w-4" style={{ color: accent }} />
        </span>
      );
    case "production":
      return (
        <span className="flex h-7 w-7 items-center justify-center" aria-hidden>
          <Rocket className="h-4 w-4" style={{ color: accent }} />
        </span>
      );
    default:
      return null;
  }
}

function CustomMenuIcon({ accent }: { accent: string }) {
  return (
    <span className="flex h-7 w-7 items-center justify-center" aria-hidden>
      <Layers className="h-4 w-4" style={{ color: accent }} />
    </span>
  );
}

type Props = {
  open: boolean;
  anchorEl: HTMLElement | null;
  groups: StatusMenuGroup[];
  currentGroupId: string;
  applying: boolean;
  onClose: () => void;
  onSelect: (groupId: string) => void;
};

export default function ProductChildProjectStatusMenu({
  open,
  anchorEl,
  groups,
  currentGroupId,
  applying,
  onClose,
  onSelect,
}: Props) {
  const [search, setSearch] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [placement, setPlacement] = useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return groups;
    return groups.filter(
      (g) =>
        g.presentation.label.toLowerCase().includes(q) ||
        g.presentation.labelUpper.toLowerCase().includes(q)
    );
  }, [groups, search]);

  useEffect(() => {
    if (!open) {
      setSearch("");
      setPlacement(null);
      return;
    }
    const el = anchorEl;
    if (!el) return;

    function place() {
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const width = 288;
      const margin = 8;
      let left = rect.left;
      if (left + width > window.innerWidth - margin) {
        left = window.innerWidth - width - margin;
      }
      if (left < margin) left = margin;
      const maxH = Math.min(window.innerHeight * 0.72, 440);
      let top = rect.bottom + 6;
      if (top + maxH > window.innerHeight - margin) {
        top = Math.max(margin, rect.top - maxH - 6);
      }
      setPlacement({ top, left, width });
    }

    place();
    window.addEventListener("scroll", place, true);
    window.addEventListener("resize", place);
    const t = requestAnimationFrame(() => searchRef.current?.focus());
    return () => {
      window.removeEventListener("scroll", place, true);
      window.removeEventListener("resize", place);
      cancelAnimationFrame(t);
    };
  }, [open, anchorEl]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      const t = e.target as Node;
      if (anchorEl?.contains(t)) return;
      if (menuRef.current?.contains(t)) return;
      onClose();
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open, onClose, anchorEl]);

  const rowModels = useMemo(() => {
    const out: { group: StatusMenuGroup; showHeader: boolean }[] = [];
    let last: string | null = null;
    for (const g of filtered) {
      const sec = sectionKey(g);
      out.push({ group: g, showHeader: sec !== last });
      last = sec;
    }
    return out;
  }, [filtered]);

  if (!open || !placement) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-[70] bg-black/20 dark:bg-black/40"
        aria-hidden
        onClick={onClose}
      />
      <div
        ref={menuRef}
        role="dialog"
        aria-label="Change project status"
        className="fixed z-[80] flex max-h-[min(72vh,440px)] flex-col overflow-hidden rounded-xl border border-border bg-white shadow-xl dark:border-zinc-700 dark:bg-zinc-950"
        style={{
          top: placement.top,
          left: placement.left,
          width: placement.width,
        }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="shrink-0 border-b border-border px-2 py-2 dark:border-zinc-800">
          <div className="mb-2 flex items-center justify-center gap-2 rounded-lg bg-surface/80 p-0.5 dark:bg-zinc-900">
            <div
              className="flex flex-1 items-center justify-center gap-2 rounded-md bg-white px-3 py-1.5 text-xs font-semibold text-text-primary shadow-sm dark:bg-zinc-800 dark:text-zinc-100"
              role="tab"
              aria-selected
            >
              {applying ? (
                <Loader2
                  className="h-3.5 w-3.5 shrink-0 animate-spin text-accent dark:text-violet-400"
                  aria-hidden
                />
              ) : null}
              Status
            </div>
          </div>
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-secondary dark:text-zinc-500" />
            <input
              ref={searchRef}
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search…"
              className="w-full rounded-lg border border-border bg-white py-2 pl-8 pr-3 text-sm text-text-primary placeholder:text-text-secondary focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/30 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-violet-500 dark:focus:ring-violet-500/30"
            />
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-1 py-1">
          {filtered.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-text-secondary dark:text-zinc-500">
              No statuses match “{search.trim()}”.
            </p>
          ) : (
            <ul className="space-y-0.5" role="listbox">
              {rowModels.map(({ group: g, showHeader }) => {
                const sec = sectionKey(g);
                const selected = g.id === currentGroupId;
                const accent = g.presentation.color;

                return (
                  <li key={g.id} className="list-none">
                    {showHeader ? (
                      <div className="flex items-center justify-between px-2 pb-1 pt-2 first:pt-1">
                        <span className="text-[10px] font-semibold uppercase tracking-wide text-text-secondary dark:text-zinc-500">
                          {SECTION_LABEL[sec] ?? sec}
                        </span>
                      </div>
                    ) : null}
                    <button
                      type="button"
                      role="option"
                      aria-selected={selected}
                      disabled={applying}
                      onClick={() => {
                        if (g.id === currentGroupId) {
                          onClose();
                          return;
                        }
                        onSelect(g.id);
                      }}
                      className={`flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm transition-colors disabled:opacity-60 ${
                        selected
                          ? "bg-surface/90 dark:bg-zinc-800/90"
                          : "hover:bg-surface/70 dark:hover:bg-zinc-800/60"
                      }`}
                    >
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface/60 dark:bg-zinc-800/80">
                        {g.kind === "builtin" && g.builtinKey ? (
                          <BuiltinMenuIcon
                            status={g.builtinKey}
                            accent={accent}
                          />
                        ) : (
                          <CustomMenuIcon accent={accent} />
                        )}
                      </span>
                      <span className="min-w-0 flex-1 font-semibold tracking-wide text-text-primary dark:text-zinc-100">
                        {g.presentation.labelUpper}
                      </span>
                      {selected ? (
                        <Check
                          className="h-4 w-4 shrink-0 text-text-primary dark:text-zinc-100"
                          aria-hidden
                        />
                      ) : null}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </>
  );
}
