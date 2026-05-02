import Image from "next/image";
import {
  homeClearGrowthClosingAccent,
  homeClearGrowthClosingLead,
  homeClearGrowthEyebrow,
  homeClearGrowthHeadline,
  homeClearGrowthMetricCards,
  homeClearGrowthSubheadParts,
  homeClearGrowthSummaryItems,
} from "@/lib/home-clear-growth";

const MAIN_ID = "home-clear-growth-heading";
const CLEAR_GROWTH_LONG_DESC_ID = "clear-growth-infographic-desc";

const METRIC_IMAGE_W = 1024;
const METRIC_IMAGE_H = 576;

export default function HomeClearGrowthSection() {
  return (
    <section
      id="clear-growth"
      className="relative w-full border-t border-border/50 bg-surface/35 py-16 sm:py-20 lg:py-24 dark:border-zinc-800/70 dark:bg-zinc-950/60"
      aria-labelledby={MAIN_ID}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="rounded-3xl border border-border/80 bg-white p-8 shadow-soft ring-1 ring-black/[0.035] sm:p-10 lg:p-12 xl:px-14 dark:border-zinc-700/80 dark:bg-zinc-900/35 dark:ring-white/[0.04]">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-accent">
              {homeClearGrowthEyebrow}
            </p>
            <h2
              id={MAIN_ID}
              className="heading-display mt-3 text-balance text-3xl font-bold leading-[1.12] tracking-tight text-text-primary sm:text-4xl lg:text-[2.35rem] lg:leading-[1.08]"
            >
              {homeClearGrowthHeadline}
            </h2>
            <p className="mx-auto mt-5 max-w-2xl text-pretty text-base leading-relaxed text-text-secondary sm:text-lg">
              {homeClearGrowthSubheadParts.before}
              <span className="font-bold text-accent">{homeClearGrowthSubheadParts.accent}</span>
              {homeClearGrowthSubheadParts.after}
            </p>
          </div>

          <div id={CLEAR_GROWTH_LONG_DESC_ID} className="sr-only">
            <p>Sample results shown in the infographic:</p>
            <ul>
              {homeClearGrowthMetricCards.map((c) => (
                <li key={c.id}>
                  {c.value} {c.label}
                </li>
              ))}
            </ul>
            <p>Highlights:</p>
            <ul>
              {homeClearGrowthSummaryItems.map((s) => (
                <li key={s.id}>
                  {s.eyebrow}: {s.value}
                </li>
              ))}
            </ul>
            <p>
              {homeClearGrowthClosingLead}
              <span className="font-bold">{homeClearGrowthClosingAccent}</span>
            </p>
          </div>

          <figure className="mx-auto mt-10 max-w-5xl lg:mt-14">
            <Image
              src="/marketing/what-clear-growth-looks-like.jpg"
              alt="What Clear Growth Looks Like — infographic with key business metrics, channel highlight, and takeaway about measurable growth."
              width={METRIC_IMAGE_W}
              height={METRIC_IMAGE_H}
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 90vw, 1024px"
              className="h-auto w-full rounded-2xl border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.06)] dark:border-zinc-700/80"
              aria-describedby={CLEAR_GROWTH_LONG_DESC_ID}
            />
          </figure>
        </div>
      </div>
    </section>
  );
}
