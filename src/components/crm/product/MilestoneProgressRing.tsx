"use client";

const VIEW = 32;
const CX = 16;
const CY = 16;
const R = 12.5;
const CIRC = 2 * Math.PI * R;

type Props = {
  completed: number;
  total: number;
  size?: number;
  className?: string;
  "aria-label"?: string;
};

/**
 * Circular progress for milestone task completion (completed / total).
 */
export function MilestoneProgressRing({
  completed,
  total,
  size = 40,
  className,
  "aria-label": ariaLabel,
}: Props) {
  const pct =
    total <= 0 ? 0 : Math.min(100, Math.round((completed / total) * 100));
  const full = total > 0 && completed >= total;
  const dash = (pct / 100) * CIRC;

  const label =
    ariaLabel ??
    (total <= 0
      ? "No tasks for this milestone"
      : `${pct}% complete, ${completed} of ${total} tasks done`);

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${VIEW} ${VIEW}`}
      className={className}
      role="img"
      aria-label={label}
    >
      {full ? (
        <circle
          cx={CX}
          cy={CY}
          r={R}
          className="fill-violet-500 stroke-violet-400 dark:fill-violet-500 dark:stroke-violet-300"
          strokeWidth={1.5}
        />
      ) : (
        <>
          <circle
            cx={CX}
            cy={CY}
            r={R}
            fill="none"
            className="stroke-zinc-300 dark:stroke-zinc-600"
            strokeWidth={2}
          />
          {total > 0 && pct > 0 ? (
            <circle
              cx={CX}
              cy={CY}
              r={R}
              fill="none"
              className="stroke-amber-400 dark:stroke-amber-400"
              strokeWidth={2}
              strokeLinecap="round"
              strokeDasharray={`${dash} ${CIRC}`}
              transform={`rotate(-90 ${CX} ${CY})`}
            />
          ) : null}
        </>
      )}
    </svg>
  );
}
