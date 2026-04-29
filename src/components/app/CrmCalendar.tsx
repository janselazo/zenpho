"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  createAppointmentAction,
  deleteAppointment,
  updateAppointmentAction,
} from "@/app/(crm)/actions/crm";
import CrmPopoverDateTimeField, {
  formatDatetimeLocalInput,
} from "@/components/crm/CrmPopoverDateTimeField";
import AppointmentMonthGrid, {
  type AppointmentCalendarRow,
} from "@/components/app/AppointmentMonthGrid";
import AppointmentStatusBadge from "@/components/app/AppointmentStatusBadge";
import {
  APPOINTMENT_STATUS_LIST,
  appointmentStatusLabel,
  parseAppointmentStatus,
  type AppointmentStatus,
} from "@/lib/crm/appointment-status";

type ViewTab = "upcoming" | "calendar" | "all";

function formatDateTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function defaultNextHourWindow() {
  const start = new Date();
  start.setMinutes(0, 0, 0);
  if (start <= new Date()) start.setHours(start.getHours() + 1);
  const end = new Date(start);
  end.setHours(end.getHours() + 1);
  return { start, end };
}

const inputClass =
  "w-full rounded-xl border border-border bg-white px-3 py-2 text-sm text-text-primary outline-none focus:border-accent focus:ring-2 focus:ring-accent/15";

export default function CrmCalendar({ configured }: { configured: boolean }) {
  const [rows, setRows] = useState<AppointmentCalendarRow[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ViewTab>("calendar");

  const [visibleMonth, setVisibleMonth] = useState(() => {
    const n = new Date();
    return new Date(n.getFullYear(), n.getMonth(), 1);
  });

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startsLocal, setStartsLocal] = useState("");
  const [endsLocal, setEndsLocal] = useState("");
  const [status, setStatus] = useState<AppointmentStatus>("scheduled");
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const load = useCallback(async () => {
    if (!configured) return;
    try {
      const supabase = createClient();
      const { data, error: qErr } = await supabase
        .from("appointment")
        .select("id, title, description, starts_at, ends_at, status")
        .order("starts_at", { ascending: true });
      if (qErr) {
        setLoadError(qErr.message);
        return;
      }
      setLoadError(null);
      setRows(
        (data ?? []).map((r) => ({
          id: r.id as string,
          title: r.title as string,
          description: (r.description as string | null) ?? null,
          starts_at: r.starts_at as string,
          ends_at: r.ends_at as string,
          status: parseAppointmentStatus(r.status as string | null),
        }))
      );
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Failed to load");
    }
  }, [configured]);

  useEffect(() => {
    void load();
  }, [load]);

  const now = new Date();
  const upcomingRows = rows.filter((r) => new Date(r.starts_at) >= now);

  function goPrevMonth() {
    setVisibleMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1));
  }

  function goNextMonth() {
    setVisibleMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1));
  }

  function goThisMonth() {
    const n = new Date();
    setVisibleMonth(new Date(n.getFullYear(), n.getMonth(), 1));
  }

  function openNew(preset?: { start: Date; end: Date }) {
    const { start, end } = preset ?? defaultNextHourWindow();
    setEditingId(null);
    setTitle("");
    setDescription("");
    setStatus("scheduled");
    setStartsLocal(formatDatetimeLocalInput(start));
    setEndsLocal(formatDatetimeLocalInput(end));
    setFormError(null);
    setModalOpen(true);
  }

  function openNewForDay(day: Date) {
    const start = new Date(day);
    start.setHours(9, 0, 0, 0);
    const end = new Date(start);
    end.setHours(10, 0, 0, 0);
    openNew({ start, end });
  }

  function onEditEvent(row: AppointmentCalendarRow) {
    setEditingId(row.id);
    setTitle(row.title);
    setDescription(row.description ?? "");
    setStatus(row.status);
    setStartsLocal(formatDatetimeLocalInput(new Date(row.starts_at)));
    setEndsLocal(formatDatetimeLocalInput(new Date(row.ends_at)));
    setFormError(null);
    setModalOpen(true);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    if (!startsLocal.trim() || !endsLocal.trim()) {
      setFormError("Set both start and end date and time.");
      return;
    }
    const startT = new Date(startsLocal).getTime();
    const endT = new Date(endsLocal).getTime();
    if (Number.isNaN(startT) || Number.isNaN(endT)) {
      setFormError("Invalid start or end time.");
      return;
    }
    setPending(true);
    const startIso = new Date(startT).toISOString();
    const endIso = new Date(endT).toISOString();

    try {
      if (editingId) {
        const res = await updateAppointmentAction({
          id: editingId,
          title,
          description,
          starts_at: startIso,
          ends_at: endIso,
          status,
        });
        if ("error" in res && res.error) {
          setFormError(res.error);
          setPending(false);
          return;
        }
      } else {
        const res = await createAppointmentAction({
          title,
          description,
          starts_at: startIso,
          ends_at: endIso,
          status,
        });
        if ("error" in res && res.error) {
          setFormError(res.error);
          setPending(false);
          return;
        }
      }
      setModalOpen(false);
      await load();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Request failed");
    }
    setPending(false);
  }

  async function onDelete() {
    if (!editingId) return;
    if (!confirm("Delete this appointment?")) return;
    setPending(true);
    setFormError(null);
    const res = await deleteAppointment(editingId);
    if ("error" in res && res.error) {
      setFormError(res.error);
      setPending(false);
      return;
    }
    setModalOpen(false);
    setPending(false);
    await load();
  }

  const tabItems: { id: ViewTab; label: string }[] = [
    { id: "upcoming", label: "Upcoming" },
    { id: "calendar", label: "Calendar" },
    { id: "all", label: "All" },
  ];

  const monthRangeLabel = useMemo(() => {
    const y = visibleMonth.getFullYear();
    const m = visibleMonth.getMonth();
    const last = new Date(y, m + 1, 0);
    const a = new Date(y, m, 1);
    const fmt = (d: Date) =>
      d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    return `${fmt(a)} – ${fmt(last)}`;
  }, [visibleMonth]);

  if (!configured) {
    return (
      <p className="text-sm text-text-secondary">
        Configure Supabase to use appointments.
      </p>
    );
  }

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="heading-display text-2xl font-bold text-text-primary">
            Appointments
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            Manage first calls, consultations, deliveries, and follow-ups
          </p>
        </div>
        <button
          type="button"
          onClick={() => openNew()}
          className="shrink-0 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-accent-hover"
        >
          + Add event
        </button>
      </div>

      <p className="mt-3 text-sm text-text-secondary">
        {upcomingRows.length} upcoming · {rows.length} total
      </p>

      <div className="mt-4 inline-flex rounded-lg border border-border bg-surface/50 p-0.5">
        {tabItems.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? "bg-white text-text-primary shadow-sm"
                : "text-text-secondary hover:text-text-primary"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "calendar" ? (
        <p className="mt-3 text-sm font-medium text-zinc-600 dark:text-zinc-400">
          {monthRangeLabel}
        </p>
      ) : null}

      {loadError && (
        <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
          {loadError}
        </p>
      )}

      <div className="mt-6">
        {activeTab === "calendar" && (
          <AppointmentMonthGrid
            rows={rows}
            visibleMonth={visibleMonth}
            onPrevMonth={goPrevMonth}
            onNextMonth={goNextMonth}
            onToday={goThisMonth}
            onSelectDay={(day) => openNewForDay(day)}
            onEditEvent={onEditEvent}
          />
        )}

        {activeTab === "upcoming" && (
          <AppointmentList
            items={upcomingRows}
            emptyMessage="No upcoming appointments."
            onEdit={onEditEvent}
          />
        )}

        {activeTab === "all" && (
          <AppointmentList
            items={rows}
            emptyMessage="No appointments yet."
            onEdit={onEditEvent}
          />
        )}
      </div>

      {modalOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-end justify-center bg-black/40 p-4 sm:items-center"
          onClick={() => setModalOpen(false)}
          onKeyDown={(e) => e.key === "Escape" && setModalOpen(false)}
          role="presentation"
        >
          <div
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-border bg-white p-6 shadow-xl"
            role="dialog"
            onClick={(e) => e.stopPropagation()}
            aria-modal="true"
            aria-labelledby="appt-modal-title"
          >
            <h2
              id="appt-modal-title"
              className="text-lg font-bold text-text-primary"
            >
              {editingId ? "Edit appointment" : "New appointment"}
            </h2>
            {formError && (
              <p className="mt-3 text-sm text-red-700" role="alert">
                {formError}
              </p>
            )}
            <form onSubmit={onSubmit} className="mt-4 space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-text-secondary">
                  Title
                </label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className={inputClass}
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-text-secondary">
                  Status
                </label>
                <select
                  value={status}
                  onChange={(e) =>
                    setStatus(parseAppointmentStatus(e.target.value))
                  }
                  className={inputClass}
                  aria-label="Appointment status"
                >
                  {APPOINTMENT_STATUS_LIST.map((s) => (
                    <option key={s} value={s}>
                      {appointmentStatusLabel(s)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-text-secondary">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  className={inputClass}
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label
                    className="mb-1 block text-xs font-medium text-text-secondary"
                    htmlFor="appt-starts"
                  >
                    Start
                  </label>
                  <CrmPopoverDateTimeField
                    id="appt-starts"
                    value={startsLocal}
                    onChange={setStartsLocal}
                    aria-label="Start date and time"
                  />
                </div>
                <div>
                  <label
                    className="mb-1 block text-xs font-medium text-text-secondary"
                    htmlFor="appt-ends"
                  >
                    End
                  </label>
                  <CrmPopoverDateTimeField
                    id="appt-ends"
                    value={endsLocal}
                    onChange={setEndsLocal}
                    aria-label="End date and time"
                  />
                </div>
              </div>
              <div className="flex flex-wrap gap-2 pt-2">
                <button
                  type="submit"
                  disabled={pending}
                  className="rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-hover disabled:opacity-60"
                >
                  {pending ? "Saving…" : editingId ? "Save" : "Create"}
                </button>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="rounded-xl border border-border bg-white px-4 py-2 text-sm font-medium text-text-primary hover:bg-surface"
                >
                  Cancel
                </button>
                {editingId && (
                  <button
                    type="button"
                    onClick={() => void onDelete()}
                    disabled={pending}
                    className="ml-auto rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-800 hover:bg-red-100 disabled:opacity-60"
                  >
                    Delete
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function AppointmentList({
  items,
  emptyMessage,
  onEdit,
}: {
  items: AppointmentCalendarRow[];
  emptyMessage: string;
  onEdit: (row: AppointmentCalendarRow) => void;
}) {
  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-white py-16 text-center text-sm text-text-secondary">
        {emptyMessage}
      </div>
    );
  }

  return (
    <ul className="divide-y divide-border rounded-2xl border border-border bg-white shadow-sm">
      {items.map((row) => (
        <li key={row.id}>
          <button
            type="button"
            onClick={() => onEdit(row)}
            className="flex w-full items-start justify-between gap-4 px-5 py-4 text-left transition-colors hover:bg-surface/50"
          >
            <div className="min-w-0">
              <p className="font-medium text-text-primary">{row.title}</p>
              <div className="mt-1.5">
                <AppointmentStatusBadge status={row.status} />
              </div>
              {row.description && (
                <p className="mt-1 text-sm text-text-secondary line-clamp-1">
                  {row.description}
                </p>
              )}
            </div>
            <span className="shrink-0 text-sm text-text-secondary">
              {formatDateTime(row.starts_at)}
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}
