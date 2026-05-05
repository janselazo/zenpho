"use client";

import {
  deriveProposalSummary,
  markdownBodyToBlocks,
  parseProposalDocumentForEditor,
} from "@/lib/crm/proposal-document";
import type {
  SalesProposalAiVisualRow,
  SalesProposalCatalogLineRow,
  SalesProposalStatus,
} from "@/lib/crm/sales-proposal-types";
import { catalogLineHasStrikethroughList } from "@/lib/crm/crm-catalog-pricing";
import type { PlacesSearchPlace } from "@/lib/crm/places-types";

function money(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(n);
}

function pill(label: string) {
  return (
    <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300">
      {label}
    </span>
  );
}

export default function ProposalDocumentPreview({
  title,
  buyerName,
  markdown,
  status,
  place,
  aiVisuals = [],
  catalogLines = [],
  totalPriceEstimate,
}: {
  title: string;
  buyerName: string | null;
  markdown: string;
  status?: SalesProposalStatus;
  place?: PlacesSearchPlace | null;
  aiVisuals?: SalesProposalAiVisualRow[];
  catalogLines?: SalesProposalCatalogLineRow[];
  totalPriceEstimate?: number | null;
}) {
  const doc = parseProposalDocumentForEditor(markdown);
  const summary = deriveProposalSummary(markdown);
  const heroPhoto = place?.photoRefs?.[0]?.trim() ?? null;
  const visibleSections = doc.sections.filter(
    (section) => !/^proposal title$/i.test(section.title),
  );
  const investment =
    totalPriceEstimate != null && Number.isFinite(totalPriceEstimate)
      ? money(totalPriceEstimate)
      : null;

  return (
    <article className="overflow-hidden rounded-[2rem] border border-border bg-white shadow-soft-lg dark:border-zinc-800 dark:bg-zinc-950">
      <header className="relative min-h-[22rem] overflow-hidden bg-surface p-8 dark:bg-zinc-900 sm:p-10">
        {heroPhoto ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`/api/crm/google-place-photo?photo=${encodeURIComponent(heroPhoto)}`}
            alt=""
            className="absolute inset-0 h-full w-full object-cover opacity-35"
          />
        ) : (
          <div className="absolute right-[-8rem] top-[-8rem] h-80 w-80 rounded-full bg-accent/15 blur-3xl" />
        )}
        <div className="relative z-10 max-w-3xl">
          {pill("Business proposal")}
          {status ? (
            <span className="ml-2 rounded-full bg-white/80 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-text-secondary shadow-sm dark:bg-zinc-950/70">
              {status}
            </span>
          ) : null}
          <h1 className="heading-display mt-8 text-4xl font-black leading-tight text-text-primary dark:text-white sm:text-5xl">
            {summary.titleLine || title || "Untitled proposal"}
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-text-secondary dark:text-zinc-300">
            Prepared for{" "}
            <span className="font-semibold text-text-primary dark:text-white">
              {buyerName || "your team"}
            </span>
          </p>
          {summary.executiveSummary ? (
            <p className="mt-8 max-w-3xl text-sm leading-7 text-text-secondary dark:text-zinc-300">
              {summary.executiveSummary.slice(0, 560)}
              {summary.executiveSummary.length > 560 ? "…" : ""}
            </p>
          ) : null}
        </div>
      </header>

      <section className="grid gap-4 border-y border-border bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950 sm:grid-cols-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-text-secondary">
            Buyer
          </p>
          <p className="mt-1 font-semibold text-text-primary dark:text-zinc-100">
            {buyerName || "Unassigned"}
          </p>
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-text-secondary">
            Sections
          </p>
          <p className="mt-1 font-semibold text-text-primary dark:text-zinc-100">
            {visibleSections.length || doc.sections.length}
          </p>
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-text-secondary">
            Estimate
          </p>
          <p className="mt-1 font-semibold text-text-primary dark:text-zinc-100">
            {investment || "See scope"}
          </p>
        </div>
      </section>

      <div className="grid gap-8 p-6 sm:p-8 lg:grid-cols-[220px_minmax(0,1fr)]">
        <aside className="space-y-3 lg:sticky lg:top-8 lg:self-start">
          <p className="text-[10px] font-bold uppercase tracking-widest text-text-secondary">
            Contents
          </p>
          <ol className="space-y-2 text-xs text-text-secondary">
            {visibleSections.map((section, idx) => (
              <li key={section.id} className="flex gap-2">
                <span className="font-mono text-[10px] text-accent">
                  {String(idx + 1).padStart(2, "0")}
                </span>
                <span>{section.title}</span>
              </li>
            ))}
          </ol>

          {aiVisuals.length > 0 ? (
            <div className="rounded-2xl border border-border bg-surface p-4 dark:border-zinc-800 dark:bg-zinc-900/60">
              <p className="text-[10px] font-bold uppercase tracking-widest text-text-secondary">
                Visual concepts
              </p>
              <ul className="mt-3 space-y-2 text-xs leading-relaxed text-text-secondary">
                {aiVisuals.slice(0, 3).map((v) => (
                  <li key={v.path}>{v.caption}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </aside>

        <div className="space-y-8">
          {visibleSections.map((section, idx) => {
            const blocks = markdownBodyToBlocks(section.body);
            return (
              <section
                key={section.id}
                className="rounded-[1.75rem] border border-border bg-surface/70 p-6 dark:border-zinc-800 dark:bg-zinc-900/40"
              >
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-accent">
                  {String(idx + 1).padStart(2, "0")} · Section
                </p>
                <h2 className="heading-display mt-3 text-2xl font-black text-text-primary dark:text-white">
                  {section.title}
                </h2>
                <div className="mt-5 space-y-3 text-sm leading-7 text-text-secondary dark:text-zinc-300">
                  {blocks.length === 0 ? (
                    <p className="italic">No copy yet.</p>
                  ) : (
                    blocks.map((block, blockIdx) => {
                      if (block.type === "subheading") {
                        return (
                          <h3
                            key={blockIdx}
                            className="pt-2 text-sm font-bold uppercase tracking-wide text-text-primary dark:text-zinc-100"
                          >
                            {block.text}
                          </h3>
                        );
                      }
                      if (block.type === "bullet") {
                        return (
                          <p key={blockIdx} className="flex gap-2">
                            <span className="mt-3 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                            <span>{block.text}</span>
                          </p>
                        );
                      }
                      return <p key={blockIdx}>{block.text}</p>;
                    })
                  )}
                </div>
              </section>
            );
          })}

          {catalogLines.length > 0 ? (
            <section className="rounded-[1.75rem] border border-emerald-200 bg-emerald-50/80 p-6 dark:border-emerald-900 dark:bg-emerald-950/20">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-300">
                Services referenced
              </p>
              <ul className="mt-4 space-y-3">
                {catalogLines.map((line) => (
                  <li key={line.id} className="flex justify-between gap-4 text-sm">
                    <span className="text-text-primary dark:text-zinc-100">
                      {line.description_snapshot.split("\n")[0] || "Service"}
                    </span>
                    <span className="text-right font-semibold tabular-nums">
                      {catalogLineHasStrikethroughList(line) ? (
                        <span className="inline-flex flex-col items-end gap-0.5 sm:flex-row sm:items-baseline sm:gap-2">
                          <span className="text-xs font-normal text-text-secondary line-through dark:text-zinc-500">
                            {money(line.list_unit_price_snapshot!)}
                          </span>
                          <span className="text-emerald-700 dark:text-emerald-400">
                            {money(line.unit_price_snapshot)}
                          </span>
                        </span>
                      ) : (
                        money(line.unit_price_snapshot)
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      </div>
    </article>
  );
}
