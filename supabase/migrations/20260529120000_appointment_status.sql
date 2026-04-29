-- Appointment lifecycle for calendar UI (Scheduled, Completed, Cancelled, Rescheduled).
alter table public.appointment
  add column if not exists status text not null default 'scheduled';

alter table public.appointment
  drop constraint if exists appointment_status_check;

alter table public.appointment
  add constraint appointment_status_check
    check (
      lower(trim(status)) in (
        'scheduled',
        'completed',
        'cancelled',
        'rescheduled'
      )
    );

comment on column public.appointment.status is
  'scheduled | completed | cancelled | rescheduled (calendar + reporting).';
