"use client";

import { Compass, Loader2, Plus, Trash2 } from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import {
  createLifeTaskAction,
  deleteLifeTaskAction,
  listLifeTasks,
  updateLifeTaskAction,
  type LifeTaskRow,
} from "@/app/(crm)/actions/life-task";
import {
  LIFE_AREAS,
  LIFE_STATUSES,
  STATUS_META,
  type LifeAreaKey,
  type LifeStatus,
} from "@/lib/crm/life-areas";

// ---------------------------------------------------------------------------
// Root view
// ---------------------------------------------------------------------------

export default function MyLifeView() {
  const [tasks, setTasks] = useState<LifeTaskRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await listLifeTasks();
      if (cancelled) return;
      setLoadError(res.error);
      setTasks(res.data);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const byArea = useMemo(() => {
    const out = new Map<LifeAreaKey, LifeTaskRow[]>();
    for (const area of LIFE_AREAS) out.set(area.key, []);
    for (const t of tasks) {
      const bucket = out.get(t.area);
      if (bucket) bucket.push(t);
    }
    return out;
  }, [tasks]);

  const totalSummary = useMemo(() => {
    const counts: Record<LifeStatus, number> = { green: 0, yellow: 0, red: 0 };
    for (const t of tasks) counts[t.status] += 1;
    return counts;
  }, [tasks]);

  const upsertTask = useCallback((row: LifeTaskRow) => {
    setTasks((prev) => {
      const idx = prev.findIndex((t) => t.id === row.id);
      if (idx === -1) return [...prev, row];
      const next = prev.slice();
      next[idx] = row;
      return next;
    });
  }, []);

  const removeTask = useCallback((id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
  }, []);

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
            honest with yourself, and looking at your calendar — near and long term — to
            make sure you are paying attention to the things you truly believe are important
            to serve.
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
                {totalSummary[s]}
              </span>
            </span>
          ))}
        </div>
      </header>

      {loadError ? (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/5 p-4 text-sm text-red-700 dark:text-red-300">
          Could not load tasks: {loadError}
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
            <LifeAreaSection
              key={area.key}
              areaKey={area.key}
              label={area.label}
              blurb={area.blurb}
              Icon={area.icon}
              tasks={byArea.get(area.key) ?? []}
              onUpsert={upsertTask}
              onRemove={removeTask}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Section
// ---------------------------------------------------------------------------

type LifeAreaSectionProps = {
  areaKey: LifeAreaKey;
  label: string;
  blurb: string;
  Icon: (typeof LIFE_AREAS)[number]["icon"];
  tasks: LifeTaskRow[];
  onUpsert: (row: LifeTaskRow) => void;
  onRemove: (id: string) => void;
};

function LifeAreaSection({
  areaKey,
  label,
  blurb,
  Icon,
  tasks,
  onUpsert,
  onRemove,
}: LifeAreaSectionProps) {
  const [draftTitle, setDraftTitle] = useState("");
  const [creating, startCreate] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const counts = useMemo(() => {
    const out: Record<LifeStatus, number> = { green: 0, yellow: 0, red: 0 };
    for (const t of tasks) out[t.status] += 1;
    return out;
  }, [tasks]);

  const handleCreate = () => {
    const title = draftTitle.trim();
    if (!title || creating) return;
    setError(null);
    startCreate(async () => {
      const res = await createLifeTaskAction({ area: areaKey, title });
      if (res.error || !res.data) {
        setError(res.error ?? "Could not add task");
        return;
      }
      onUpsert(res.data);
      setDraftTitle("");
      // Refocus for rapid entry.
      requestAnimationFrame(() => inputRef.current?.focus());
    });
  };

  return (
    <section className="flex flex-col rounded-2xl border border-border bg-white shadow-sm dark:border-zinc-800/70 dark:bg-zinc-900/60">
      <header className="flex items-start justify-between gap-3 border-b border-border px-5 py-4 dark:border-zinc-800/70">
        <div className="min-w-0">
          <h2 className="heading-display flex items-center gap-2 text-base font-semibold text-text-primary dark:text-zinc-100">
            <Icon className="h-4 w-4 text-text-secondary dark:text-zinc-500" aria-hidden />
            {label}
          </h2>
          <p className="mt-0.5 truncate text-xs text-text-secondary dark:text-zinc-500">
            {blurb}
          </p>
        </div>
        <div
          className="flex shrink-0 items-center gap-1.5 text-[11px] font-medium"
          aria-label={`${counts.green} green, ${counts.yellow} yellow, ${counts.red} red`}
        >
          <CountPill status="green" count={counts.green} />
          <CountPill status="yellow" count={counts.yellow} />
          <CountPill status="red" count={counts.red} />
        </div>
      </header>

      <ul className="flex flex-1 flex-col divide-y divide-border/70 dark:divide-zinc-800/70">
        {tasks.length === 0 ? (
          <li className="px-5 py-4 text-xs italic text-text-secondary dark:text-zinc-500">
            No tasks yet — add one below.
          </li>
        ) : (
          tasks.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              onUpsert={onUpsert}
              onRemove={onRemove}
            />
          ))
        )}
      </ul>

      <form
        className="flex items-center gap-2 border-t border-border px-4 py-3 dark:border-zinc-800/70"
        onSubmit={(e) => {
          e.preventDefault();
          handleCreate();
        }}
      >
        <Plus
          className="h-4 w-4 shrink-0 text-text-secondary dark:text-zinc-500"
          aria-hidden
        />
        <input
          ref={inputRef}
          type="text"
          value={draftTitle}
          onChange={(e) => setDraftTitle(e.target.value)}
          placeholder={`Add a task to ${label}…`}
          aria-label={`Add a task to ${label}`}
          className="flex-1 bg-transparent text-sm text-text-primary placeholder:text-text-secondary/60 focus:outline-none dark:text-zinc-100 dark:placeholder:text-zinc-600"
          maxLength={200}
        />
        <button
          type="submit"
          disabled={!draftTitle.trim() || creating}
          className="rounded-lg bg-accent px-2.5 py-1 text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-blue-500"
        >
          {creating ? "Adding…" : "Add"}
        </button>
      </form>
      {error ? (
        <p className="px-5 pb-3 text-xs text-red-600 dark:text-red-400">{error}</p>
      ) : null}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Task row
// ---------------------------------------------------------------------------

type TaskRowProps = {
  task: LifeTaskRow;
  onUpsert: (row: LifeTaskRow) => void;
  onRemove: (id: string) => void;
};

function TaskRow({ task, onUpsert, onRemove }: TaskRowProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(task.title);
  const [saving, startSave] = useTransition();
  const [deleting, startDelete] = useTransition();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!editing) setDraft(task.title);
  }, [task.title, editing]);

  const save = useCallback(
    (patch: { title?: string; status?: LifeStatus }) => {
      setError(null);
      startSave(async () => {
        const res = await updateLifeTaskAction({ id: task.id, ...patch });
        if (res.error || !res.data) {
          setError(res.error ?? "Could not save");
          return;
        }
        onUpsert(res.data);
      });
    },
    [task.id, onUpsert]
  );

  const handleStatusChange = (next: LifeStatus) => {
    if (next === task.status) return;
    onUpsert({ ...task, status: next });
    save({ status: next });
  };

  const handleTitleCommit = () => {
    const next = draft.trim();
    if (!next) {
      setDraft(task.title);
      setEditing(false);
      return;
    }
    if (next === task.title) {
      setEditing(false);
      return;
    }
    save({ title: next });
    setEditing(false);
  };

  const handleDelete = () => {
    if (!confirm(`Delete "${task.title}"?`)) return;
    setError(null);
    startDelete(async () => {
      const res = await deleteLifeTaskAction(task.id);
      if (res.error) {
        setError(res.error);
        return;
      }
      onRemove(task.id);
    });
  };

  return (
    <li className="group flex items-center gap-3 px-5 py-2.5 hover:bg-surface/60 dark:hover:bg-zinc-800/40">
      <StatusPicker value={task.status} onChange={handleStatusChange} />
      <div className="flex min-w-0 flex-1 items-center gap-2">
        {editing ? (
          <input
            autoFocus
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={handleTitleCommit}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleTitleCommit();
              } else if (e.key === "Escape") {
                setDraft(task.title);
                setEditing(false);
              }
            }}
            className="w-full rounded-md border border-accent/40 bg-white px-2 py-1 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/30 dark:border-blue-400/40 dark:bg-zinc-950/40 dark:text-zinc-100 dark:focus:ring-blue-400/30"
            maxLength={200}
          />
        ) : (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="min-w-0 flex-1 truncate text-left text-sm text-text-primary dark:text-zinc-100"
            title="Click to edit"
          >
            {task.title}
          </button>
        )}
        {saving ? (
          <Loader2 className="h-3 w-3 shrink-0 animate-spin text-text-secondary dark:text-zinc-500" aria-hidden />
        ) : null}
      </div>
      <button
        type="button"
        onClick={handleDelete}
        disabled={deleting}
        aria-label={`Delete ${task.title}`}
        className="rounded-md p-1 text-text-secondary opacity-0 transition-opacity hover:bg-red-500/10 hover:text-red-600 group-hover:opacity-100 focus:opacity-100 disabled:opacity-40 dark:text-zinc-500 dark:hover:text-red-400"
      >
        <Trash2 className="h-3.5 w-3.5" aria-hidden />
      </button>
      {error ? (
        <span className="text-[11px] text-red-600 dark:text-red-400">{error}</span>
      ) : null}
    </li>
  );
}

// ---------------------------------------------------------------------------
// Status picker (compact 3-dot segmented control)
// ---------------------------------------------------------------------------

function StatusPicker({
  value,
  onChange,
}: {
  value: LifeStatus;
  onChange: (next: LifeStatus) => void;
}) {
  return (
    <div
      className="flex shrink-0 items-center gap-0.5 rounded-full border border-border bg-surface/60 p-0.5 dark:border-zinc-800/70 dark:bg-zinc-800/40"
      role="radiogroup"
      aria-label="Task status"
    >
      {LIFE_STATUSES.map((s) => {
        const active = value === s;
        const meta = STATUS_META[s];
        return (
          <button
            key={s}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={`${meta.label} — ${meta.description}`}
            title={`${meta.label} — ${meta.description}`}
            onClick={() => onChange(s)}
            className={`grid h-4 w-4 place-items-center rounded-full transition-transform ${
              active ? "scale-110" : "opacity-40 hover:opacity-80"
            }`}
          >
            <span className={`h-2.5 w-2.5 rounded-full ${meta.dotClass}`} aria-hidden />
          </button>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Count pill (section header)
// ---------------------------------------------------------------------------

function CountPill({ status, count }: { status: LifeStatus; count: number }) {
  const meta = STATUS_META[status];
  const muted = count === 0;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 tabular-nums ${
        muted
          ? "text-text-secondary/60 dark:text-zinc-600"
          : "text-text-primary dark:text-zinc-200"
      }`}
      aria-label={`${count} ${meta.label}`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${meta.dotClass} ${muted ? "opacity-40" : ""}`}
        aria-hidden
      />
      {count}
    </span>
  );
}
