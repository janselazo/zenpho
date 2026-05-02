import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  BarChart3,
  Calendar,
  DollarSign,
  FileText,
  Handshake,
  Phone,
  Send,
  Star,
  Target,
  UserPlus,
  Users,
} from "lucide-react";
import {
  homeClearGrowthClosingAccent,
  homeClearGrowthClosingLead,
  homeClearGrowthEyebrow,
  homeClearGrowthHeadline,
  homeClearGrowthMetricCards,
  homeClearGrowthSubheadParts,
  homeClearGrowthSummaryItems,
  type ClearGrowthMetricIcon,
  type ClearGrowthMetricTone,
} from "@/lib/home-clear-growth";

const METRIC_TONE_STYLES: Record<ClearGrowthMetricTone, { icon: string; value: string }> = {
  sky: {
    icon: "text-sky-600 dark:text-sky-400",
    value: "text-sky-700 dark:text-sky-300",
  },
  teal: {
    icon: "text-teal-600 dark:text-teal-400",
    value: "text-teal-700 dark:text-teal-300",
  },
  indigo: {
    icon: "text-indigo-600 dark:text-indigo-400",
    value: "text-indigo-700 dark:text-indigo-300",
  },
  violet: {
    icon: "text-violet-600 dark:text-violet-400",
    value: "text-violet-700 dark:text-violet-300",
  },
  cyan: {
    icon: "text-cyan-600 dark:text-cyan-400",
    value: "text-cyan-700 dark:text-cyan-300",
  },
  emerald: {
    icon: "text-emerald-600 dark:text-emerald-400",
    value: "text-emerald-700 dark:text-emerald-300",
  },
  amber: {
    icon: "text-amber-700 dark:text-amber-400",
    value: "text-amber-800 dark:text-amber-300",
  },
  blue: {
    icon: "text-blue-600 dark:text-blue-400",
    value: "text-blue-700 dark:text-blue-300",
  },
  orange: {
    icon: "text-orange-600 dark:text-orange-400",
    value: "text-orange-700 dark:text-orange-300",
  },
  rose: {
    icon: "text-rose-600 dark:text-rose-400",
    value: "text-rose-700 dark:text-rose-300",
  },
};

const METRIC_ICONS: Record<ClearGrowthMetricIcon, LucideIcon> = {
  users: Users,
  phone: Phone,
  fileText: FileText,
  calendar: Calendar,
  send: Send,
  dollarSign: DollarSign,
  star: Star,
  handshake: Handshake,
  userPlus: UserPlus,
  target: Target,
};

const MAIN_ID = "home-clear-growth-heading";

export default function HomeClearGrowthSection() {
  return (
    <section
      id="clear-growth"
      className="relative w-full border-t border-border/50 bg-background py-16 sm:py-20 lg:py-24"
      aria-labelledby={MAIN_ID}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="rounded-[2rem] border border-border/80 bg-white p-8 shadow-soft ring-1 ring-black/[0.04] sm:p-10 lg:p-12 dark:border-zinc-700/80 dark:bg-zinc-900/35">
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

          <div className="mx-auto mt-10 grid max-w-6xl grid-cols-1 gap-4 sm:grid-cols-2 lg:mt-12 lg:grid-cols-5">
            {homeClearGrowthMetricCards.map((card) => {
              const Icon = METRIC_ICONS[card.icon];
              const tone = METRIC_TONE_STYLES[card.tone];

              return (
                <div
                  key={card.id}
                  className="flex h-full flex-col rounded-2xl border border-border/70 bg-white p-5 shadow-sm dark:border-zinc-700/80 dark:bg-zinc-900/50"
                >
                  <Icon
                    className={`h-5 w-5 ${tone.icon}`}
                    strokeWidth={2}
                    aria-hidden
                  />
                  <p className={`mt-4 text-3xl font-black tabular-nums tracking-tight ${tone.value}`}>
                    {card.value}
                  </p>
                  <p className="mt-2 text-sm font-semibold leading-snug text-text-primary">{card.label}</p>
                </div>
              );
            })}
          </div>

          <div className="mx-auto mt-10 max-w-4xl rounded-2xl border border-border/70 bg-white px-6 py-6 shadow-sm sm:mt-12 sm:px-8 dark:border-zinc-700/80 dark:bg-zinc-900/50">
            <div className="grid gap-8 sm:grid-cols-2 sm:gap-0 sm:divide-x sm:divide-border/70">
              {homeClearGrowthSummaryItems.map((item, i) => {
                const SummaryIcon = item.icon === "barChart3" ? BarChart3 : AlertTriangle;
                return (
                  <div
                    key={item.id}
                    className={`flex gap-4 ${i === 1 ? "sm:pl-8" : "sm:pr-8"}`}
                  >
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-accent/15 text-accent dark:bg-accent/20">
                      <SummaryIcon className="h-5 w-5" strokeWidth={2} aria-hidden />
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold tracking-wide text-accent">{item.eyebrow}</p>
                      <p className="mt-1.5 text-lg font-bold leading-snug text-text-primary sm:text-xl">
                        {item.value}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <p className="mx-auto mt-10 max-w-2xl text-center text-base leading-relaxed text-text-primary sm:mt-12 sm:text-lg">
            {homeClearGrowthClosingLead}
            <span className="font-bold text-accent">{homeClearGrowthClosingAccent}</span>
          </p>
        </div>
      </div>
    </section>
  );
}
