/** SoldTools-style “Soon” pill for sidebar rows and headers */
export default function SoonBadge({ className = "" }: { className?: string }) {
  return (
    <span
      className={`shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-amber-900 dark:bg-amber-500/20 dark:text-amber-200 ${className}`}
    >
      Soon
    </span>
  );
}
