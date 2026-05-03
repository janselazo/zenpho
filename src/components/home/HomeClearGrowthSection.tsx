import HomeClearGrowthDashboardPreview from "@/components/home/HomeClearGrowthDashboardPreview";
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
const DASHBOARD_CAPTION_ID = "home-clear-growth-dashboard-caption";

function dashboardScreenReaderSummary(): string {
  const metricPart = homeClearGrowthMetricCards.map((c) => `${c.label}: ${c.value}`).join("; ");
  const insightPart = homeClearGrowthSummaryItems.map((i) => `${i.eyebrow}, ${i.value}`).join("; ");
  return `Sample Zenpho dashboard layout with metrics including ${metricPart}. Summary callouts: ${insightPart}. ${homeClearGrowthClosingLead}${homeClearGrowthClosingAccent}`;
}

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
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-accent">{homeClearGrowthEyebrow}</p>
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

          <figure
            className="relative mx-auto mt-10 max-w-5xl lg:mt-12"
            aria-labelledby={DASHBOARD_CAPTION_ID}
          >
            <div className="overflow-hidden rounded-2xl border border-slate-200/75 bg-white shadow-[0_2px_24px_rgba(15,23,42,0.08)] ring-1 ring-black/[0.03] dark:border-zinc-600/70 dark:bg-zinc-950/30 dark:ring-white/[0.05]">
              <HomeClearGrowthDashboardPreview />
            </div>
            <figcaption id={DASHBOARD_CAPTION_ID} className="sr-only">
              {dashboardScreenReaderSummary()}
            </figcaption>
          </figure>
        </div>
      </div>
    </section>
  );
}
