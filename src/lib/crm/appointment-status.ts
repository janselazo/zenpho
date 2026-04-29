import type { LucideIcon } from "lucide-react";
import { CalendarSync, Check, Clock, X } from "lucide-react";

export type AppointmentStatus =
  | "scheduled"
  | "completed"
  | "cancelled"
  | "rescheduled";

export const APPOINTMENT_STATUS_LIST: readonly AppointmentStatus[] = [
  "scheduled",
  "completed",
  "cancelled",
  "rescheduled",
] as const;

export const APPOINTMENT_STATUS_SET = new Set<string>(APPOINTMENT_STATUS_LIST);

const DEFAULT_STATUS: AppointmentStatus = "scheduled";

export function parseAppointmentStatus(
  raw: string | null | undefined
): AppointmentStatus {
  if (raw == null || String(raw).trim() === "") return DEFAULT_STATUS;
  const v = String(raw).trim().toLowerCase();
  if (
    v === "scheduled" ||
    v === "completed" ||
    v === "cancelled" ||
    v === "rescheduled"
  ) {
    return v;
  }
  return DEFAULT_STATUS;
}

export function appointmentStatusLabel(s: AppointmentStatus): string {
  switch (s) {
    case "scheduled":
      return "Scheduled";
    case "completed":
      return "Completed";
    case "cancelled":
      return "Cancelled";
    case "rescheduled":
      return "Rescheduled";
    default:
      return "Scheduled";
  }
}

type StatusVisual = {
  Icon: LucideIcon;
  pill: string;
};

export function appointmentStatusVisual(s: AppointmentStatus): StatusVisual {
  switch (s) {
    case "scheduled":
      return {
        Icon: Clock,
        pill:
          "border-sky-300 bg-sky-50 text-sky-800 dark:border-sky-600 dark:bg-sky-950/60 dark:text-sky-100",
      };
    case "completed":
      return {
        Icon: Check,
        pill:
          "border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-700 dark:bg-emerald-950/55 dark:text-emerald-100",
      };
    case "cancelled":
      return {
        Icon: X,
        pill:
          "border-rose-200 bg-rose-50 text-rose-900 dark:border-rose-800 dark:bg-rose-950/45 dark:text-rose-100",
      };
    case "rescheduled":
      return {
        Icon: CalendarSync,
        pill:
          "border-amber-400 bg-amber-50 text-amber-950 dark:border-amber-500 dark:bg-amber-950/50 dark:text-amber-100",
      };
    default:
      return appointmentStatusVisual("scheduled");
  }
}

/** Event block: left accent + soft fill by status. */
export function appointmentEventBarClasses(s: AppointmentStatus): string {
  switch (s) {
    case "scheduled":
      return "border-l-[3px] border-l-sky-500 bg-sky-50/90 dark:bg-sky-950/35";
    case "completed":
      return "border-l-[3px] border-l-emerald-500 bg-emerald-50/90 dark:bg-emerald-950/30";
    case "cancelled":
      return "border-l-[3px] border-l-zinc-400 bg-zinc-100/90 opacity-80 dark:border-l-zinc-500 dark:bg-zinc-800/50";
    case "rescheduled":
      return "border-l-[3px] border-l-amber-500 bg-amber-50/95 dark:bg-amber-950/35";
    default:
      return appointmentEventBarClasses("scheduled");
  }
}
