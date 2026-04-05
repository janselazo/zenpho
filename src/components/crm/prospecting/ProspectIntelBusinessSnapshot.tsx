"use client";

import type { ProspectSocialUrls } from "@/lib/crm/prospect-enrichment-types";
import { Facebook, Instagram, Linkedin, Mail, Twitter } from "lucide-react";

function listingSiteLabel(raw: string): string {
  try {
    const u = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
    const host = u.hostname.replace(/^www\./i, "");
    return host || raw;
  } catch {
    return raw.length > 56 ? `${raw.slice(0, 54)}…` : raw;
  }
}

function badge(label: string, cls: string) {
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${cls}`}
    >
      {label}
    </span>
  );
}

function googleBusinessStatusLabel(status: string): string {
  const map: Record<string, string> = {
    OPERATIONAL: "Active on Google Maps",
    CLOSED_TEMPORARILY: "Temporarily closed",
    CLOSED_PERMANENTLY: "Permanently closed",
    FUTURE_OPENING: "Opening soon",
  };
  return map[status] ?? status.replace(/_/g, " ").toLowerCase();
}

type Props = {
  businessLabel: string;
  addressLabel: string | null;
  listingPhone: string | null;
  googleMapsUri: string | null;
  onPickPhone?: (phone: string) => void;
  /** When true, this row came from URL research—Places phone/Maps are not in scope. */
  researchFromUrl?: boolean;
  /** Shown for URL research (canonical fetched URL). */
  fetchedPageUrl?: string | null;
  /** Google Places listing website (shown in embedded overview next to phone/maps). */
  listingWebsiteUri?: string | null;
  /** Rule-based GTM insight (no separate “Summary” heading). */
  insightSummary?: string | null;
  /** Google Places business lifecycle when available (e.g. OPERATIONAL). */
  googleBusinessStatus?: string | null;
  /** When true, render without outer card chrome (parent provides border). */
  embedded?: boolean;
  /** Best public email from website scan / homepage (mailto + prefills lead form on click). */
  contactEmail?: string | null;
  /** Social profile URLs from crawled site (Google listing rarely exposes these via API). */
  socialUrls?: ProspectSocialUrls | null;
  onPickEmail?: (email: string) => void;
};

const channelBtnClass =
  "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border/80 text-text-primary transition hover:border-accent/50 hover:bg-surface dark:border-zinc-600 dark:hover:border-blue-500/40 dark:hover:bg-zinc-800/80";

function ReachOutChannels({
  contactEmail,
  socialUrls,
  onPickEmail,
}: {
  contactEmail?: string | null;
  socialUrls?: ProspectSocialUrls | null;
  onPickEmail?: (email: string) => void;
}) {
  const s = socialUrls;
  const email = contactEmail?.trim() || null;
  const has =
    email ||
    s?.facebook ||
    s?.instagram ||
    s?.linkedin ||
    s?.twitter;
  if (!has) return null;

  return (
    <div className="mt-3 flex flex-col gap-2">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-text-secondary/70 dark:text-zinc-500">
        Reach out
      </p>
      <div className="flex flex-wrap items-center gap-2">
        {email ? (
          <a
            href={`mailto:${encodeURIComponent(email)}`}
            className={channelBtnClass}
            title={email}
            aria-label={`Email ${email}`}
            onClick={() => onPickEmail?.(email)}
          >
            <Mail className="h-4 w-4 text-accent dark:text-blue-400" aria-hidden />
          </a>
        ) : null}
        {s?.facebook ? (
          <a
            href={s.facebook}
            target="_blank"
            rel="noreferrer"
            className={channelBtnClass}
            title="Facebook"
            aria-label="Open Facebook profile"
          >
            <Facebook className="h-4 w-4 text-[#1877F2]" aria-hidden />
          </a>
        ) : null}
        {s?.instagram ? (
          <a
            href={s.instagram}
            target="_blank"
            rel="noreferrer"
            className={channelBtnClass}
            title="Instagram"
            aria-label="Open Instagram profile"
          >
            <Instagram className="h-4 w-4 text-pink-600 dark:text-pink-400" aria-hidden />
          </a>
        ) : null}
        {s?.linkedin ? (
          <a
            href={s.linkedin}
            target="_blank"
            rel="noreferrer"
            className={channelBtnClass}
            title="LinkedIn"
            aria-label="Open LinkedIn"
          >
            <Linkedin className="h-4 w-4 text-[#0A66C2]" aria-hidden />
          </a>
        ) : null}
        {s?.twitter ? (
          <a
            href={s.twitter}
            target="_blank"
            rel="noreferrer"
            className={channelBtnClass}
            title="X / Twitter"
            aria-label="Open X or Twitter profile"
          >
            <Twitter className="h-4 w-4 text-text-primary dark:text-zinc-200" aria-hidden />
          </a>
        ) : null}
      </div>
      <p className="text-[10px] text-text-secondary/90 dark:text-zinc-500">
        Icons use links found on fetched public pages (homepage and contact-style paths). Google&apos;s listing API
        here does not include social profile fields.
      </p>
    </div>
  );
}

export default function ProspectIntelBusinessSnapshot({
  businessLabel,
  addressLabel,
  listingPhone,
  googleMapsUri,
  onPickPhone,
  researchFromUrl = false,
  fetchedPageUrl,
  listingWebsiteUri = null,
  insightSummary = null,
  googleBusinessStatus = null,
  embedded = false,
  contactEmail = null,
  socialUrls = null,
  onPickEmail,
}: Props) {
  const shell = embedded
    ? "min-w-0 sm:flex sm:min-h-0 sm:flex-col"
    : "h-full min-w-0 rounded-xl border border-border bg-surface/30 p-4 dark:border-zinc-700/80 dark:bg-zinc-900/40 sm:flex sm:min-h-0 sm:flex-col";

  return (
    <div className={shell}>
      <p className="text-[11px] font-semibold uppercase tracking-widest text-text-secondary/60 dark:text-zinc-500">
        Business snapshot
      </p>
      <div className="mt-2 flex min-h-0 flex-1 flex-col">
        <p className="font-medium text-text-primary dark:text-zinc-100">{businessLabel}</p>
        {addressLabel ? (
          <p className="mt-1 text-sm text-text-secondary dark:text-zinc-400">{addressLabel}</p>
        ) : null}
        {!researchFromUrl && googleBusinessStatus?.trim() ? (
          <p className="mt-2 flex flex-wrap items-center gap-2 text-xs">
            {badge(
              googleBusinessStatus === "OPERATIONAL" ? "Active listing" : "Google status",
              googleBusinessStatus === "OPERATIONAL"
                ? "bg-emerald-500/15 text-emerald-900 dark:text-emerald-300"
                : "bg-amber-500/15 text-amber-950 dark:text-amber-200"
            )}
            <span className="text-text-secondary dark:text-zinc-400">
              {googleBusinessStatusLabel(googleBusinessStatus)}
            </span>
          </p>
        ) : null}
        {embedded && listingWebsiteUri?.trim() ? (
          <p className="mt-2 text-sm">
            <span className="text-text-secondary dark:text-zinc-500">Website </span>
            <a
              href={listingWebsiteUri.trim()}
              target="_blank"
              rel="noreferrer"
              className="break-all font-medium text-accent hover:underline dark:text-blue-400"
            >
              {listingSiteLabel(listingWebsiteUri.trim())}
            </a>
          </p>
        ) : null}
        {fetchedPageUrl?.trim() ? (
          <p className="mt-2 text-xs text-text-secondary dark:text-zinc-400">
            Fetched page:{" "}
            <a
              href={fetchedPageUrl}
              target="_blank"
              rel="noreferrer"
              className="break-all text-accent hover:underline dark:text-blue-400"
            >
              {fetchedPageUrl}
            </a>
          </p>
        ) : null}
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-xs">
          {researchFromUrl ? (
            <span className="text-text-secondary dark:text-zinc-500">
              {badge("URL research", "bg-zinc-500/15 text-zinc-700 dark:text-zinc-300")}
              Google Places phone and Maps are available when you open a report from{" "}
              <span className="font-medium text-text-primary dark:text-zinc-200">Local Business</span>.
            </span>
          ) : listingPhone ? (
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
          {!researchFromUrl && googleMapsUri ? (
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
        <ReachOutChannels
          contactEmail={contactEmail}
          socialUrls={socialUrls}
          onPickEmail={onPickEmail}
        />
        {insightSummary?.trim() ? (
          <div className="mt-4 border-t border-border/60 pt-4 dark:border-zinc-700/60">
            <p className="text-sm leading-relaxed text-text-primary dark:text-zinc-100">
              {insightSummary.trim()}
            </p>
          </div>
        ) : null}
        {embedded ? null : (
          <p className="mt-auto pt-3 text-[11px] text-text-secondary dark:text-zinc-500">
            Contact data may be incomplete or outdated. Verify before outreach; comply with applicable laws and
            vendor terms (Google, Outscraper, Apollo, Hunter).
          </p>
        )}
      </div>
    </div>
  );
}
