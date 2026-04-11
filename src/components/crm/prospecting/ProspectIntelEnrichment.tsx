"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  enrichWebsiteContactsDeepAction,
  outscraperProspectSearchAction,
  apolloProspectPeopleAction,
  apolloEnrichProspectPeopleAction,
  hunterProspectDomainAction,
  type HomepageContactHints,
} from "@/app/(crm)/actions/prospect-intel";
import type {
  ApolloEnrichmentById,
  ApolloPersonEnrichDescriptor,
  ApolloPersonRow,
  HunterEmailRow,
  MergedWebsiteContacts,
  OutscraperPlaceRow,
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

function linkedInLinkLabel(url: string): string {
  try {
    const u = new URL(url);
    const parts = u.pathname.split("/").filter(Boolean);
    const last = parts[parts.length - 1];
    if (last && last.length <= 44) return decodeURIComponent(last);
  } catch {
    /* ignore */
  }
  return "Profile";
}

function apolloLocationLabel(p: ApolloPersonRow): string {
  const bits = [p.personCity, p.personState, p.personCountry].filter(Boolean);
  return bits.length ? bits.join(", ") : "—";
}

function apolloEmailOnFileLabel(hasEmail: boolean | null | undefined): string {
  if (hasEmail === true) return "Yes";
  if (hasEmail === false) return "No";
  return "—";
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
  const [apolloEnrichLoading, setApolloEnrichLoading] = useState(false);
  const apolloGenRef = useRef(0);
  const [apolloEnrichError, setApolloEnrichError] = useState<string | null>(null);

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

  const mergeApolloEnrichment = useCallback(
    (rows: ApolloPersonRow[], byId: Record<string, ApolloEnrichmentById>): ApolloPersonRow[] =>
      rows.map((row) => {
        const id = row.apolloPersonId;
        if (!id) return row;
        const e = byId[id];
        if (!e) return row;
        return {
          ...row,
          email: row.email ?? e.email,
          phone: row.phone ?? e.phone,
          linkedinUrl: row.linkedinUrl ?? e.linkedinUrl,
          emailStatus: e.emailStatus ?? row.emailStatus ?? null,
          headline: e.headline ?? row.headline ?? null,
        };
      }),
    []
  );

  const runApollo = useCallback(() => {
    if (!domain) return;
    const gen = ++apolloGenRef.current;
    setApolloLoading(true);
    setApolloError(null);
    setApolloEnrichError(null);
    void apolloProspectPeopleAction(domain).then((r) => {
      if (apolloGenRef.current !== gen) return;
      setApolloLoading(false);
      if (!r.ok) {
        setApolloError(r.error);
        return;
      }
      const base = r.people;
      setApolloPeople(base);
      const descriptors: ApolloPersonEnrichDescriptor[] = [];
      for (const p of base) {
        const id = p.apolloPersonId;
        if (!id) continue;
        descriptors.push({
          id,
          firstName: p.firstName,
          organizationName: p.organizationName,
        });
      }
      if (descriptors.length === 0) return;
      setApolloEnrichLoading(true);
      void apolloEnrichProspectPeopleAction(domain, descriptors).then((er) => {
        if (apolloGenRef.current !== gen) return;
        setApolloEnrichLoading(false);
        if (!er.ok) {
          setApolloEnrichError(er.error);
          return;
        }
        setApolloPeople(mergeApolloEnrichment(base, er.byId));
      });
    });
  }, [domain, mergeApolloEnrichment]);

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
          Open a tool to run Maps export, Apollo people search, or Hunter domain emails. Results stay hidden until you
          choose one.
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
            {badge("People search", "bg-violet-500/15 text-violet-900 dark:text-violet-200")}
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
              Uses company domain ({domain?.trim() || "barkforcuts.com"}) with Apollo People Search, then People
              Enrichment (
              <code className="rounded bg-surface px-1 font-mono dark:bg-zinc-800">/people/match</code> with{" "}
              <code className="rounded bg-surface px-1 font-mono dark:bg-zinc-800">reveal_personal_emails</code>
              ) to load work email, LinkedIn, and work phones when Apollo includes them on the enriched record. Search
              never returns email or phone—it only shows flags (e.g. email on file, direct-dial hints). Requires a master{" "}
              <code className="rounded bg-surface px-1 font-mono dark:bg-zinc-800">APOLLO_API_KEY</code> in{" "}
              <code className="rounded bg-surface px-1 font-mono dark:bg-zinc-800">.env.local</code> and consumes Apollo
              credits. Full mobile/direct-dial reveal often needs Apollo webhook settings; use Hunter for more domain
              emails if needed.
            </p>
            <button
              type="button"
              disabled={apolloLoading || apolloEnrichLoading || !domain}
              onClick={runApollo}
              className="mt-3 rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-surface disabled:opacity-50 dark:border-zinc-600 dark:hover:bg-zinc-800"
            >
              {apolloLoading
                ? "Searching…"
                : apolloEnrichLoading
                  ? "Enriching contacts…"
                  : "Load top people (Apollo)"}
            </button>
            {apolloEnrichLoading ? (
              <p className="mt-2 text-xs text-text-secondary dark:text-zinc-500">
                Fetching emails, LinkedIn, and phone from Apollo enrichment…
              </p>
            ) : null}
            {apolloError ? <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">{apolloError}</p> : null}
            {apolloEnrichError ? (
              <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">{apolloEnrichError}</p>
            ) : null}
            {apolloPeople && apolloPeople.length > 0 ? (
              <div className="mt-3 overflow-x-auto">
                <table className="w-full min-w-[44rem] border-collapse text-left text-xs">
                  <thead>
                    <tr className="border-b border-border dark:border-zinc-700">
                      <th className="py-2 pr-2">Name</th>
                      <th className="py-2 pr-2">Title</th>
                      <th className="py-2 pr-2">Company</th>
                      <th className="py-2 pr-2">Apollo</th>
                      <th className="py-2 pr-2">Location</th>
                      <th className="py-2 pr-2">Email</th>
                      <th className="py-2 pr-2">Phone</th>
                      <th className="py-2">LinkedIn</th>
                    </tr>
                  </thead>
                  <tbody>
                    {apolloPeople.map((p, i) => (
                      <tr key={p.apolloPersonId ?? `apollo-${i}`} className="border-b border-border/60 dark:border-zinc-800">
                        <td className="py-2 pr-2 font-medium text-text-primary dark:text-zinc-200">{p.name}</td>
                        <td className="py-2 pr-2 text-text-secondary dark:text-zinc-400">
                          <div className="max-w-[14rem]">
                            <div>{p.title ?? "—"}</div>
                            {p.headline ? (
                              <div className="mt-0.5 text-[10px] leading-snug text-text-secondary/85 dark:text-zinc-500">
                                {p.headline}
                              </div>
                            ) : null}
                          </div>
                        </td>
                        <td className="py-2 pr-2 text-text-secondary dark:text-zinc-400">
                          {p.organizationName ?? "—"}
                        </td>
                        <td className="py-2 pr-2 align-top text-[10px] leading-snug text-text-secondary dark:text-zinc-500">
                          <div>Email on file: {apolloEmailOnFileLabel(p.hasEmail)}</div>
                          <div
                            className="mt-0.5 max-w-[11rem] truncate"
                            title={p.hasDirectPhone ?? undefined}
                          >
                            Direct dial: {p.hasDirectPhone?.trim() ? p.hasDirectPhone : "—"}
                          </div>
                        </td>
                        <td className="py-2 pr-2 text-text-secondary dark:text-zinc-400">{apolloLocationLabel(p)}</td>
                        <td className="py-2 pr-2">
                          {p.email ? (
                            <button
                              type="button"
                              className="text-accent hover:underline"
                              onClick={() => onPickEmail?.(p.email!)}
                            >
                              {p.email}
                            </button>
                          ) : p.emailStatus ? (
                            <span
                              className="text-text-secondary dark:text-zinc-500"
                              title={`Apollo email status: ${p.emailStatus}`}
                            >
                              {p.emailStatus}
                            </span>
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
                            <a
                              href={p.linkedinUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-block max-w-[10rem] truncate align-bottom text-accent hover:underline"
                              title={p.linkedinUrl}
                              aria-label={`LinkedIn profile: ${p.linkedinUrl}`}
                            >
                              {linkedInLinkLabel(p.linkedinUrl)}
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
