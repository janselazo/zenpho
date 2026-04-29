import {
  appointmentStatusLabel,
  appointmentStatusVisual,
  type AppointmentStatus,
} from "@/lib/crm/appointment-status";

export default function AppointmentStatusBadge({
  status,
  className = "",
}: {
  status: AppointmentStatus;
  className?: string;
}) {
  const { Icon, pill } = appointmentStatusVisual(status);
  const label = appointmentStatusLabel(status);
  return (
    <span
      className={`inline-flex max-w-full items-center gap-0.5 rounded-full border px-1.5 py-0.5 text-[10px] font-semibold leading-tight ${pill} ${className}`}
    >
      <Icon className="h-3 w-3 shrink-0 opacity-90" aria-hidden />
      <span className="truncate">{label}</span>
    </span>
  );
}
