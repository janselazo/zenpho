type BadgeStatus = "live" | "beta" | "building" | "research";

interface BadgeProps {
  status: BadgeStatus;
}

const statusStyles: Record<BadgeStatus, string> = {
  live: "border-emerald-200/90 bg-emerald-50 text-emerald-800 dark:border-emerald-800/55 dark:bg-emerald-950/40 dark:text-emerald-200",
  beta: "bg-accent/12 text-accent border-accent/25",
  building: "bg-accent-warm/15 text-accent-warm border-accent-warm/30",
  research: "bg-surface text-text-secondary border-border",
};

const statusLabels: Record<BadgeStatus, string> = {
  live: "Online",
  beta: "BETA",
  building: "IN DEV",
  research: "R&D",
};

export default function Badge({ status }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold ${status === "live" ? "tracking-normal" : "uppercase tracking-wider"} ${statusStyles[status]}`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full animate-pulse-glow ${
          status === "live"
            ? "bg-emerald-500"
            : status === "beta"
              ? "bg-accent"
              : status === "building"
                ? "bg-accent-warm"
                : "bg-text-secondary"
        }`}
      />
      {statusLabels[status]}
    </span>
  );
}
