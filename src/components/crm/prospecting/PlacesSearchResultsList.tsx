"use client";

import { useCallback, useState, type ReactNode } from "react";
import { Building2, ExternalLink } from "lucide-react";
import type { PlacesSearchPlace } from "@/lib/crm/places-types";
import {
  googleFaviconUrl,
  initialsFromName,
  primaryPlaceTypeLabel,
  websiteHostnameFromUri,
} from "@/lib/crm/places-search-ui";

function highlightFirstMatch(text: string, needle: string): ReactNode {
  const n = needle.trim();
  if (!n) return text;
  const lower = text.toLowerCase();
  const idx = lower.indexOf(n.toLowerCase());
  if (idx < 0) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="rounded-sm bg-sky-200/90 px-0.5 font-semibold text-text-primary dark:bg-sky-500/35 dark:text-zinc-50">
        {text.slice(idx, idx + n.length)}
      </mark>
      {text.slice(idx + n.length)}
    </>
  );
}

function PlaceLogo({
  name,
  websiteUri,
}: {
  name: string;
  websiteUri: string | null;
}) {
  const host = websiteHostnameFromUri(websiteUri);
  const src = host ? googleFaviconUrl(host) : null;
  const [failed, setFailed] = useState(!src);

  const onError = useCallback(() => setFailed(true), []);

  if (failed || !src) {
    return (
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border/80 bg-surface/80 text-text-secondary dark:border-zinc-700 dark:bg-zinc-800/80 dark:text-zinc-400">
        <span className="text-xs font-bold tracking-tight">{initialsFromName(name)}</span>
      </div>
    );
  }

  return (
    <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-xl border border-border/80 bg-white dark:border-zinc-700 dark:bg-zinc-900">
      {/* eslint-disable-next-line @next/next/no-img-element -- external favicon; small asset */}
      <img
        src={src}
        alt=""
        width={44}
        height={44}
        className="h-full w-full object-contain p-1.5"
        onError={onError}
      />
    </div>
  );
}

type Props = {
  places: PlacesSearchPlace[];
  onlyNoWebsite: boolean;
  /** Total rows from Text Search before client-side “no website” filter (defaults to `places.length`). */
  searchResultCount?: number;
  highlightQuery: string;
  onViewReport: (place: PlacesSearchPlace) => void;
};

export default function PlacesSearchResultsList({
  places,
  onlyNoWebsite,
  searchResultCount,
  highlightQuery,
  onViewReport,
}: Props) {
  const fullCount = searchResultCount ?? places.length;
  const hiddenWithSite =
    onlyNoWebsite && fullCount > places.length ? fullCount - places.length : 0;

  if (places.length === 0) return null;

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-md dark:border-zinc-800 dark:bg-zinc-900/40 dark:shadow-none">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/80 px-4 py-3 dark:border-zinc-800">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-text-secondary/70 dark:text-zinc-500">
            Google Maps results
          </p>
          <p className="text-xs text-text-secondary dark:text-zinc-400">
            {places.length} listing{places.length === 1 ? "" : "s"}
            {onlyNoWebsite
              ? hiddenWithSite > 0
                ? ` · ${hiddenWithSite} with a website hidden`
                : " · no website on listing"
              : ""}
          </p>
        </div>
        <span className="rounded-full bg-surface px-3 py-1 text-[11px] font-medium text-text-secondary dark:bg-zinc-800 dark:text-zinc-300">
          Text Search
        </span>
      </div>

      <ul className="divide-y divide-border/70 dark:divide-zinc-800">
        {places.map((p) => {
          const typeLabel = primaryPlaceTypeLabel(p.types);
          const website = p.websiteUri?.trim() || null;
          const subParts = [
            website,
            p.formattedAddress ?? null,
            p.rating != null
              ? `${p.rating}★ (${p.userRatingCount ?? 0} reviews)`
              : null,
          ].filter(Boolean);

          return (
            <li key={p.id}>
              <div className="flex gap-3 px-4 py-3.5 transition-colors hover:bg-surface/50 dark:hover:bg-zinc-800/40">
                <PlaceLogo name={p.name} websiteUri={website} />
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] text-text-secondary dark:text-zinc-500">
                    <span className="font-medium text-text-secondary/80 dark:text-zinc-400">
                      Google Maps
                    </span>
                    <span className="mx-1 text-border dark:text-zinc-600">·</span>
                    {typeLabel}
                  </p>
                  <p className="mt-0.5 text-sm font-semibold text-text-primary dark:text-zinc-100">
                    {highlightFirstMatch(p.name, highlightQuery)}
                  </p>
                  <p className="mt-0.5 line-clamp-2 text-xs text-text-secondary dark:text-zinc-400">
                    {subParts.join(" · ")}
                  </p>
                  {(p.nationalPhoneNumber || p.internationalPhoneNumber) && (
                    <p className="mt-1 font-mono text-[11px] text-text-secondary dark:text-zinc-500">
                      {p.nationalPhoneNumber || p.internationalPhoneNumber}
                    </p>
                  )}
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    {website ? (
                      <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-800 dark:text-emerald-300">
                        Has website
                      </span>
                    ) : (
                      <span className="rounded-full bg-zinc-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-text-secondary dark:text-zinc-400">
                        No website
                      </span>
                    )}
                    {website ? (
                      <a
                        href={website}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] font-medium text-accent hover:underline dark:text-blue-400"
                      >
                        Open site
                        <ExternalLink className="h-3 w-3 opacity-70" />
                      </a>
                    ) : null}
                    {p.googleMapsUri ? (
                      <a
                        href={p.googleMapsUri}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] font-medium text-accent hover:underline dark:text-blue-400"
                      >
                        Maps
                        <ExternalLink className="h-3 w-3 opacity-70" />
                      </a>
                    ) : null}
                  </div>
                </div>
                <div className="flex shrink-0 flex-col justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => onViewReport(p)}
                    className="rounded-full border border-border bg-white px-4 py-2 text-xs font-semibold text-text-primary shadow-sm hover:bg-surface dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
                  >
                    View report
                  </button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      <div className="border-t border-border/80 p-3 dark:border-zinc-800">
        <p className="text-center text-[11px] text-text-secondary dark:text-zinc-500">
          <Building2 className="mr-1 inline-block h-3.5 w-3.5 align-text-bottom opacity-70" />
          Results from Google Places API · logos use site favicons when a URL is listed
        </p>
      </div>
    </div>
  );
}
