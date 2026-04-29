"use client";

import { useMemo, useState } from "react";
import AppointmentMonthGrid, {
  type AppointmentCalendarRow,
} from "@/components/app/AppointmentMonthGrid";
import { parseAppointmentStatus } from "@/lib/crm/appointment-status";
import type { LeadFollowUpAppointment } from "@/lib/crm/lead-follow-up-appointment";

export default function LeadAppointmentsMonthCalendar({
  appointments,
  onAddOnDay,
  onEditEvent,
}: {
  appointments: LeadFollowUpAppointment[];
  onAddOnDay: (day: Date) => void;
  onEditEvent: (appt: LeadFollowUpAppointment) => void;
}) {
  const [visibleMonth, setVisibleMonth] = useState(() => {
    const n = new Date();
    return new Date(n.getFullYear(), n.getMonth(), 1);
  });

  const rows: AppointmentCalendarRow[] = useMemo(
    () =>
      appointments.map((a) => ({
        id: a.id,
        title: a.title,
        description: a.description ?? null,
        starts_at: a.starts_at,
        ends_at: a.ends_at,
        status: parseAppointmentStatus(a.status),
      })),
    [appointments]
  );

  const byId = useMemo(() => {
    const m = new Map<string, LeadFollowUpAppointment>();
    for (const a of appointments) m.set(a.id, a);
    return m;
  }, [appointments]);

  return (
    <AppointmentMonthGrid
      rows={rows}
      visibleMonth={visibleMonth}
      onPrevMonth={() =>
        setVisibleMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1))
      }
      onNextMonth={() =>
        setVisibleMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1))
      }
      onToday={() => {
        const n = new Date();
        setVisibleMonth(new Date(n.getFullYear(), n.getMonth(), 1));
      }}
      onSelectDay={onAddOnDay}
      onEditEvent={(r) => {
        const appt = byId.get(r.id);
        if (appt) onEditEvent(appt);
      }}
    />
  );
}
