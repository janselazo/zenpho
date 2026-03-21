"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import type { DateSelectArg, EventClickArg, EventInput } from "@fullcalendar/core";
import { createClient } from "@/lib/supabase/client";
import {
  createAppointmentAction,
  deleteAppointment,
  updateAppointmentAction,
} from "@/app/(crm)/actions/crm";

type Row = {
  id: string;
  title: string;
  description: string | null;
  starts_at: string;
  ends_at: string;
};

function formatForDatetimeLocal(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
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
  const [events, setEvents] = useState<EventInput[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startsLocal, setStartsLocal] = useState("");
  const [endsLocal, setEndsLocal] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const load = useCallback(async () => {
    if (!configured) return;
    try {
      const supabase = createClient();
      const { data, error: qErr } = await supabase
        .from("appointment")
        .select("id, title, description, starts_at, ends_at")
        .order("starts_at", { ascending: true });
      if (qErr) {
        setLoadError(qErr.message);
        return;
      }
      const rows = (data ?? []) as Row[];
      setLoadError(null);
      setEvents(
        rows.map((r) => ({
          id: r.id,
          title: r.title,
          start: r.starts_at,
          end: r.ends_at,
          extendedProps: { description: r.description ?? "" },
        }))
      );
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Failed to load");
    }
  }, [configured]);

  useEffect(() => {
    void load();
  }, [load]);

  const plugins = useMemo(
    () => [dayGridPlugin, timeGridPlugin, interactionPlugin],
    []
  );

  function openNew(preset?: { start: Date; end: Date }) {
    const { start, end } = preset ?? defaultNextHourWindow();
    setEditingId(null);
    setTitle("");
    setDescription("");
    setStartsLocal(formatForDatetimeLocal(start));
    setEndsLocal(formatForDatetimeLocal(end));
    setFormError(null);
    setModalOpen(true);
  }

  function onSelect(info: DateSelectArg) {
    openNew({ start: info.start, end: info.end });
  }

  function onEventClick(info: EventClickArg) {
    info.jsEvent.preventDefault();
    const start = info.event.start;
    if (!start) return;
    const end =
      info.event.end ?? new Date(start.getTime() + 60 * 60 * 1000);
    setEditingId(info.event.id);
    setTitle(info.event.title);
    setDescription(
      String(info.event.extendedProps.description ?? "")
    );
    setStartsLocal(formatForDatetimeLocal(start));
    setEndsLocal(formatForDatetimeLocal(end));
    setFormError(null);
    setModalOpen(true);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setPending(true);
    const startIso = new Date(startsLocal).toISOString();
    const endIso = new Date(endsLocal).toISOString();

    try {
      if (editingId) {
        const res = await updateAppointmentAction({
          id: editingId,
          title,
          description,
          starts_at: startIso,
          ends_at: endIso,
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

  if (!configured) {
    return (
      <p className="text-sm text-text-secondary">
        Configure Supabase to use the calendar.
      </p>
    );
  }

  return (
    <div className="crm-calendar rounded-2xl border border-border bg-white p-4 shadow-sm">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-text-secondary">
          Drag on the calendar to create, or click an event to edit.
        </p>
        <button
          type="button"
          onClick={() => openNew()}
          className="rounded-xl bg-accent px-4 py-2 text-xs font-semibold text-white hover:bg-accent-hover"
        >
          New appointment
        </button>
      </div>
      {loadError ? (
        <p className="mb-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
          {loadError}
        </p>
      ) : null}

      <FullCalendar
        plugins={plugins}
        initialView="dayGridMonth"
        headerToolbar={{
          left: "prev,next today",
          center: "title",
          right: "dayGridMonth,timeGridWeek,timeGridDay",
        }}
        height="auto"
        events={events}
        selectable
        selectMirror
        select={onSelect}
        eventClick={onEventClick}
        nowIndicator
      />

      {modalOpen ? (
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
            {formError ? (
              <p className="mt-3 text-sm text-red-700" role="alert">
                {formError}
              </p>
            ) : null}
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
                  <label className="mb-1 block text-xs font-medium text-text-secondary">
                    Start
                  </label>
                  <input
                    type="datetime-local"
                    value={startsLocal}
                    onChange={(e) => setStartsLocal(e.target.value)}
                    className={inputClass}
                    required
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-text-secondary">
                    End
                  </label>
                  <input
                    type="datetime-local"
                    value={endsLocal}
                    onChange={(e) => setEndsLocal(e.target.value)}
                    className={inputClass}
                    required
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
                {editingId ? (
                  <button
                    type="button"
                    onClick={() => void onDelete()}
                    disabled={pending}
                    className="ml-auto rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-800 hover:bg-red-100 disabled:opacity-60"
                  >
                    Delete
                  </button>
                ) : null}
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
