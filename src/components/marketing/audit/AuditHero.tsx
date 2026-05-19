"use client";

/**
 * Renaissance/Editorial-styled hero for the Business Audit page.
 *
 * Uses the new design's `.audit-hero` markup (defined in
 * src/styles/marketing.css) but keeps the existing Supabase-backed search:
 *   1. Debounced autocomplete via /api/revenue-leak-audit/business-search.
 *   2. On submit / suggestion click → navigate to /revenue?placeId=...
 *
 * Suggestion dropdown styles live in src/styles/marketing-art.css
 * (under `.audit-search-suggestions`).
 */

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Reveal, WordReveal } from "@/components/marketing/renaissance/Reveal";
import { CelestialField } from "@/components/marketing/renaissance/RenaissanceArt";
import type { BusinessSearchResult } from "@/lib/revenue-leak-audit/types";

type SearchResponse = {
  ok: boolean;
  businesses?: BusinessSearchResult[];
  error?: string;
  warnings?: string[];
};

export default function AuditHero() {
  const router = useRouter();
  const [businessName, setBusinessName] = useState("");
  const [suggestions, setSuggestions] = useState<BusinessSearchResult[]>([]);
  const [suggesting, setSuggesting] = useState(false);
  const [open, setOpen] = useState(false);
  const [hint, setHint] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const autocompleteSeqRef = useRef(0);
  const formRef = useRef<HTMLFormElement | null>(null);

  function goToAudit(result: BusinessSearchResult) {
    router.push(`/revenue?placeId=${encodeURIComponent(result.placeId)}`);
  }

  // Debounced autocomplete — same logic as RevenueLeakHeroSearch.
  useEffect(() => {
    const q = businessName.trim();
    const seq = ++autocompleteSeqRef.current;
    setHint(null);
    if (q.length < 2) {
      setSuggestions([]);
      setSuggesting(false);
      return;
    }
    setSuggesting(true);
    const id = window.setTimeout(() => {
      void fetch("/api/revenue-leak-audit/business-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessName: q }),
      })
        .then(async (res) => {
          const data = (await res.json()) as SearchResponse;
          if (!res.ok || !data.ok) {
            throw new Error(data.error ?? "Could not load business matches.");
          }
          if (seq !== autocompleteSeqRef.current) return;
          setSuggestions(data.businesses ?? []);
          setHint(data.warnings?.[0] ?? null);
          setOpen(true);
        })
        .catch((e) => {
          if (seq !== autocompleteSeqRef.current) return;
          setSuggestions([]);
          setHint(
            e instanceof Error ? e.message : "Could not load business matches.",
          );
        })
        .finally(() => {
          if (seq === autocompleteSeqRef.current) setSuggesting(false);
        });
    }, 300);
    return () => window.clearTimeout(id);
  }, [businessName]);

  // Close the dropdown on outside click.
  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      const target = e.target as Node | null;
      if (formRef.current && target && !formRef.current.contains(target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setOpen(false);
    const trimmed = businessName.trim();
    if (trimmed.length < 2) {
      setError("Enter a business name.");
      return;
    }
    setSearching(true);
    setError(null);
    try {
      const res = await fetch("/api/revenue-leak-audit/business-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessName: trimmed }),
      });
      const data = (await res.json()) as SearchResponse;
      if (!res.ok || !data.ok) throw new Error(data.error ?? "Search failed.");
      const firstMatch = data.businesses?.[0];
      if (!firstMatch) {
        throw new Error("No Google Business Profile matches were found.");
      }
      goToAudit(firstMatch);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed.");
    } finally {
      setSearching(false);
    }
  }

  return (
    <section className="audit-hero">
      <CelestialField count={10} color="var(--marble)" accent="#E6D6A8" />
      <div className="audit-hero-marks" />
      <div className="audit-hero-marks-foot" />

      <div className="shell audit-hero-inner">
        <Reveal as="div" className="audit-chip">
          <span className="audit-chip-dot" />
          <span>Local Businesses · Free instant preview</span>
        </Reveal>

        <h1 className="audit-headline">
          <WordReveal>
            Find your revenue <em>leaks.</em>
          </WordReveal>
        </h1>

        <Reveal as="p" className="audit-lead">
          Scan your Google profile, reviews, site, ads and local positioning — get
          missed opportunities surfaced in sixty seconds.
        </Reveal>

        <form
          ref={formRef}
          className="audit-search"
          onSubmit={handleSubmit}
        >
          <div className="audit-search-field">
            <svg
              viewBox="0 0 24 24"
              width="20"
              height="20"
              className="audit-search-icon"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <rect x="3" y="6" width="8" height="14" rx="1" />
              <rect x="13" y="3" width="8" height="17" rx="1" />
              <line x1="6" y1="10" x2="8" y2="10" />
              <line x1="6" y1="14" x2="8" y2="14" />
              <line x1="6" y1="18" x2="8" y2="18" />
              <line x1="16" y1="7" x2="18" y2="7" />
              <line x1="16" y1="11" x2="18" y2="11" />
              <line x1="16" y1="15" x2="18" y2="15" />
            </svg>
            <input
              type="text"
              name="business"
              placeholder="Search your business name or website"
              autoComplete="organization"
              value={businessName}
              onChange={(e) => {
                setBusinessName(e.target.value);
                setOpen(true);
              }}
              onFocus={() => setOpen(true)}
              aria-label="Business name or website"
            />
            {open && (suggestions.length > 0 || suggesting || hint) ? (
              <div
                className="audit-search-suggestions"
                role="listbox"
                aria-label="Business matches"
              >
                {suggesting ? (
                  <div className="audit-search-suggestions-status">
                    <span className="audit-spinner" />
                    Searching Google Business matches…
                  </div>
                ) : null}
                {suggestions.map((result) => (
                  <button
                    key={result.placeId}
                    type="button"
                    role="option"
                    onMouseDown={(ev) => ev.preventDefault()}
                    onClick={() => {
                      setBusinessName(result.name);
                      setOpen(false);
                      goToAudit(result);
                    }}
                    className="audit-search-suggestion"
                  >
                    <span className="audit-search-suggestion-name">
                      {result.name}
                    </span>
                    <span className="audit-search-suggestion-meta">
                      {result.address ?? "Address unavailable"} ·{" "}
                      {result.rating ?? "N/A"} rating ·{" "}
                      {result.reviewCount ?? 0} reviews
                    </span>
                  </button>
                ))}
                {hint ? (
                  <p className="audit-search-suggestions-hint">{hint}</p>
                ) : null}
              </div>
            ) : null}
          </div>
          <button
            type="submit"
            className="audit-search-btn"
            disabled={searching}
            aria-label="Find revenue leaks"
          >
            {searching ? (
              <>
                <span className="audit-spinner" /> Analyzing…
              </>
            ) : (
              <>
                <svg
                  viewBox="0 0 24 24"
                  width="18"
                  height="18"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  aria-hidden
                >
                  <circle cx="11" cy="11" r="7" />
                  <line x1="21" y1="21" x2="16.5" y2="16.5" />
                </svg>
                Find Revenue Leaks
              </>
            )}
          </button>
        </form>

        {error ? (
          <Reveal as="div" className="audit-search-note audit-search-error">
            {error}
          </Reveal>
        ) : (
          <Reveal as="div" className="audit-search-note">
            Free preview · No card
          </Reveal>
        )}

        <Reveal as="div" className="audit-trust">
          <span className="audit-trust-item">
            <span className="dot" /> 50+ leading companies audited
          </span>
          <span className="audit-trust-item">
            <span className="dot" /> Avg leak found: $4,200 / mo
          </span>
          <span className="audit-trust-item">
            <span className="dot" /> Results in under sixty seconds
          </span>
        </Reveal>
      </div>
    </section>
  );
}
