"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Building2, Loader2, MapPin, X } from "lucide-react";
import type { PlacesSearchPlace } from "@/lib/crm/places-types";

const DEBOUNCE_MS = 320;

type Suggestion = { placeId: string; description: string };

type Props = {
  value: string;
  onChange: (v: string) => void;
  /** Optional text appended server-side to bias predictions (e.g. city). */
  cityHint: string;
  onPlaceResolved: (place: PlacesSearchPlace) => void;
  disabled?: boolean;
  /** Override default rounded-full input chrome (e.g. lead form uses `rounded-lg`). */
  inputClassName?: string;
  /** Omit the leading Building2 icon (e.g. when the parent row already shows one). */
  hideLeadingIcon?: boolean;
  listboxId?: string;
  placeholder?: string;
  /** Subline under each suggestion; prospecting copy by default. */
  suggestionSubcopy?: string;
};

export default function PlacesBusinessAutocomplete({
  value,
  onChange,
  cityHint,
  onPlaceResolved,
  disabled = false,
  inputClassName,
  hideLeadingIcon = false,
  listboxId = "prospect-business-google-suggestions",
  placeholder = "Start typing a business name — pick from Google suggestions",
  suggestionSubcopy = "Select to open the market intelligence report",
}: Props) {
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(0);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [hint, setHint] = useState<string | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const seqRef = useRef(0);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const runAutocomplete = useCallback(
    async (input: string) => {
      const q = input.trim();
      if (q.length < 2) {
        setSuggestions([]);
        setSuggestLoading(false);
        return;
      }
      const seq = ++seqRef.current;
      setSuggestLoading(true);
      setHint(null);
      try {
        const res = await fetch("/api/prospecting/places-autocomplete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            input: q,
            cityHint: cityHint.trim() || undefined,
          }),
        });
        const data = (await res.json()) as {
          suggestions?: Suggestion[];
          warning?: string;
        };
        if (seq !== seqRef.current) return;
        setSuggestions(Array.isArray(data.suggestions) ? data.suggestions : []);
        if (data.warning) setHint(data.warning);
      } catch {
        if (seq !== seqRef.current) return;
        setSuggestions([]);
        setHint("Could not load suggestions.");
      } finally {
        if (seq === seqRef.current) setSuggestLoading(false);
      }
    },
    [cityHint]
  );

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const q = value.trim();
    if (q.length < 2) {
      setSuggestions([]);
      setSuggestLoading(false);
      return;
    }
    debounceRef.current = setTimeout(() => {
      void runAutocomplete(q);
    }, DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [value, runAutocomplete]);

  const pick = useCallback(
    async (s: Suggestion) => {
      onChange(s.description);
      setOpen(false);
      setDetailsLoading(true);
      setHint(null);
      try {
        const res = await fetch("/api/prospecting/places-details", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ placeId: s.placeId }),
        });
        const data = (await res.json()) as {
          place?: PlacesSearchPlace | null;
          warning?: string;
        };
        if (data.warning) setHint(data.warning);
        const place = data.place;
        if (place?.id && place?.name) {
          onPlaceResolved({
            ...place,
            businessStatus: place.businessStatus ?? null,
          });
        } else if (!data.warning) {
          setHint("Could not load this place from Google.");
        }
      } catch {
        setHint("Could not load place details.");
      } finally {
        setDetailsLoading(false);
        inputRef.current?.blur();
      }
    },
    [onChange, onPlaceResolved]
  );

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (detailsLoading) {
        e.preventDefault();
        return;
      }
      const list = suggestions;
      if (!open || list.length === 0) {
        if (e.key === "ArrowDown" && list.length > 0) {
          setOpen(true);
          setHighlighted(0);
        }
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setHighlighted((i) => (i + 1) % list.length);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setHighlighted((i) => (i - 1 + list.length) % list.length);
      } else if (e.key === "Enter") {
        e.preventDefault();
        const s = list[highlighted] ?? list[0];
        if (s) void pick(s);
      } else if (e.key === "Escape") {
        setOpen(false);
      }
    },
    [open, suggestions, highlighted, pick, detailsLoading]
  );

  const showList = open && (suggestions.length > 0 || suggestLoading);

  const defaultInputClass =
    "w-full rounded-full border border-border bg-white py-2.5 pl-10 pr-10 text-sm text-text-primary shadow-sm outline-none transition-[box-shadow,border-color] placeholder:text-text-secondary/50 focus:border-accent focus:ring-2 focus:ring-accent/20 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-blue-500 dark:focus:ring-blue-500/20";

  const resolvedInputClass =
    inputClassName ??
    defaultInputClass;

  return (
    <div ref={wrapRef} className="relative">
      <div className="relative">
        {!hideLeadingIcon ? (
          <Building2
            className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary/70 dark:text-zinc-500"
            aria-hidden
          />
        ) : null}
        <input
          ref={inputRef}
          type="text"
          value={value}
          disabled={disabled || detailsLoading}
          aria-label="Business name"
          aria-expanded={showList}
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-busy={suggestLoading || detailsLoading}
          placeholder={placeholder}
          onChange={(e) => {
            onChange(e.target.value);
            setOpen(true);
            setHighlighted(0);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          className={resolvedInputClass}
        />
        {detailsLoading || suggestLoading ? (
          <Loader2
            className="pointer-events-none absolute right-10 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-text-secondary dark:text-zinc-500"
            aria-hidden
          />
        ) : null}
        {value && !detailsLoading ? (
          <button
            type="button"
            aria-label="Clear business name"
            className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-text-secondary hover:bg-surface hover:text-text-primary dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              onChange("");
              setSuggestions([]);
              setOpen(true);
              inputRef.current?.focus();
            }}
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      {hint ? (
        <p className="mt-1.5 text-xs text-amber-800 dark:text-amber-200/90" role="status">
          {hint}
        </p>
      ) : null}

      {showList ? (
        <div className="absolute left-0 right-0 z-50 mt-2 w-full max-w-full sm:max-w-2xl">
          <div className="relative rounded-2xl border border-border bg-white py-1.5 text-text-primary shadow-xl ring-1 ring-black/5 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100 dark:ring-white/10">
            <div
              className="absolute -top-1.5 left-8 h-3 w-3 -translate-x-1/2 rotate-45 border-l border-t border-border bg-white dark:border-zinc-800 dark:bg-zinc-950"
              aria-hidden
            />
            <ul
              id={listboxId}
              role="listbox"
              className="relative max-h-72 overflow-auto px-1"
            >
              {suggestLoading && suggestions.length === 0 ? (
                <li className="px-3 py-3 text-sm text-text-secondary dark:text-zinc-400">
                  Searching Google…
                </li>
              ) : null}
              {suggestions.map((s, i) => (
                <li key={s.placeId} role="presentation">
                  <button
                    type="button"
                    role="option"
                    disabled={detailsLoading}
                    aria-selected={i === highlighted}
                    className={`flex w-full items-start gap-3 rounded-xl px-2.5 py-2.5 text-left transition-colors disabled:opacity-50 ${
                      i === highlighted
                        ? "bg-surface dark:bg-white/10"
                        : "hover:bg-surface/70 dark:hover:bg-white/5"
                    }`}
                    onMouseEnter={() => setHighlighted(i)}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => void pick(s)}
                  >
                    <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface text-text-secondary dark:bg-zinc-800/80 dark:text-zinc-300">
                      <MapPin className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[11px] font-medium uppercase tracking-wide text-text-secondary dark:text-zinc-500">
                        Google Places
                      </span>
                      <span className="mt-0.5 block text-sm font-semibold text-text-primary dark:text-white">
                        {s.description}
                      </span>
                      <span className="mt-0.5 block text-xs text-text-secondary dark:text-zinc-400">
                        {suggestionSubcopy}
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
