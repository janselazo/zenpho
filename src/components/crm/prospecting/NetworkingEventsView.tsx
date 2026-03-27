"use client";

import { useMemo, useState } from "react";
import { DayPicker, type DateRange } from "react-day-picker";
import { Calendar, ExternalLink, Loader2, Search } from "lucide-react";
import "react-day-picker/style.css";
import type { NetworkingEvent } from "@/lib/crm/networking-events";

const cardClass =
  "rounded-2xl border border-border bg-white p-5 shadow-sm dark:border-zinc-800/70 dark:bg-zinc-900/60 dark:shadow-none";

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

export default function NetworkingEventsView() {
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

  const rangeLabel = useMemo(() => {
    if (!range?.from) return "—";
    if (!range.to) return `${toYmd(range.from)} → …`;
    return `${toYmd(range.from)} → ${toYmd(range.to)}`;
  }, [range]);

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
    <div className="space-y-8">
      <div>
        <h1 className="heading-display text-2xl font-bold text-text-primary dark:text-zinc-100">
          Networking
        </h1>
        <p className="mt-1 max-w-3xl text-sm text-text-secondary dark:text-zinc-400">
          Search Ticketmaster Discovery for events in a city within your chosen
          dates. Results favor ticketed listings; smaller meetups may not be
          listed. Set{" "}
          <code className="rounded bg-black/5 px-1 dark:bg-white/10">
            TICKETMASTER_API_KEY
          </code>{" "}
          server-side for live data.
        </p>
      </div>

      <div className={`${cardClass} space-y-4`}>
        <h2 className="sr-only">Search</h2>
        <div className="flex flex-col gap-4 lg:flex-row lg:flex-wrap lg:items-end">
          <div className="min-w-[12rem] flex-1">
            <label
              htmlFor="networking-city"
              className="mb-1 block text-xs font-medium text-text-secondary dark:text-zinc-500"
            >
              City
            </label>
            <input
              id="networking-city"
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="e.g. Miami, FL"
              className="w-full rounded-xl border border-border bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
              autoComplete="off"
            />
          </div>
          <div className="min-w-[12rem] flex-1">
            <label
              htmlFor="networking-keyword"
              className="mb-1 block text-xs font-medium text-text-secondary dark:text-zinc-500"
            >
              Keyword (optional)
            </label>
            <input
              id="networking-keyword"
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="networking"
              className="w-full rounded-xl border border-border bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
              autoComplete="off"
            />
          </div>
          <div className="flex-shrink-0">
            <button
              type="button"
              onClick={() => void search()}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-accent-hover disabled:opacity-50 dark:bg-blue-600 dark:hover:bg-blue-500"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              ) : (
                <Search className="h-4 w-4" aria-hidden />
              )}
              Search events
            </button>
          </div>
        </div>

        <div className="border-t border-border pt-4 dark:border-zinc-700/80">
          <p className="mb-2 flex items-center gap-2 text-xs font-medium text-text-secondary dark:text-zinc-500">
            <Calendar className="h-3.5 w-3.5" aria-hidden />
            Date range: {rangeLabel}
          </p>
          <div className="rounded-xl border border-border bg-surface/40 p-3 dark:border-zinc-700 dark:bg-zinc-800/40">
            <DayPicker
              mode="range"
              selected={range}
              onSelect={setRange}
              numberOfMonths={1}
              classNames={{
                root: "mx-auto w-fit",
              }}
            />
          </div>
        </div>

        {error ? (
          <p className="text-sm font-medium text-red-600 dark:text-red-400" role="alert">
            {error}
          </p>
        ) : null}
        {warning ? (
          <p className="text-sm text-amber-800 dark:text-amber-200/90">{warning}</p>
        ) : null}
      </div>

      {events.length > 0 ? (
        <div className={`${cardClass} overflow-hidden p-0`}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="border-b border-border bg-surface/50 text-xs font-semibold uppercase tracking-wider text-text-secondary dark:border-zinc-700 dark:bg-zinc-800/50 dark:text-zinc-500">
                <tr>
                  <th className="px-4 py-3">When</th>
                  <th className="px-4 py-3">Event</th>
                  <th className="px-4 py-3">Place</th>
                  <th className="px-4 py-3">Organizer</th>
                  <th className="px-4 py-3 w-24">Link</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border dark:divide-zinc-700/80">
                {events.map((ev) => (
                  <tr
                    key={ev.id}
                    className="text-text-primary dark:text-zinc-200"
                  >
                    <td className="whitespace-nowrap px-4 py-3 text-text-secondary dark:text-zinc-400">
                      {formatStart(ev.start)}
                    </td>
                    <td className="px-4 py-3 font-medium">{ev.title}</td>
                    <td className="px-4 py-3 text-text-secondary dark:text-zinc-400">
                      {ev.venueName ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-text-secondary dark:text-zinc-400">
                      {ev.organizerName ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      {ev.url ? (
                        <a
                          href={ev.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 font-medium text-accent hover:underline dark:text-blue-400"
                        >
                          View
                          <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                        </a>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : hasSearched && !loading && !error && events.length === 0 ? (
        <p className="text-sm text-text-secondary dark:text-zinc-500">
          No events in this range. Try another city, keyword, or wider dates.
          {warning ? " See the note above." : ""}
        </p>
      ) : null}
    </div>
  );
}
