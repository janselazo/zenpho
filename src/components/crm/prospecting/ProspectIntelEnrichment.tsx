"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  enrichWebsiteContactsDeepAction,
  outscraperProspectSearchAction,
  apolloProspectPeopleAction,
  hunterProspectDomainAction,
  type HomepageContactHints,
} from "@/app/(crm)/actions/prospect-intel";
import type {
  MergedWebsiteContacts,
  OutscraperPlaceRow,
  ApolloPersonRow,
  HunterEmailRow,
} from "@/lib/crm/prospect-enrichment-types";
import ProspectIntelBusinessSnapshot from "@/components/crm/prospecting/ProspectIntelBusinessSnapshot";

export type ProspectWebsiteDeepStatus = {
  loading: boolean;
  contacts: MergedWebsiteContacts | null;
  error: string | null;
};

function domainFromUrl(u: string | null): string | null {
  if (!u?.trim()) return null;
  try {
    const url = new URL(/^https?:/i.test(u) ? u : `https://${u}`);
    return url.hostname.replace(/^www\./i, "");
  } catch {
    return null;
  }
}

type Props = {
  websiteUrl: string | null;
  listingPhone: string | null;
  googleMapsUri: string | null;
  businessLabel: string;
  addressLabel: string | null;
  homepageContactHints: HomepageContactHints | null;
  onPickEmail?: (email: string) => void;
  onPickPhone?: (phone: string) => void;
  /** When true, Business snapshot is not rendered (shown above IntelReportPanel by parent). */
  omitBusinessSnapshot?: boolean;
  /** Deep-crawl emails (deduped, ranked); empty when no website or after error. */
  onWebsiteEmailsChange?: (emails: string[]) => void;
  /** Full merged contacts + loading/error for the public-site fetch (server-side safe HTML only). */
  onWebsiteDeepStatusChange?: (status: ProspectWebsiteDeepStatus) => void;
};

export default function ProspectIntelEnrichment({
  websiteUrl,
  listingPhone,
  googleMapsUri,
  businessLabel,
  addressLabel,
  homepageContactHints,
  onPickEmail,
  onPickPhone,
  omitBusinessSnapshot = false,
  onWebsiteEmailsChange,
  onWebsiteDeepStatusChange,
}: Props) {
  const [deep, setDeep] = useState<MergedWebsiteContacts | null>(null);
  const [deepLoading, setDeepLoading] = useState(false);
  const [deepError, setDeepError] = useState<string | null>(null);

  const [outQuery, setOutQuery] = useState("");
  const [outRows, setOutRows] = useState<OutscraperPlaceRow[] | null>(null);
  const [outLoading, setOutLoading] = useState(false);
  const [outError, setOutError] = useState<string | null>(null);

  const [apolloPeople, setApolloPeople] = useState<ApolloPersonRow[] | null>(null);
  const [apolloLoading, setApolloLoading] = useState(false);
  const [apolloError, setApolloError] = useState<string | null>(null);

  const [hunterEmails, setHunterEmails] = useState<HunterEmailRow[] | null>(null);
  const [hunterLoading, setHunterLoading] = useState(false);
  const [hunterError, setHunterError] = useState<string | null>(null);

  type ScraperTool = "outscraper" | "apollo" | "hunter";
  const [activeTool, setActiveTool] = useState<ScraperTool | null>(null);

  const toggleScraper = useCallback((id: ScraperTool) => {
    setActiveTool((cur) => (cur === id ? null : id));
  }, []);

  useEffect(() => {
    setOutQuery([businessLabel, addressLabel].filter(Boolean).join(" ").trim());
  }, [businessLabel, addressLabel]);

  const pickEmailRef = useRef(onPickEmail);
  const pickPhoneRef = useRef(onPickPhone);
  const websiteEmailsCbRef = useRef(onWebsiteEmailsChange);
  const websiteDeepStatusCbRef = useRef(onWebsiteDeepStatusChange);
  pickEmailRef.current = onPickEmail;
  pickPhoneRef.current = onPickPhone;
  websiteEmailsCbRef.current = onWebsiteEmailsChange;
  websiteDeepStatusCbRef.current = onWebsiteDeepStatusChange;

  useEffect(() => {
    const notifyEmails = websiteEmailsCbRef.current;
    const notifyDeep = websiteDeepStatusCbRef.current;
    if (!websiteUrl?.trim()) {
      setDeep(null);
      setDeepError(null);
      setDeepLoading(false);
      notifyEmails?.([]);
      notifyDeep?.({ loading: false, contacts: null, error: null });
      return;
    }
    notifyEmails?.([]);
    notifyDeep?.({ loading: true, contacts: null, error: null });
    let cancelled = false;
    setDeep(null);
    setDeepLoading(true);
    setDeepError(null);
    void enrichWebsiteContactsDeepAction(websiteUrl).then((r) => {
      if (cancelled) return;
      setDeepLoading(false);
      const cb = websiteEmailsCbRef.current;
      if (r.ok) {
        setDeep(r.contacts);
        cb?.(r.contacts.emailsRanked);
        websiteDeepStatusCbRef.current?.({
          loading: false,
          contacts: r.contacts,
          error: null,
        });
        const first = r.contacts.emailsRanked[0];
        if (first) pickEmailRef.current?.(first);
        const ph = r.contacts.phones[0];
        if (ph) pickPhoneRef.current?.(ph);
      } else {
        setDeep(null);
        setDeepError(r.error);
        cb?.([]);
        websiteDeepStatusCbRef.current?.({
          loading: false,
          contacts: null,
          error: r.error,
        });
      }
    });
    return () => {
      cancelled = true;
    };
  }, [websiteUrl]);

  const domain = domainFromUrl(websiteUrl);

  const runOutscraper = useCallback(() => {
    const q = outQuery.trim();
    if (!q) return;
    setOutLoading(true);
    setOutError(null);
    void outscraperProspectSearchAction(q).then((r) => {
      setOutLoading(false);
      if (r.ok) setOutRows(r.rows);
      else setOutError(r.error);
    });
  }, [outQuery]);

  const runApollo = useCallback(() => {
    if (!domain) return;
    setApolloLoading(true);
    setApolloError(null);
    void apolloProspectPeopleAction(domain).then((r) => {
      setApolloLoading(false);
      if (r.ok) setApolloPeople(r.people);
      else setApolloError(r.error);
    });
  }, [domain]);

  const runHunter = useCallback(() => {
    if (!domain) return;
    const known = new Set<string>();
    homepageContactHints?.emails.forEach((e) => known.add(e.toLowerCase()));
    deep?.emailsRanked.forEach((e) => known.add(e.toLowerCase()));
    apolloPeople?.forEach((p) => {
      if (p.email) known.add(p.email.toLowerCase());
    });
    setHunterLoading(true);
    setHunterError(null);
    void hunterProspectDomainAction(domain, [...known]).then((r) => {
      setHunterLoading(false);
      if (r.ok) setHunterEmails(r.emails);
      else setHunterError(r.error);
    });
  }, [domain, homepageContactHints, deep, apolloPeople]);

  const badge = (label: string, cls: string) => (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${cls}`}>{label}</span>
  );

  const scraperTabClass = (id: ScraperTool) =>
    `inline-flex flex-wrap items-center gap-2 rounded-lg border px-3 py-2 text-left text-xs font-medium transition-colors ${
      activeTool === id
        ? "border-accent bg-accent/10 text-text-primary dark:bg-blue-500/15 dark:text-zinc-100"
        : "border-border bg-white text-text-secondary hover:bg-surface dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
    }`;

  return (
    <div className="space-y-6">
      {!omitBusinessSnapshot ? (
        <ProspectIntelBusinessSnapshot
          businessLabel={businessLabel}
          addressLabel={addressLabel}
          listingPhone={listingPhone}
          googleMapsUri={googleMapsUri}
          onPickPhone={onPickPhone}
        />
      ) : null}

      <div>
        <h3 className="text-xs font-semibold uppercase tracking-widest text-text-secondary/70 dark:text-zinc-500">
          Scrapers
        </h3>
        <p className="mt-1 text-xs text-text-secondary dark:text-zinc-500">
          Open a tool to run Maps export, Apollo people search, or Hunter domain emails. Fields stay hidden until you choose one.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => toggleScraper("outscraper")}
            className={scraperTabClass("outscraper")}
            aria-expanded={activeTool === "outscraper"}
          >
            <span className="font-semibold text-text-primary dark:text-zinc-100">Outscraper</span>
            {badge("Maps export", "bg-zinc-500/15 text-zinc-700 dark:text-zinc-300")}
          </button>
          <button
            type="button"
            onClick={() => toggleScraper("apollo")}
            className={scraperTabClass("apollo")}
            aria-expanded={activeTool === "apollo"}
          >
            <span className="font-semibold text-text-primary dark:text-zinc-100">Apollo</span>
            {badge("Decision makers", "bg-violet-500/15 text-violet-900 dark:text-violet-200")}
          </button>
          <button
            type="button"
            onClick={() => toggleScraper("hunter")}
            className={scraperTabClass("hunter")}
            aria-expanded={activeTool === "hunter"}
          >
            <span className="font-semibold text-text-primary dark:text-zinc-100">Hunter.io</span>
            {badge("Domain search", "bg-emerald-500/15 text-emerald-900 dark:text-emerald-200")}
          </button>
        </div>

        {activeTool === "outscraper" ? (
          <div className="mt-4 rounded-xl border border-border/80 p-4 dark:border-zinc-700/60">
            <div className="mt-0 flex flex-wrap gap-2">
              <input
                value={outQuery}
                onChange={(e) => setOutQuery(e.target.value)}
                placeholder="Search query for Maps…"
                className="min-w-[12rem] flex-1 rounded-lg border border-border px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
              />
              <button
                type="button"
                disabled={outLoading || !outQuery.trim()}
                onClick={runOutscraper}
                className="rounded-lg bg-accent px-3 py-2 text-xs font-semibold text-white shadow-sm hover:bg-accent-hover disabled:opacity-50"
              >
                {outLoading ? "Loading…" : "Run Outscraper"}
              </button>
            </div>
            {outError ? <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">{outError}</p> : null}
            {outRows && outRows.length > 0 ? (
              <ul className="mt-3 max-h-48 space-y-2 overflow-y-auto text-xs">
                {outRows.map((row, i) => (
                  <li key={i} className="rounded border border-border/60 p-2 dark:border-zinc-700/50">
                    <span className="font-medium text-text-primary dark:text-zinc-200">{row.name}</span>
                    {row.address ? <p className="text-text-secondary dark:text-zinc-500">{row.address}</p> : null}
                    {row.phone ? <p className="font-mono text-text-secondary dark:text-zinc-400">{row.phone}</p> : null}
                    {row.site ? (
                      <a href={row.site.startsWith("http") ? row.site : `https://${row.site}`} className="text-accent hover:underline" target="_blank" rel="noreferrer">
                        {row.site}
                      </a>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}

        {activeTool === "apollo" ? (
          <div className="mt-4 rounded-xl border border-border/80 p-4 dark:border-zinc-700/60">
            <p className="text-xs text-text-secondary dark:text-zinc-500">
              Uses company domain{domain ? ` (${domain})` : ""} with Apollo&apos;s People API Search. Use a
              master{" "}
              <code className="rounded bg-surface px-1 font-mono dark:bg-zinc-800">APOLLO_API_KEY</code> in
              .env.local. This API returns names and titles (often obfuscated last names); it does not return
              email or phone—use Hunter or your Apollo workflow for contact details.
            </p>
            <button
              type="button"
              disabled={apolloLoading || !domain}
              onClick={runApollo}
              className="mt-3 rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-surface disabled:opacity-50 dark:border-zinc-600 dark:hover:bg-zinc-800"
            >
              {apolloLoading ? "Loading…" : "Load top people (Apollo)"}
            </button>
            {apolloError ? <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">{apolloError}</p> : null}
            {apolloPeople && apolloPeople.length > 0 ? (
              <div className="mt-3 overflow-x-auto">
                <table className="w-full min-w-[28rem] border-collapse text-left text-xs">
                  <thead>
                    <tr className="border-b border-border dark:border-zinc-700">
                      <th className="py-2 pr-2">Name</th>
                      <th className="py-2 pr-2">Title</th>
                      <th className="py-2 pr-2">Email</th>
                      <th className="py-2 pr-2">Phone</th>
                      <th className="py-2">LinkedIn</th>
                    </tr>
                  </thead>
                  <tbody>
                    {apolloPeople.map((p, i) => (
                      <tr key={i} className="border-b border-border/60 dark:border-zinc-800">
                        <td className="py-2 pr-2 font-medium text-text-primary dark:text-zinc-200">{p.name}</td>
                        <td className="py-2 pr-2 text-text-secondary dark:text-zinc-400">{p.title ?? "—"}</td>
                        <td className="py-2 pr-2">
                          {p.email ? (
                            <button type="button" className="text-accent hover:underline" onClick={() => onPickEmail?.(p.email!)}>
                              {p.email}
                            </button>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="py-2 pr-2 font-mono text-text-secondary dark:text-zinc-400">
                          {p.phone ? (
                            <button type="button" className="hover:underline" onClick={() => onPickPhone?.(p.phone!)}>
                              {p.phone}
                            </button>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="py-2">
                          {p.linkedinUrl ? (
                            <a href={p.linkedinUrl} target="_blank" rel="noreferrer" className="text-accent hover:underline">
                              Profile
                            </a>
                          ) : (
                            "—"
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
          </div>
        ) : null}

        {activeTool === "hunter" ? (
          <div className="mt-4 rounded-xl border border-border/80 p-4 dark:border-zinc-700/60">
            <button
              type="button"
              disabled={hunterLoading || !domain}
              onClick={runHunter}
              className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-surface disabled:opacity-50 dark:border-zinc-600 dark:hover:bg-zinc-800"
            >
              {hunterLoading ? "Loading…" : "Domain search (Hunter)"}
            </button>
            {hunterError ? <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">{hunterError}</p> : null}
            {hunterEmails && hunterEmails.length > 0 ? (
              <ul className="mt-3 space-y-1 text-xs">
                {hunterEmails.map((h) => (
                  <li key={h.email}>
                    <button type="button" className="text-accent hover:underline" onClick={() => onPickEmail?.(h.email)}>
                      {h.email}
                    </button>
                    {h.position ? <span className="ml-2 text-text-secondary dark:text-zinc-500">{h.position}</span> : null}
                    {h.confidence != null ? (
                      <span className="ml-2 text-text-secondary dark:text-zinc-600">({h.confidence}%)</span>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
