"use client";

import {
  deriveProposalSummary,
  markdownBodyToBlocks,
  parseProposalDocument,
  replaceProposalSection,
} from "@/lib/crm/proposal-document";
import type {
  SalesProposalAiVisualRow,
  SalesProposalStatus,
} from "@/lib/crm/sales-proposal-types";
import type { PlacesSearchPlace } from "@/lib/crm/places-types";

type ServiceLine = {
  id?: string;
  description_snapshot: string;
  unit_price_snapshot: number;
};

const inlineField =
  "w-full rounded-xl border border-transparent bg-white/70 px-3 py-2 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-400/15 dark:bg-zinc-950/50 dark:focus:bg-zinc-950";

function money(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(n);
}

function updateProposalTitleMarkdown(markdown: string, nextTitle: string): string {
  const doc = parseProposalDocument(markdown);
  const titleSection = doc.sections.find((s) => /^proposal title$/i.test(s.title));
  if (!titleSection) return markdown;
  return replaceProposalSection(markdown, titleSection.id, {
    body: nextTitle.trim(),
  });
}

function VisualPanel({
  photoRef,
  caption,
  index,
}: {
  photoRef?: string | null;
  caption: string;
  index: number;
}) {
  return (
    <aside className="overflow-hidden rounded-[1.5rem] border border-border bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
      <div className="relative min-h-[180px] bg-gradient-to-br from-accent/10 via-sky-100/70 to-emerald-100/70 dark:from-accent/20 dark:via-zinc-900 dark:to-emerald-950/30">
        {photoRef ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`/api/crm/google-place-photo?photo=${encodeURIComponent(photoRef)}`}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <div className="absolute inset-0">
            <div className="absolute right-6 top-6 h-24 w-24 rounded-full bg-accent/20 blur-2xl" />
            <div className="absolute bottom-8 left-8 h-20 w-32 rounded-full bg-emerald-400/20 blur-2xl" />
            <div className="absolute inset-x-8 bottom-8 h-16 rounded-2xl border border-white/50 bg-white/40 backdrop-blur dark:border-white/10 dark:bg-white/5" />
          </div>
        )}
      </div>
      <div className="p-4">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-accent">
          Visual {String(index + 1).padStart(2, "0")}
        </p>
        <p className="mt-2 text-xs leading-relaxed text-text-secondary dark:text-zinc-400">
          {caption}
        </p>
      </div>
    </aside>
  );
}

export default function ProposalDocumentCanvas({
  title,
  onTitleChange,
  buyerName,
  markdown,
  onMarkdownChange,
  status,
  place,
  aiVisuals = [],
  serviceLines = [],
  totalPriceEstimate,
}: {
  title: string;
  onTitleChange: (nextTitle: string) => void;
  buyerName: string | null;
  markdown: string;
  onMarkdownChange: (nextMarkdown: string) => void;
  status?: SalesProposalStatus;
  place?: PlacesSearchPlace | null;
  aiVisuals?: SalesProposalAiVisualRow[];
  serviceLines?: ServiceLine[];
  totalPriceEstimate?: number | null;
}) {
  const doc = parseProposalDocument(markdown);
  const summary = deriveProposalSummary(markdown);
  const visibleSections = doc.sections.filter(
    (section) => !/^proposal title$/i.test(section.title),
  );
  const photoRefs = place?.photoRefs?.map((p) => p.trim()).filter(Boolean) ?? [];
  const visuals = [
    ...photoRefs.slice(0, 3).map((ref) => ({
      kind: "photo" as const,
      photoRef: ref,
      caption: "Business context and location imagery for the proposal.",
    })),
    ...aiVisuals.slice(0, 3).map((v) => ({
      kind: "ai" as const,
      photoRef: null,
      caption: v.caption || "AI concept visualization for the proposed work.",
    })),
  ];
  const fallbackVisual = visuals.length === 0;
  const estimate =
    totalPriceEstimate != null && Number.isFinite(totalPriceEstimate)
      ? money(totalPriceEstimate)
      : serviceLines.length > 0
        ? money(serviceLines.reduce((sum, line) => sum + line.unit_price_snapshot, 0))
        : null;

  function updateTitle(nextTitle: string) {
    onTitleChange(nextTitle);
    onMarkdownChange(updateProposalTitleMarkdown(markdown, nextTitle));
  }

  return (
    <article className="overflow-hidden rounded-[2rem] border border-border bg-white shadow-soft-lg dark:border-zinc-800 dark:bg-zinc-950">
      <header className="relative overflow-hidden bg-surface p-6 dark:bg-zinc-900 sm:p-10">
        {photoRefs[0] ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`/api/crm/google-place-photo?photo=${encodeURIComponent(photoRefs[0])}`}
            alt=""
            className="absolute inset-0 h-full w-full object-cover opacity-30"
          />
        ) : (
          <div className="absolute right-[-8rem] top-[-8rem] h-80 w-80 rounded-full bg-accent/15 blur-3xl" />
        )}
        <div className="relative z-10 max-w-4xl">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300">
              Business proposal
            </span>
            {status ? (
              <span className="rounded-full bg-white/80 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-text-secondary shadow-sm dark:bg-zinc-950/70">
                {status}
              </span>
            ) : null}
          </div>
          <label className="mt-8 block">
            <span className="sr-only">Proposal title</span>
            <textarea
              value={summary.titleLine || title}
              onChange={(e) => updateTitle(e.target.value)}
              rows={3}
              className="heading-display w-full resize-none rounded-2xl border border-transparent bg-white/45 px-4 py-3 text-4xl font-black leading-tight text-text-primary outline-none transition placeholder:text-text-secondary focus:border-accent/30 focus:bg-white/80 focus:ring-4 focus:ring-accent/10 dark:bg-zinc-950/35 dark:text-white dark:focus:bg-zinc-950/75 sm:text-5xl"
              placeholder="Proposal title"
            />
          </label>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-text-secondary dark:text-zinc-300">
            Prepared for{" "}
            <span className="font-semibold text-text-primary dark:text-white">
              {buyerName || "your team"}
            </span>
          </p>
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
            {visibleSections.length}
          </p>
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-text-secondary">
            Estimate
          </p>
          <p className="mt-1 font-semibold text-text-primary dark:text-zinc-100">
            {estimate || "See scope"}
          </p>
        </div>
      </section>

      <div className="space-y-8 p-6 sm:p-8">
        {visibleSections.map((section, idx) => {
          const blocks = markdownBodyToBlocks(section.body);
          const visual =
            visuals.length > 0 && idx % 2 === 0
              ? visuals[Math.floor(idx / 2) % visuals.length]
              : null;
          const showFallbackVisual = fallbackVisual && idx === 0;

          return (
            <section
              key={section.id}
              className={`grid gap-5 rounded-[1.75rem] border border-border bg-surface/70 p-5 dark:border-zinc-800 dark:bg-zinc-900/40 ${
                visual || showFallbackVisual
                  ? "lg:grid-cols-[minmax(0,1fr)_280px]"
                  : ""
              }`}
            >
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-accent">
                  {String(idx + 1).padStart(2, "0")} · Section
                </p>
                <label className="mt-3 block">
                  <span className="sr-only">Section heading</span>
                  <input
                    value={section.title}
                    onChange={(e) =>
                      onMarkdownChange(
                        replaceProposalSection(markdown, section.id, {
                          title: e.target.value,
                        }),
                      )
                    }
                    className={`${inlineField} heading-display text-2xl font-black text-text-primary dark:text-white`}
                  />
                </label>
                <label className="mt-4 block">
                  <span className="sr-only">Section copy</span>
                  <textarea
                    rows={Math.min(
                      18,
                      Math.max(6, section.body.split("\n").length + 2),
                    )}
                    value={section.body}
                    onChange={(e) =>
                      onMarkdownChange(
                        replaceProposalSection(markdown, section.id, {
                          body: e.target.value,
                        }),
                      )
                    }
                    className={`${inlineField} min-h-36 resize-y font-mono text-xs leading-7 text-text-secondary dark:text-zinc-300`}
                  />
                </label>
                {blocks.some((b) => b.type === "bullet") ? (
                  <p className="mt-2 text-[11px] text-text-secondary">
                    Bullets are kept as Markdown and formatted in PDF export.
                  </p>
                ) : null}
              </div>

              {visual ? (
                <VisualPanel
                  index={Math.floor(idx / 2)}
                  photoRef={visual.photoRef}
                  caption={visual.caption}
                />
              ) : showFallbackVisual ? (
                <VisualPanel
                  index={0}
                  caption="Zenpho proposal visual system: structured scope, clear outcomes, and polished delivery."
                />
              ) : null}
            </section>
          );
        })}

        {serviceLines.length > 0 ? (
          <section className="rounded-[1.75rem] border border-emerald-200 bg-emerald-50/80 p-6 dark:border-emerald-900 dark:bg-emerald-950/20">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-300">
              Services referenced
            </p>
            <ul className="mt-4 space-y-3">
              {serviceLines.map((line, idx) => (
                <li
                  key={line.id ?? idx}
                  className="flex justify-between gap-4 text-sm"
                >
                  <span className="text-text-primary dark:text-zinc-100">
                    {line.description_snapshot.split("\n")[0] || "Service"}
                  </span>
                  <span className="font-semibold">
                    {money(line.unit_price_snapshot)}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <details className="rounded-2xl border border-border bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
          <summary className="cursor-pointer text-xs font-bold uppercase tracking-widest text-text-secondary">
            Raw Markdown fallback
          </summary>
          <textarea
            rows={16}
            value={markdown}
            onChange={(e) => onMarkdownChange(e.target.value)}
            className="mt-3 w-full rounded-xl border border-border bg-white px-3 py-2 font-mono text-xs leading-relaxed outline-none focus:border-blue-400 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
          />
        </details>
      </div>
    </article>
  );
}
