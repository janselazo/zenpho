"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Search, Tag, X } from "lucide-react";

type Props = {
  value: string;
  onChange: (next: string) => void;
  suggestions: readonly string[];
  placeholder?: string;
  "aria-label"?: string;
};

export default function PlacesCategoryAutocomplete({
  value,
  onChange,
  suggestions,
  placeholder = "e.g. hair salon, gym, auto repair",
  "aria-label": ariaLabel = "Business category",
}: Props) {
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    const q = value.trim().toLowerCase();
    if (!q) return [...suggestions].slice(0, 14);
    const tokens = q.split(/\s+/).filter(Boolean);
    const list = suggestions.filter((s) => {
      const sl = s.toLowerCase();
      return tokens.every((t) => sl.includes(t));
    });
    return list.slice(0, 14);
  }, [value, suggestions]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const pick = useCallback(
    (s: string) => {
      onChange(s);
      setOpen(false);
      inputRef.current?.focus();
    },
    [onChange]
  );

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (!open || filtered.length === 0) {
        if (e.key === "ArrowDown" && filtered.length > 0) {
          setOpen(true);
          setHighlighted(0);
        }
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setHighlighted((i) => (i + 1) % filtered.length);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setHighlighted((i) => (i - 1 + filtered.length) % filtered.length);
      } else if (e.key === "Enter") {
        e.preventDefault();
        pick(filtered[highlighted] ?? filtered[0]);
      } else if (e.key === "Escape") {
        setOpen(false);
      }
    },
    [open, filtered, highlighted, pick]
  );

  const showList = open && filtered.length > 0;

  return (
    <div ref={wrapRef} className="relative">
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary/70 dark:text-zinc-500"
          aria-hidden
        />
        <input
          ref={inputRef}
          type="text"
          value={value}
          aria-label={ariaLabel}
          aria-expanded={showList}
          aria-controls="prospect-category-suggestions"
          aria-autocomplete="list"
          placeholder={placeholder}
          onChange={(e) => {
            onChange(e.target.value);
            setOpen(true);
            setHighlighted(0);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          className="w-full rounded-full border border-border bg-white py-2.5 pl-10 pr-10 text-sm text-text-primary shadow-sm outline-none transition-[box-shadow,border-color] placeholder:text-text-secondary/50 focus:border-accent focus:ring-2 focus:ring-accent/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-blue-500 dark:focus:ring-blue-500/20"
        />
        {value ? (
          <button
            type="button"
            aria-label="Clear category"
            className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-text-secondary hover:bg-surface hover:text-text-primary dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              onChange("");
              setOpen(true);
              inputRef.current?.focus();
            }}
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      {showList ? (
        <div className="absolute left-0 right-0 z-50 mt-2 w-full max-w-full sm:max-w-2xl">
          <div className="relative rounded-2xl border border-border bg-white py-1.5 text-text-primary shadow-xl ring-1 ring-black/5 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100 dark:ring-white/10">
            <div
              className="absolute -top-1.5 left-8 h-3 w-3 -translate-x-1/2 rotate-45 border-l border-t border-border bg-white dark:border-zinc-800 dark:bg-zinc-950"
              aria-hidden
            />
            <ul
              id="prospect-category-suggestions"
              role="listbox"
              className="relative max-h-72 overflow-auto px-1"
            >
              {filtered.map((s, i) => (
                <li key={s} role="presentation">
                  <button
                    type="button"
                    role="option"
                    aria-selected={i === highlighted}
                    className={`flex w-full items-start gap-3 rounded-xl px-2.5 py-2.5 text-left transition-colors ${
                      i === highlighted
                        ? "bg-surface dark:bg-white/10"
                        : "hover:bg-surface/70 dark:hover:bg-white/5"
                    }`}
                    onMouseEnter={() => setHighlighted(i)}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => pick(s)}
                  >
                    <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface text-text-secondary dark:bg-zinc-800/80 dark:text-zinc-300">
                      <Tag className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[11px] font-medium uppercase tracking-wide text-text-secondary dark:text-zinc-500">
                        Category
                      </span>
                      <span className="mt-0.5 block text-sm font-semibold text-text-primary dark:text-white">
                        {s}
                      </span>
                      <span className="mt-0.5 block text-xs text-text-secondary dark:text-zinc-400">
                        Optional city narrows Text Search results
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}
    </div>
  );
}
