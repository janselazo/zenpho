"use client";

import { useEffect, useRef, useState } from "react";
import { Building2, Loader2, Search, Target } from "lucide-react";
import type { BusinessSearchResult } from "@/lib/revenue-leak-audit/types";
import Button from "@/components/ui/Button";

export const revenueLeakAuditInputClass =
  "w-full rounded-2xl border border-border bg-white px-4 py-3 text-sm text-text-primary placeholder:text-text-secondary/45 outline-none shadow-sm transition-all focus:border-accent focus:ring-2 focus:ring-accent/15";

type SearchResponse = {
  ok: boolean;
  businesses?: BusinessSearchResult[];
  error?: string;
  warnings?: string[];
};

export type RevenueLeakHeroSearchProps = {
  onSearch: (businessName: string) => void | Promise<void>;
  onSelectBusiness: (result: BusinessSearchResult) => void | Promise<void>;
  searching: boolean;
  /** Homepage: extra top padding below MarketingShell navbar; standalone matches full /revenue tool page. */
  variant?: "standalone" | "homepage";
};

export default function RevenueLeakHeroSearch({
  onSearch,
  onSelectBusiness,
  searching,
  variant = "standalone",
}: RevenueLeakHeroSearchProps) {
  const [businessName, setBusinessName] = useState("");
  const [suggestions, setSuggestions] = useState<BusinessSearchResult[]>([]);
  const [suggesting, setSuggesting] = useState(false);
  const [open, setOpen] = useState(false);
  const [hint, setHint] = useState<string | null>(null);
  const autocompleteSeqRef = useRef(0);

  const sectionClass =
    variant === "homepage"
      ? "hero-sky relative overflow-hidden px-4 pb-16 pt-20 sm:px-6 sm:pt-24 lg:px-8 lg:pt-28"
      : "hero-sky px-4 pb-16 pt-32 sm:px-6 lg:px-8";

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
          setHint(e instanceof Error ? e.message : "Could not load business matches.");
        })
        .finally(() => {
          if (seq === autocompleteSeqRef.current) setSuggesting(false);
        });
    }, 300);
    return () => window.clearTimeout(id);
  }, [businessName]);

  return (
    <section className={sectionClass}>
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto max-w-4xl text-center">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-accent/15 bg-white/80 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-accent shadow-sm">
            <Target className="h-3.5 w-3.5" />
            Revenue Leak Audit
          </div>
          <h1 className="heading-display text-5xl font-black tracking-tight text-text-primary sm:text-6xl lg:text-7xl">
            Find Where Your Business Is Leaking Revenue
          </h1>
          <p className="mx-auto mt-6 max-w-3xl text-lg leading-8 text-text-secondary sm:text-xl">
            Analyze your Google profile, reviews, competitors, website, ads, and local positioning to uncover missed
            revenue opportunities.
          </p>
        </div>

        <form
          className="mx-auto mt-10 grid max-w-5xl gap-3 rounded-[2rem] border border-white/80 bg-white/90 p-3 shadow-soft-lg backdrop-blur lg:grid-cols-[minmax(0,1fr)_auto]"
          onSubmit={(e) => {
            e.preventDefault();
            setOpen(false);
            void onSearch(businessName);
          }}
        >
          <label className="relative block">
            <span className="sr-only">Business name</span>
            <Building2 className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary" />
            <input
              value={businessName}
              onChange={(e) => {
                setBusinessName(e.target.value);
                setOpen(true);
              }}
              onFocus={() => setOpen(true)}
              className={`${revenueLeakAuditInputClass} pl-11`}
              placeholder="Business name"
              autoComplete="off"
            />
            {open && (suggestions.length > 0 || suggesting || hint) ? (
              <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-30 overflow-hidden rounded-2xl border border-border bg-white text-left shadow-soft-lg">
                {suggesting ? (
                  <div className="flex items-center gap-2 px-4 py-3 text-sm text-text-secondary">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Searching Google Business matches...
                  </div>
                ) : null}
                {suggestions.map((result) => (
                  <button
                    key={result.placeId}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      setBusinessName(result.name);
                      setOpen(false);
                      void onSelectBusiness(result);
                    }}
                    className="block w-full border-t border-border/60 px-4 py-3 text-left transition-colors first:border-t-0 hover:bg-surface"
                  >
                    <span className="block text-sm font-bold text-text-primary">{result.name}</span>
                    <span className="mt-1 block text-xs text-text-secondary">
                      {result.address ?? "Address unavailable"} · {result.rating ?? "N/A"} rating · {result.reviewCount ?? 0}{" "}
                      reviews
                    </span>
                  </button>
                ))}
                {hint ? (
                  <p className="border-t border-border/60 px-4 py-3 text-xs text-text-secondary">{hint}</p>
                ) : null}
              </div>
            ) : null}
          </label>
          <Button type="submit" size="lg" disabled={searching} className="h-full whitespace-nowrap">
            {searching ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
            Find Revenue Leaks
          </Button>
        </form>
        <p className="mt-4 text-center text-sm text-text-secondary">Search your Google Business Profile to start your audit.</p>
      </div>
    </section>
  );
}
