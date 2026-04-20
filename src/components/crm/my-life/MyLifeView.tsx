"use client";

import { Compass, Loader2 } from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import {
  listLifeAreaStatuses,
  upsertLifeAreaStatusAction,
  type LifeAreaStatusRow,
} from "@/app/(crm)/actions/life-area";
import {
  LIFE_AREAS,
  LIFE_STATUSES,
  STATUS_META,
  type LifeAreaKey,
  type LifeStatus,
} from "@/lib/crm/life-areas";

export default function MyLifeView() {
  const [rows, setRows] = useState<Record<LifeAreaKey, LifeAreaStatusRow>>(
    () => seedRows()
  );
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await listLifeAreaStatuses();
      if (cancelled) return;
      if (res.error) {
        setLoadError(res.error);
      } else {
        setLoadError(null);
      }
      setRows(rowsToMap(res.data));
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const applyRow = useCallback(
    (area: LifeAreaKey, patch: Partial<LifeAreaStatusRow>) => {
      setRows((prev) => ({
        ...prev,
        [area]: {
          ...prev[area],
          ...patch,
        },
      }));
    },
    []
  );

  const summary = useMemo(() => {
    const counts: Record<LifeStatus, number> = { green: 0, yellow: 0, red: 0 };
    for (const a of LIFE_AREAS) {
      counts[rows[a.key].status] += 1;
    }
    return counts;
  }, [rows]);

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Compass className="h-6 w-6 text-accent dark:text-blue-400" aria-hidden />
            <h1 className="heading-display text-2xl font-bold text-text-primary dark:text-zinc-100">
              My Life
            </h1>
          </div>
          <p className="mt-2 max-w-2xl text-sm text-text-secondary dark:text-zinc-400">
            The integrated life is about deciding what is really important to you, being
            honest with yourself, and looking at your calendar — near and long term — to make
            sure you are paying attention to the things you truly believe are important to serve.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {LIFE_STATUSES.map((s) => (
            <span
              key={s}
              className="inline-flex items-center gap-1.5 rounded-full bg-surface px-3 py-1 text-xs font-medium text-text-secondary dark:bg-zinc-800/60 dark:text-zinc-400"
            >
              <span className={`h-2 w-2 rounded-full ${STATUS_META[s].dotClass}`} aria-hidden />
              <span>{STATUS_META[s].label}</span>
              <span className="font-semibold tabular-nums text-text-primary dark:text-zinc-200">
                {summary[s]}
              </span>
            </span>
          ))}
        </div>
      </header>

      {loadError ? (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/5 p-4 text-sm text-red-700 dark:text-red-300">
          Could not load statuses: {loadError}
        </div>
      ) : null}

      {loading ? (
        <div className="flex items-center justify-center rounded-2xl border border-border bg-white p-12 text-sm text-text-secondary shadow-sm dark:border-zinc-800/70 dark:bg-zinc-900/60 dark:text-zinc-400">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
          Loading your life areas…
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {LIFE_AREAS.map((area) => (
            <LifeAreaCard
              key={area.key}
              areaKey={area.key}
              label={area.label}
              blurb={area.blurb}
              Icon={area.icon}
              row={rows[area.key]}
              onChange={(patch) => applyRow(area.key, patch)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Card
// ---------------------------------------------------------------------------

type LifeAreaCardProps = {
  areaKey: LifeAreaKey;
  label: string;
  blurb: string;
  Icon: (typeof LIFE_AREAS)[number]["icon"];
  row: LifeAreaStatusRow;
  onChange: (patch: Partial<LifeAreaStatusRow>) => void;
};

function LifeAreaCard({ areaKey, label, blurb, Icon, row, onChange }: LifeAreaCardProps) {
  const [notesDraft, setNotesDraft] = useState(row.notes);
  const [saving, startSave] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep draft in sync when the authoritative row changes from elsewhere (e.g. initial load).
  useEffect(() => {
    setNotesDraft(row.notes);
  }, [row.notes]);

  const save = useCallback(
    (patch: { status?: LifeStatus; notes?: string }) => {
      setError(null);
      startSave(async () => {
        const res = await upsertLifeAreaStatusAction({ area: areaKey, ...patch });
        if (res.error || !res.data) {
          setError(res.error ?? "Could not save");
          return;
        }
        onChange({
          id: res.data.id,
          status: res.data.status,
          notes: res.data.notes,
          updated_at: res.data.updated_at,
        });
      });
    },
    [areaKey, onChange]
  );

  const handleStatusClick = (next: LifeStatus) => {
    if (next === row.status) return;
    onChange({ status: next });
    save({ status: next });
  };

  const scheduleNotesSave = (value: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (value === row.notes) return;
      save({ notes: value });
    }, 800);
  };

  const handleNotesBlur = () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (notesDraft !== row.notes) {
      save({ notes: notesDraft });
    }
  };

  useEffect(
    () => () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    },
    []
  );

  const statusMeta = STATUS_META[row.status];

  return (
    <article
      className={`rounded-2xl border border-border bg-white p-5 shadow-sm ring-1 ring-inset ${statusMeta.ringClass} transition-shadow dark:border-zinc-800/70 dark:bg-zinc-900/60`}
    >
      <header className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${statusMeta.dotClass}`} aria-hidden />
          <div>
            <h2 className="heading-display text-base font-semibold text-text-primary dark:text-zinc-100">
              <span className="inline-flex items-center gap-2">
                <Icon className="h-4 w-4 text-text-secondary dark:text-zinc-500" aria-hidden />
                {label}
              </span>
            </h2>
            <p className="mt-0.5 text-xs text-text-secondary dark:text-zinc-500">{blurb}</p>
          </div>
        </div>
        <LastUpdated updatedAt={row.updated_at} saving={saving} />
      </header>

      <div
        className="mt-4 grid grid-cols-3 gap-2"
        role="radiogroup"
        aria-label={`${label} status`}
      >
        {LIFE_STATUSES.map((s) => {
          const meta = STATUS_META[s];
          const active = row.status === s;
          return (
            <button
              key={s}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => handleStatusClick(s)}
              className={`flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition-colors ${
                active ? meta.chipActiveClass : meta.chipIdleClass
              }`}
              title={meta.description}
            >
              <span className={`h-2 w-2 rounded-full ${meta.dotClass}`} aria-hidden />
              {meta.label}
            </button>
          );
        })}
      </div>

      <label className="mt-4 block">
        <span className="sr-only">Notes for {label}</span>
        <textarea
          value={notesDraft}
          onChange={(e) => {
            const v = e.target.value;
            setNotesDraft(v);
            scheduleNotesSave(v);
          }}
          onBlur={handleNotesBlur}
          placeholder="What's going on in this area? Wins, worries, next small step…"
          rows={3}
          className="w-full resize-y rounded-xl border border-border bg-white px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary/60 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 dark:border-zinc-800 dark:bg-zinc-950/40 dark:text-zinc-100 dark:placeholder:text-zinc-600 dark:focus:border-blue-400 dark:focus:ring-blue-400/20"
        />
      </label>

      {error ? (
        <p className="mt-2 text-xs text-red-600 dark:text-red-400">{error}</p>
      ) : null}
    </article>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function LastUpdated({
  updatedAt,
  saving,
}: {
  updatedAt: string | null;
  saving: boolean;
}) {
  if (saving) {
    return (
      <span className="inline-flex shrink-0 items-center gap-1 text-[11px] font-medium text-text-secondary dark:text-zinc-500">
        <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
        Saving
      </span>
    );
  }
  if (!updatedAt) {
    return (
      <span className="shrink-0 text-[11px] text-text-secondary/70 dark:text-zinc-600">
        Not set yet
      </span>
    );
  }
  return (
    <span
      className="shrink-0 text-[11px] text-text-secondary dark:text-zinc-500"
      title={new Date(updatedAt).toLocaleString()}
    >
      Updated {formatRelative(updatedAt)}
    </span>
  );
}

function formatRelative(iso: string): string {
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return "recently";
  const diffMs = Date.now() - then;
  const diffSec = Math.round(diffMs / 1000);
  if (diffSec < 45) return "just now";
  const diffMin = Math.round(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.round(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d ago`;
  if (diffDay < 30) return `${Math.round(diffDay / 7)}w ago`;
  if (diffDay < 365) return `${Math.round(diffDay / 30)}mo ago`;
  return `${Math.round(diffDay / 365)}y ago`;
}

function seedRows(): Record<LifeAreaKey, LifeAreaStatusRow> {
  const out = {} as Record<LifeAreaKey, LifeAreaStatusRow>;
  for (const a of LIFE_AREAS) {
    out[a.key] = {
      id: null,
      area: a.key,
      status: "yellow",
      notes: "",
      updated_at: null,
    };
  }
  return out;
}

function rowsToMap(rows: LifeAreaStatusRow[]): Record<LifeAreaKey, LifeAreaStatusRow> {
  const out = seedRows();
  for (const r of rows) {
    out[r.area] = r;
  }
  return out;
}
