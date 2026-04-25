"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { DayPicker, type DateRange } from "react-day-picker";
import {
  Calendar,
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ExternalLink,
  Loader2,
  MapPin,
  Search,
} from "lucide-react";
import "react-day-picker/style.css";
import type { NetworkingEvent } from "@/lib/crm/networking-events";
import {
  crmFormatters,
  crmRangeDayClassNames,
  crmRangeDayModifiers,
  crmRangeRdpCssVars,
} from "@/lib/crm/crm-day-picker-shared";

function toYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function defaultRange(): DateRange {
  const from = new Date();
  from.setHours(0, 0, 0, 0);
  const to = new Date(from);
  to.setDate(to.getDate() + 30);
  return { from, to };
}

function formatRangeButton(range: DateRange | undefined): string {
  if (!range?.from) return "Select dates";
  const opts: Intl.DateTimeFormatOptions = {
    month: "short",
    day: "numeric",
    year: "numeric",
  };
  const a = range.from.toLocaleDateString(undefined, opts);
  if (!range.to) return `${a} → …`;
  const b = range.to.toLocaleDateString(undefined, opts);
  return `${a} – ${b}`;
}

function formatStart(iso: string | null): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

function addDaysPreservingLocal(d: Date, days: number): Date {
  const next = new Date(d);
  next.setDate(next.getDate() + days);
  return next;
}

const PRESETS: { id: string; label: string; days: number }[] = [
  { id: "7", label: "7 days", days: 7 },
  { id: "30", label: "30 days", days: 30 },
  { id: "90", label: "90 days", days: 90 },
];

export default function NetworkingEventsView({
  embedded = false,
}: {
  /** When true, omit the page-level "Networking" H1 (parent provides the section title). */
  embedded?: boolean;
} = {}) {
  const [city, setCity] = useState("Miami");
  const [keyword, setKeyword] = useState("networking");
  const [range, setRange] = useState<DateRange | undefined>(() =>
    defaultRange()
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [events, setEvents] = useState<NetworkingEvent[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [dateOpen, setDateOpen] = useState(false);
  const datePopoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!dateOpen) return;
    function handle(e: MouseEvent) {
      if (
        datePopoverRef.current &&
        !datePopoverRef.current.contains(e.target as Node)
      ) {
        setDateOpen(false);
      }
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [dateOpen]);

  const rangeLabel = useMemo(
    () => formatRangeButton(range),
    [range]
  );

  function applyPreset(totalDays: number) {
    const from = new Date();
    from.setHours(0, 0, 0, 0);
    const to = addDaysPreservingLocal(from, totalDays - 1);
    setRange({ from, to });
  }

  async function search() {
    setError(null);
    setWarning(null);
    if (!city.trim()) {
      setError("Enter a city.");
      return;
    }
    if (!range?.from || !range.to) {
      setError("Choose a full date range (start and end).");
      return;
    }

    setLoading(true);
    setEvents([]);
    try {
      const res = await fetch("/api/prospecting/networking-events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          city: city.trim(),
          dateFrom: toYmd(range.from),
          dateTo: toYmd(range.to),
          ...(keyword.trim().length > 0
            ? { keyword: keyword.trim() }
            : {}),
        }),
      });

      const data = (await res.json()) as {
        events?: NetworkingEvent[];
        error?: string;
        warning?: string;
        detail?: string;
      };

      if (!res.ok) {
        setError(data.error ?? `Request failed (${res.status}).`);
        setEvents([]);
        setWarning(null);
        return;
      }

      setEvents(Array.isArray(data.events) ? data.events : []);
      setWarning(data.warning ?? null);
    } catch {
      setError("Network error — try again.");
    } finally {
      setLoading(false);
      setHasSearched(true);
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <header className="space-y-2">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400">
            <CalendarDays className="h-5 w-5" aria-hidden />
          </span>
          <div>
            {embedded ? (
              <h2 className="heading-display text-xl font-bold tracking-tight text-text-primary dark:text-zinc-100">
                Offline
              </h2>
            ) : (
              <h1 className="heading-display text-2xl font-bold tracking-tight text-text-primary dark:text-zinc-100">
                Networking
              </h1>
            )}
            <p className="mt-0.5 max-w-2xl text-sm leading-relaxed text-text-secondary dark:text-zinc-400">
              Find events in any city for your trip or outreach. Results come
              from Ticketmaster&apos;s catalog (often ticketed shows and larger
              listings).
            </p>
          </div>
        </div>
        <details className="group max-w-2xl rounded-lg border border-border/80 bg-surface/40 px-3 py-2 text-xs text-text-secondary open:bg-surface/60 dark:border-zinc-700/80 dark:bg-zinc-800/40 dark:text-zinc-500">
          <summary className="cursor-pointer list-none font-medium text-text-secondary/90 outline-none marker:hidden dark:text-zinc-400 [&::-webkit-details-marker]:hidden">
            <span className="inline-flex items-center gap-1.5">
              <span className="text-[10px] uppercase tracking-wide text-text-secondary/70 dark:text-zinc-500">
                Setup
              </span>
              Server env &amp; data source
              <ChevronDown className="h-3.5 w-3.5 shrink-0 transition-transform group-open:rotate-180" />
            </span>
          </summary>
          <p className="mt-2 border-t border-border/60 pt-2 leading-relaxed dark:border-zinc-700/60">
            Set{" "}
            <code className="rounded bg-black/[0.06] px-1.5 py-0.5 font-mono text-[11px] dark:bg-white/10">
              TICKETMASTER_API_KEY
            </code>{" "}
            in <code className="font-mono text-[11px]">.env.local</code> for
            live search. Very small meetups may not be listed—consider widening
            keywords or dates.
          </p>
        </details>
      </header>

      <section className="relative z-10 rounded-2xl border border-border bg-white shadow-sm ring-1 ring-black/[0.03] dark:border-zinc-800/90 dark:bg-zinc-900/80 dark:ring-white/[0.04]">
        {/*
          Do not use overflow-hidden here: it clips the date-range popover (absolute + z-50).
        */}
        <div className="border-b border-border/80 bg-gradient-to-b from-surface/80 to-transparent px-5 py-4 dark:border-zinc-800 dark:from-zinc-800/50">
          <h2 className="text-sm font-semibold text-text-primary dark:text-zinc-100">
            Search
          </h2>
          <p className="mt-0.5 text-xs text-text-secondary dark:text-zinc-500">
            City, optional keyword, and an inclusive date range (max 90 days).
          </p>
        </div>

        <div className="space-y-4 p-5">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-12 lg:items-end">
            <div className="sm:col-span-1 lg:col-span-3">
              <label
                htmlFor="networking-city"
                className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-text-secondary dark:text-zinc-500"
              >
                <MapPin className="h-3.5 w-3.5 opacity-70" aria-hidden />
                City
              </label>
              <input
                id="networking-city"
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Miami, FL"
                className="w-full rounded-xl border border-border bg-white px-3 py-2.5 text-sm shadow-sm transition-shadow focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 dark:border-zinc-700 dark:bg-zinc-950 dark:focus:border-blue-500 dark:focus:ring-blue-500/20"
                autoComplete="off"
              />
            </div>
            <div className="sm:col-span-1 lg:col-span-3">
              <label
                htmlFor="networking-keyword"
                className="mb-1.5 block text-xs font-medium text-text-secondary dark:text-zinc-500"
              >
                Keyword
              </label>
              <input
                id="networking-keyword"
                type="text"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="networking"
                className="w-full rounded-xl border border-border bg-white px-3 py-2.5 text-sm shadow-sm transition-shadow focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 dark:border-zinc-700 dark:bg-zinc-950 dark:focus:border-blue-500 dark:focus:ring-blue-500/20"
                autoComplete="off"
              />
            </div>

            <div className="relative sm:col-span-2 lg:col-span-4" ref={datePopoverRef}>
              <span className="mb-1.5 block text-xs font-medium text-text-secondary dark:text-zinc-500">
                Date range
              </span>
              <button
                type="button"
                onClick={() => setDateOpen((o) => !o)}
                className="flex w-full items-center justify-between gap-2 rounded-xl border border-zinc-200 bg-zinc-50/95 px-3 py-2.5 text-left text-sm font-medium text-text-primary shadow-sm transition-colors hover:bg-zinc-100/80 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-600 dark:bg-zinc-800/60 dark:hover:bg-zinc-800 dark:focus:border-blue-500 dark:focus:ring-blue-500/20"
                aria-expanded={dateOpen}
                aria-haspopup="dialog"
              >
                <span className="flex min-w-0 items-center gap-2">
                  <Calendar className="h-4 w-4 shrink-0 text-text-secondary/70 dark:text-zinc-500" />
                  <span className="truncate font-medium text-text-primary dark:text-zinc-200">
                    {rangeLabel}
                  </span>
                </span>
                <ChevronDown
                  className={`h-4 w-4 shrink-0 text-text-secondary/60 transition-transform dark:text-zinc-500 ${dateOpen ? "rotate-180" : ""}`}
                />
              </button>

              {dateOpen ? (
                <div
                  className="absolute left-0 right-0 z-[100] mt-2 rounded-2xl border border-border bg-white p-3 shadow-xl dark:border-zinc-600 dark:bg-zinc-900 lg:right-auto lg:w-[min(100%,22rem)]"
                  role="dialog"
                  aria-label="Choose date range"
                >
                  <div className="mb-3 flex flex-wrap gap-1.5">
                    {PRESETS.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => applyPreset(p.days)}
                        className="rounded-lg border border-border/80 bg-surface/60 px-2.5 py-1 text-xs font-medium text-text-secondary transition-colors hover:border-accent/40 hover:bg-accent/5 hover:text-text-primary dark:border-zinc-600 dark:bg-zinc-800/60 dark:text-zinc-400 dark:hover:border-blue-500/40 dark:hover:bg-blue-500/10 dark:hover:text-zinc-100"
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                  <DayPicker
                    mode="range"
                    selected={range}
                    onSelect={setRange}
                    numberOfMonths={1}
                    showOutsideDays
                    weekStartsOn={0}
                    defaultMonth={range?.from ?? range?.to ?? new Date()}
                    captionLayout="label"
                    className="crm-rdp mx-auto w-max max-w-full text-text-primary dark:text-zinc-100"
                    formatters={crmFormatters}
                    classNames={crmRangeDayClassNames}
                    modifiersClassNames={crmRangeDayModifiers}
                    style={crmRangeRdpCssVars}
                    components={{
                      Chevron: ({ className, size, orientation }) => {
                        const dim = size ?? 18;
                        if (orientation === "left") {
                          return (
                            <ChevronLeft
                              className={className}
                              size={dim}
                              strokeWidth={2}
                              aria-hidden
                            />
                          );
                        }
                        if (orientation === "right") {
                          return (
                            <ChevronRight
                              className={className}
                              size={dim}
                              strokeWidth={2}
                              aria-hidden
                            />
                          );
                        }
                        if (orientation === "up") {
                          return (
                            <ChevronUp
                              className={className}
                              size={dim}
                              strokeWidth={2}
                              aria-hidden
                            />
                          );
                        }
                        return (
                          <ChevronDown
                            className={className}
                            size={dim}
                            strokeWidth={2}
                            aria-hidden
                          />
                        );
                      },
                    }}
                  />
                </div>
              ) : null}
            </div>

            <div className="sm:col-span-2 lg:col-span-2">
              <span className="mb-1.5 block text-xs font-medium text-transparent select-none dark:text-transparent">
                Search
              </span>
              <button
                type="button"
                onClick={() => void search()}
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white shadow-md transition-colors hover:bg-accent-hover disabled:opacity-50 dark:bg-blue-600 dark:hover:bg-blue-500"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                ) : (
                  <Search className="h-4 w-4" aria-hidden />
                )}
                Search
              </button>
            </div>
          </div>

          {error ? (
            <p
              className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-800 dark:border-red-500/30 dark:bg-red-950/40 dark:text-red-200"
              role="alert"
            >
              {error}
            </p>
          ) : null}
          {warning ? (
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950 dark:border-amber-500/25 dark:bg-amber-950/35 dark:text-amber-100/95">
              {warning}
            </p>
          ) : null}
        </div>
      </section>

      {events.length > 0 ? (
        <section className="overflow-hidden rounded-2xl border border-border bg-white shadow-sm ring-1 ring-black/[0.03] dark:border-zinc-800/90 dark:bg-zinc-900/80 dark:ring-white/[0.04]">
          <div className="flex items-center justify-between border-b border-border/80 px-5 py-3 dark:border-zinc-800">
            <h2 className="text-sm font-semibold text-text-primary dark:text-zinc-100">
              Results
            </h2>
            <span className="rounded-full bg-surface/80 px-2.5 py-0.5 text-xs font-medium tabular-nums text-text-secondary dark:bg-zinc-800 dark:text-zinc-400">
              {events.length} event{events.length === 1 ? "" : "s"}
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="border-b border-border bg-surface/40 text-[11px] font-semibold uppercase tracking-wider text-text-secondary dark:border-zinc-800 dark:bg-zinc-800/40 dark:text-zinc-500">
                <tr>
                  <th className="px-5 py-3">When</th>
                  <th className="px-5 py-3">Event</th>
                  <th className="px-5 py-3">Place</th>
                  <th className="px-5 py-3">Organizer</th>
                  <th className="w-24 px-5 py-3">Link</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/80 dark:divide-zinc-800">
                {events.map((ev) => (
                  <tr
                    key={ev.id}
                    className="transition-colors hover:bg-surface/30 dark:hover:bg-zinc-800/30"
                  >
                    <td className="whitespace-nowrap px-5 py-3.5 text-text-secondary tabular-nums dark:text-zinc-400">
                      {formatStart(ev.start)}
                    </td>
                    <td className="px-5 py-3.5 font-medium text-text-primary dark:text-zinc-100">
                      {ev.title}
                    </td>
                    <td className="px-5 py-3.5 text-text-secondary dark:text-zinc-400">
                      {ev.venueName ?? "—"}
                    </td>
                    <td className="px-5 py-3.5 text-text-secondary dark:text-zinc-400">
                      {ev.organizerName ?? "—"}
                    </td>
                    <td className="px-5 py-3.5">
                      {ev.url ? (
                        <a
                          href={ev.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 font-medium text-accent hover:underline dark:text-blue-400"
                        >
                          Open
                          <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                        </a>
                      ) : (
                        <span className="text-text-secondary/60 dark:text-zinc-600">
                          —
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : hasSearched && !loading && !error && events.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-surface/30 px-6 py-10 text-center dark:border-zinc-700 dark:bg-zinc-900/40">
          <CalendarDays className="mx-auto h-10 w-10 text-text-secondary/40 dark:text-zinc-600" />
          <p className="mt-3 text-sm font-medium text-text-primary dark:text-zinc-300">
            No events in this range
          </p>
          <p className="mt-1 text-sm text-text-secondary dark:text-zinc-500">
            Try another city, keyword, or wider dates.
            {warning ? " Check the note above if search is limited." : ""}
          </p>
        </div>
      ) : null}
    </div>
  );
}
