"use client";

import { useState } from "react";
import {
  deleteAppointment,
  updateAppointmentAction,
} from "@/app/(crm)/actions/crm";
import CrmPopoverDateTimeField, {
  formatDatetimeLocalInput,
} from "@/components/crm/CrmPopoverDateTimeField";
import type { LeadFollowUpAppointment } from "@/lib/crm/lead-follow-up-appointment";
import {
  APPOINTMENT_STATUS_LIST,
  appointmentStatusLabel,
  parseAppointmentStatus,
  type AppointmentStatus,
} from "@/lib/crm/appointment-status";

const inputClass =
  "w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100";

export default function LeadAppointmentEditModal({
  appointment,
  onClose,
}: {
  appointment: LeadFollowUpAppointment;
  onClose: () => void;
}) {
  const [title, setTitle] = useState(appointment.title);
  const [description, setDescription] = useState(
    appointment.description ?? ""
  );
  const [startsLocal, setStartsLocal] = useState(
    formatDatetimeLocalInput(new Date(appointment.starts_at))
  );
  const [endsLocal, setEndsLocal] = useState(
    formatDatetimeLocalInput(new Date(appointment.ends_at))
  );
  const [status, setStatus] = useState<AppointmentStatus>(
    parseAppointmentStatus(appointment.status)
  );
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

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
    const res = await updateAppointmentAction({
      id: appointment.id,
      title,
      description,
      starts_at: new Date(startT).toISOString(),
      ends_at: new Date(endT).toISOString(),
      status,
    });
    setPending(false);
    if ("error" in res && res.error) {
      setFormError(res.error);
      return;
    }
    onClose();
  }

  async function handleDelete() {
    if (!confirm("Delete this appointment?")) return;
    setPending(true);
    setFormError(null);
    const res = await deleteAppointment(appointment.id);
    setPending(false);
    if ("error" in res && res.error) {
      setFormError(res.error);
      return;
    }
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/40 p-4 sm:items-center"
      onClick={onClose}
      onKeyDown={(e) => e.key === "Escape" && onClose()}
      role="presentation"
    >
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-zinc-200 bg-white p-6 shadow-xl dark:border-zinc-700 dark:bg-zinc-950"
        role="dialog"
        onClick={(e) => e.stopPropagation()}
        aria-modal="true"
        aria-labelledby="lead-appt-edit-title"
      >
        <h2
          id="lead-appt-edit-title"
          className="text-lg font-bold text-zinc-900 dark:text-zinc-50"
        >
          Edit appointment
        </h2>
        {formError ? (
          <p className="mt-3 text-sm text-red-700 dark:text-red-400" role="alert">
            {formError}
          </p>
        ) : null}
        <form onSubmit={(e) => void onSubmit(e)} className="mt-4 space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-500">
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
            <label className="mb-1 block text-xs font-medium text-zinc-500">
              Status
            </label>
            <select
              value={status}
              onChange={(e) =>
                setStatus(parseAppointmentStatus(e.target.value))
              }
              className={inputClass}
            >
              {APPOINTMENT_STATUS_LIST.map((s) => (
                <option key={s} value={s}>
                  {appointmentStatusLabel(s)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-500">
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
                className="mb-1 block text-xs font-medium text-zinc-500"
                htmlFor="lead-appt-start"
              >
                Start
              </label>
              <CrmPopoverDateTimeField
                id="lead-appt-start"
                value={startsLocal}
                onChange={setStartsLocal}
                aria-label="Start date and time"
              />
            </div>
            <div>
              <label
                className="mb-1 block text-xs font-medium text-zinc-500"
                htmlFor="lead-appt-end"
              >
                End
              </label>
              <CrmPopoverDateTimeField
                id="lead-appt-end"
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
              className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60 dark:bg-blue-600 dark:hover:bg-blue-500"
            >
              {pending ? "Saving…" : "Save"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void handleDelete()}
              disabled={pending}
              className="ml-auto rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-800 hover:bg-red-100 disabled:opacity-60 dark:border-red-900 dark:bg-red-950/50 dark:text-red-200"
            >
              Delete
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
