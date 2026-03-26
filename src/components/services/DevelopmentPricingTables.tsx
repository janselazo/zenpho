"use client";

import {
  Suspense,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useState,
} from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { PricingTableCategory } from "@/lib/data";
import { developmentPricingTableCategories } from "@/lib/data";
import Button from "@/components/ui/Button";

const TYPE_PARAM = "type";

const TIER_KEYS = ["starter", "growth", "scale"] as const;
const TIER_LABELS: Record<(typeof TIER_KEYS)[number], string> = {
  starter: "Starter",
  growth: "Growth",
  scale: "Scale",
};

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
    </svg>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
    </svg>
  );
}

function BoolCell({ included }: { included: boolean }) {
  return (
    <span
      className="inline-flex justify-center"
      aria-label={included ? "Included" : "Not included"}
    >
      {included ? (
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent/15 text-accent ring-1 ring-accent/20">
          <CheckIcon className="h-4 w-4" />
        </span>
      ) : (
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-surface text-text-secondary/45">
          <XIcon className="h-4 w-4" />
        </span>
      )}
    </span>
  );
}

function PriceCell({
  value,
  featured,
}: {
  value: string;
  featured: boolean;
}) {
  return (
    <div
      className={`mx-auto max-w-[9.5rem] rounded-2xl px-4 py-3 text-center sm:max-w-[11rem] ${
        featured
          ? "border-2 border-accent/45 bg-white shadow-sm ring-1 ring-accent/10"
          : "border border-border/90 bg-surface-light/80"
      }`}
    >
      <span className="text-lg font-semibold tracking-tight text-accent sm:text-xl">
        {value}
      </span>
    </div>
  );
}

function PricingTablePanel({ category }: { category: PricingTableCategory }) {
  return (
    <div
      className="relative z-0 overflow-x-auto"
      role="tabpanel"
      id={`pricing-panel-${category.id}`}
      aria-labelledby={`pricing-tab-${category.id}`}
    >
      <table className="w-full min-w-[640px] border-collapse text-left">
        <thead>
          <tr className="border-b border-border bg-surface-light/95">
            <th
              scope="col"
              className="sticky left-0 z-10 min-w-[140px] bg-surface-light/98 px-4 py-4 text-xs font-semibold uppercase tracking-wider text-text-secondary backdrop-blur-sm sm:min-w-[168px] sm:px-5"
            >
              Package
            </th>
            {TIER_KEYS.map((key) => {
              const featured = key === "growth";
              return (
                <th
                  key={key}
                  scope="col"
                  className={`relative px-3 pb-3 pt-8 text-center sm:px-5 sm:pb-4 sm:pt-9 ${
                    featured
                      ? "bg-gradient-to-b from-accent/[0.08] to-accent/[0.03] ring-2 ring-inset ring-accent/35"
                      : ""
                  }`}
                >
                  {featured ? (
                    <span className="absolute left-1/2 top-0 z-10 -translate-x-1/2 whitespace-nowrap rounded-b-lg bg-accent px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white shadow-md">
                      Most popular
                    </span>
                  ) : null}
                  <span className="text-sm font-bold text-text-primary sm:text-base">
                    {TIER_LABELS[key]}
                  </span>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {category.rows.map((row) => {
            const isPrice = row.label === "Price";
            return (
              <tr
                key={row.label}
                className={`border-b border-border/70 ${
                  isPrice ? "bg-surface/40" : "bg-white"
                }`}
              >
                <th
                  scope="row"
                  className="sticky left-0 z-10 min-w-[140px] border-r border-border/50 bg-white/98 px-4 py-3.5 text-xs font-semibold text-text-primary backdrop-blur-sm sm:min-w-[168px] sm:px-5 sm:py-4 sm:text-sm"
                >
                  {row.label}
                </th>
                {TIER_KEYS.map((tierKey) => {
                  const cell = row[tierKey];
                  const featured = tierKey === "growth";
                  return (
                    <td
                      key={tierKey}
                      className={`px-3 py-3.5 align-middle sm:px-5 sm:py-4 ${
                        featured ? "bg-accent/[0.03]" : ""
                      }`}
                    >
                      {cell.kind === "text" ? (
                        isPrice ? (
                          <PriceCell value={cell.value} featured={featured} />
                        ) : (
                          <span className="block text-center text-sm text-text-primary sm:text-[15px]">
                            {cell.value}
                          </span>
                        )
                      ) : (
                        <div className="flex justify-center">
                          <BoolCell included={cell.value} />
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            );
          })}
          <tr className="border-t-2 border-border bg-surface-light/60">
            <th
              scope="row"
              className="sticky left-0 z-10 bg-surface-light/98 px-4 py-5 text-left text-[11px] font-bold uppercase tracking-wider text-text-secondary backdrop-blur-sm sm:px-5 sm:text-xs"
            >
              What&apos;s next
            </th>
            {TIER_KEYS.map((key) => {
              const featured = key === "growth";
              return (
                <td
                  key={key}
                  className={`px-3 py-5 sm:px-5 ${featured ? "bg-accent/[0.04]" : ""}`}
                >
                  <Button
                    href="/booking"
                    variant={featured ? "primary" : "secondary"}
                    size="lg"
                    className="w-full min-w-0 justify-center px-3 text-sm sm:text-base"
                  >
                    Book a call
                  </Button>
                </td>
              );
            })}
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function DevelopmentPricingTablesInner({
  categories = developmentPricingTableCategories,
}: {
  categories?: PricingTableCategory[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const radioName = useId();
  const groupLabelId = `${radioName}-label`;

  const urlIndex = useMemo(() => {
    const t = searchParams.get(TYPE_PARAM);
    if (!t) return 0;
    const idx = categories.findIndex((c) => c.id === t);
    return idx >= 0 ? idx : 0;
  }, [categories, searchParams]);

  /** Immediate selection on click; URL can lag behind in some clients. */
  const [optimisticIndex, setOptimisticIndex] = useState<number | null>(null);

  useEffect(() => {
    setOptimisticIndex(null);
  }, [urlIndex]);

  const activeIndex = optimisticIndex ?? urlIndex;

  const category = categories[activeIndex] ?? categories[0];

  const selectCategory = useCallback(
    (id: string, index: number) => {
      setOptimisticIndex(index);
      const next = new URLSearchParams(searchParams.toString());
      next.set(TYPE_PARAM, id);
      const q = next.toString();
      router.replace(q ? `${pathname}?${q}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  return (
    <div className="space-y-4">
      {/*
        Tabs outside the table card. Selection is driven by the URL (?type=…)
        plus native radio+label so clicks register even when overlays or
        embedded previews mishandle button clicks.
      */}
      <div className="relative z-[60] rounded-2xl border border-border bg-gradient-to-b from-surface-light/90 to-white px-4 py-5 text-center shadow-soft ring-1 ring-black/[0.03] sm:px-6 sm:py-6">
        <p
          id={groupLabelId}
          className="mb-3 text-xs font-semibold uppercase tracking-wider text-text-secondary"
        >
          Product type
        </p>
        <div className="pointer-events-auto flex flex-col items-center gap-2 sm:flex-row sm:flex-wrap sm:justify-center sm:gap-2">
          <div
            role="radiogroup"
            aria-labelledby={groupLabelId}
            className="mx-auto flex w-full max-w-xl flex-col gap-2 rounded-2xl border border-border/70 bg-surface-light/60 p-1.5 sm:inline-flex sm:w-auto sm:max-w-none sm:flex-row sm:flex-wrap sm:justify-center sm:gap-1"
          >
            {categories.map((c, i) => {
              const selected = i === activeIndex;
              const inputId = `${radioName}-${c.id}`;
              return (
                <label
                  key={c.id}
                  id={`pricing-tab-${c.id}`}
                  htmlFor={inputId}
                  onClick={() => selectCategory(c.id, i)}
                  className={`relative z-[1] cursor-pointer select-none rounded-xl px-4 py-2.5 text-center text-sm font-semibold tracking-tight transition-all duration-200 sm:min-w-[9rem] sm:px-5 ${
                    selected
                      ? "bg-accent text-white shadow-md shadow-accent/25"
                      : "text-text-secondary hover:bg-white/80 hover:text-text-primary"
                  }`}
                >
                  <input
                    id={inputId}
                    type="radio"
                    name={radioName}
                    value={c.id}
                    checked={selected}
                    onChange={() => selectCategory(c.id, i)}
                    className="sr-only"
                  />
                  {c.tabLabel}
                </label>
              );
            })}
          </div>
        </div>
        <div className="mt-5 flex flex-col items-center gap-1 border-t border-border/60 pt-5 sm:mt-6 sm:pt-6">
          <span className="text-xs font-medium uppercase tracking-wider text-text-secondary">
            Currently viewing
          </span>
          <h3 className="text-lg font-bold tracking-tight text-text-primary sm:text-xl">
            {category.title}
          </h3>
        </div>
      </div>

      <div className="overflow-hidden rounded-3xl border border-border bg-white shadow-soft-lg ring-1 ring-black/[0.04]">
        <PricingTablePanel key={category.id} category={category} />
      </div>
    </div>
  );
}

function PricingTablesTabFallback() {
  return (
    <div className="space-y-4">
      <div className="h-40 animate-pulse rounded-2xl bg-surface-light/80" />
      <div className="h-96 animate-pulse rounded-3xl bg-surface-light/60" />
    </div>
  );
}

export default function DevelopmentPricingTables({
  categories = developmentPricingTableCategories,
}: {
  categories?: PricingTableCategory[];
}) {
  return (
    <Suspense fallback={<PricingTablesTabFallback />}>
      <DevelopmentPricingTablesInner categories={categories} />
    </Suspense>
  );
}
