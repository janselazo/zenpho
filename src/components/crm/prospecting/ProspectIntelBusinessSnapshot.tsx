"use client";

function badge(label: string, cls: string) {
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${cls}`}
    >
      {label}
    </span>
  );
}

type Props = {
  businessLabel: string;
  addressLabel: string | null;
  listingPhone: string | null;
  googleMapsUri: string | null;
  onPickPhone?: (phone: string) => void;
};

export default function ProspectIntelBusinessSnapshot({
  businessLabel,
  addressLabel,
  listingPhone,
  googleMapsUri,
  onPickPhone,
}: Props) {
  return (
    <div>
      <h3 className="text-xs font-semibold uppercase tracking-widest text-text-secondary/70 dark:text-zinc-500">
        Business snapshot
      </h3>
      <div className="mt-3 rounded-xl border border-border bg-surface/40 p-4 dark:border-zinc-700/80 dark:bg-zinc-900/40">
        <p className="font-medium text-text-primary dark:text-zinc-100">{businessLabel}</p>
        {addressLabel ? (
          <p className="mt-1 text-sm text-text-secondary dark:text-zinc-400">{addressLabel}</p>
        ) : null}
        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          {listingPhone ? (
            <span className="text-text-secondary dark:text-zinc-400">
              {badge("Google listing", "bg-blue-500/15 text-blue-800 dark:text-blue-300")} Phone:{" "}
              <button
                type="button"
                className="font-mono text-accent hover:underline dark:text-blue-400"
                onClick={() => onPickPhone?.(listingPhone)}
              >
                {listingPhone}
              </button>
            </span>
          ) : (
            <span className="text-text-secondary dark:text-zinc-500">No phone on Google listing.</span>
          )}
          {googleMapsUri ? (
            <a
              href={googleMapsUri}
              target="_blank"
              rel="noreferrer"
              className="text-accent hover:underline dark:text-blue-400"
            >
              Open in Google Maps
            </a>
          ) : null}
        </div>
        <p className="mt-3 text-[11px] text-text-secondary dark:text-zinc-500">
          Contact data may be incomplete or outdated. Verify before outreach; comply with applicable laws and
          vendor terms (Google, Outscraper, Apollo, Hunter).
        </p>
      </div>
    </div>
  );
}
