/**
 * Folded note outline (inherits `currentColor`) with orange ruled lines inside.
 * Used for lead Notes actions in the pipeline and table.
 */
export default function LeadNotesGlyphIcon({
  className,
}: {
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      <path
        d="M15.5 3.25H6.75a2.75 2.75 0 0 0-2.75 2.75v12.5a2.75 2.75 0 0 0 2.75 2.75h12.5a2.75 2.75 0 0 0 2.75-2.75V9.5L15.5 3.25Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M15.5 3.25v5.5h5.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M8.5 11.5h7M8.5 14h7M8.5 16.5h5"
        stroke="#f97316"
        strokeWidth="1.35"
        strokeLinecap="round"
      />
    </svg>
  );
}
