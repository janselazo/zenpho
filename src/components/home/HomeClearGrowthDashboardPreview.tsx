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
  TrendingUp,
  UserPlus,
  Users,
} from "lucide-react";
import type { ClearGrowthMetricIcon, ClearGrowthMetricTone } from "@/lib/home-clear-growth";
import {
  homeClearGrowthClosingAccent,
  homeClearGrowthClosingLead,
  homeClearGrowthMetricCards,
  homeClearGrowthSummaryItems,
} from "@/lib/home-clear-growth";

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

const SUMMARY_ICONS = {
  barChart3: BarChart3,
  alertTriangle: AlertTriangle,
} as const;

const toneIconWrap: Record<ClearGrowthMetricTone, string> = {
  sky: "bg-sky-500/[0.14] text-sky-600 dark:bg-sky-400/12 dark:text-sky-400",
  teal: "bg-teal-500/[0.14] text-teal-600 dark:bg-teal-400/12 dark:text-teal-400",
  indigo: "bg-indigo-500/[0.14] text-indigo-600 dark:bg-indigo-400/12 dark:text-indigo-400",
  violet: "bg-violet-500/[0.14] text-violet-600 dark:bg-violet-400/12 dark:text-violet-400",
  cyan: "bg-cyan-500/[0.14] text-cyan-600 dark:bg-cyan-400/12 dark:text-cyan-400",
  emerald: "bg-emerald-500/[0.14] text-emerald-600 dark:bg-emerald-400/12 dark:text-emerald-400",
  amber: "bg-amber-500/[0.14] text-amber-600 dark:bg-amber-400/12 dark:text-amber-400",
  blue: "bg-blue-500/[0.14] text-blue-600 dark:bg-blue-400/12 dark:text-blue-400",
  orange: "bg-orange-500/[0.14] text-orange-600 dark:bg-orange-400/12 dark:text-orange-400",
  rose: "bg-rose-500/[0.14] text-rose-600 dark:bg-rose-400/12 dark:text-rose-400",
};

const toneValue: Record<ClearGrowthMetricTone, string> = {
  sky: "text-sky-600 dark:text-sky-400",
  teal: "text-teal-600 dark:text-teal-400",
  indigo: "text-indigo-600 dark:text-indigo-400",
  violet: "text-violet-600 dark:text-violet-400",
  cyan: "text-cyan-600 dark:text-cyan-400",
  emerald: "text-emerald-600 dark:text-emerald-400",
  amber: "text-amber-600 dark:text-amber-400",
  blue: "text-blue-600 dark:text-blue-400",
  orange: "text-orange-600 dark:text-orange-400",
  rose: "text-rose-600 dark:text-rose-400",
};

/** Rolling hills, bars, and trend — tuned to align with the old composite layout */
function GrowthSceneIllustration({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 240 128"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <circle cx="208" cy="24" r="18" fill="#FEF9C3" opacity={0.95} className="dark:fill-amber-100/20" />
      {/* distant hill */}
      <path
        d="M0 88 C48 52 96 72 140 64 C168 58 208 44 240 52 V128 H0 Z"
        fill="#DCFCE7"
        className="dark:fill-emerald-950/45"
      />
      {/* near hill */}
      <path
        d="M0 96 C56 70 88 84 132 86 C168 78 212 82 240 74 V128 H0 Z"
        fill="#BBF7D0"
        fillOpacity={0.94}
        className="dark:fill-emerald-900/50"
      />
      {/* bars — shared baseline y=96 */}
      <rect x="38" y="78" width="12" height="18" rx="3" fill="#4ADE80" className="dark:fill-emerald-500" />
      <rect x="56" y="68" width="12" height="28" rx="3" fill="#22C55E" className="dark:fill-emerald-400" />
      <rect x="74" y="58" width="12" height="38" rx="3" fill="#16A34A" className="dark:fill-emerald-500" />
      <rect x="92" y="48" width="12" height="48" rx="3" fill="#22C55E" className="dark:fill-emerald-400" />
      <rect x="110" y="40" width="12" height="56" rx="3" fill="#4ADE80" className="dark:fill-emerald-500" />
      <path
        d="M32 92 L58 80 L84 72 L110 60 L144 46"
        stroke="#15803D"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="dark:stroke-emerald-400"
        fill="none"
      />
      <path
        d="M132 50 L144 46 L138 58"
        stroke="#15803D"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="dark:stroke-emerald-400"
        fill="none"
      />
    </svg>
  );
}

function PlantGlyph({ className, mirror }: { className?: string; mirror?: boolean }) {
  return (
    <svg
      className={className}
      viewBox="0 0 36 44"
      fill="none"
      aria-hidden
      style={mirror ? { transform: "scaleX(-1)" } : undefined}
    >
      <ellipse cx="18" cy="40" rx="11" ry="3.5" fill="#A16207" fillOpacity={0.22} />
      <path
        d="M18 40 V23 M11 31 Q18 12 25 31 M13 34 Q18 16 23 34"
        stroke="#15803D"
        strokeWidth="1.85"
        strokeLinecap="round"
        className="dark:stroke-emerald-400/85"
      />
    </svg>
  );
}

export default function HomeClearGrowthDashboardPreview() {
  return (
    <div className="relative overflow-hidden bg-gradient-to-b from-[#f8fafc] via-white to-white px-5 pb-7 pt-5 sm:px-8 sm:pb-8 sm:pt-6 dark:from-zinc-900/85 dark:via-zinc-950/50 dark:to-zinc-950/40">
      {/* Illustration: anchored top-right with reserved width so metrics never overlap */}
      <div
        className="pointer-events-none absolute right-0 top-0 w-[min(48%,230px)] max-w-[230px] translate-y-0 opacity-[0.98] sm:right-1 sm:top-1 lg:w-[210px]"
        aria-hidden
      >
        <GrowthSceneIllustration className="h-auto w-full" />
      </div>

      <ul
        className="relative z-[1] mx-auto grid max-w-[960px] grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-3.5 lg:grid-cols-5 lg:gap-4 auto-rows-fr pr-0 sm:pr-[min(12%,8rem)] lg:pr-[7.5rem]"
      >
        {homeClearGrowthMetricCards.map((m) => {
          const Icon = METRIC_ICONS[m.icon];
          return (
            <li
              key={m.id}
              className="flex h-full min-h-[118px] flex-col rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_1px_3px_rgba(15,23,42,0.06),0_1px_2px_rgba(15,23,42,0.04)] dark:border-zinc-600/55 dark:bg-zinc-900/75 dark:shadow-none sm:min-h-[124px]"
            >
              <div
                className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${toneIconWrap[m.tone]}`}
              >
                <Icon className="h-[18px] w-[18px]" strokeWidth={2} aria-hidden />
              </div>
              <p
                className={`mt-3 font-bold tabular-nums tracking-tight ${m.id === "revenue" ? "text-[1.35rem] leading-none sm:text-2xl" : "text-[1.2rem] leading-none sm:text-xl"} ${toneValue[m.tone]}`}
              >
                {m.value}
              </p>
              <p className="mt-auto pt-2 text-[11px] font-medium leading-snug text-text-secondary sm:text-[12px]">
                {m.label}
              </p>
            </li>
          );
        })}
      </ul>

      <ul className="relative z-[1] mx-auto mt-6 grid max-w-[960px] gap-3 sm:grid-cols-2 sm:gap-4">
        {homeClearGrowthSummaryItems.map((item) => {
          const Icon = SUMMARY_ICONS[item.icon];
          return (
            <li
              key={item.id}
              className="flex min-h-[4.5rem] items-center gap-3.5 rounded-2xl border border-slate-200/80 bg-white px-4 py-3.5 shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:border-zinc-600/55 dark:bg-zinc-900/75 sm:px-5 sm:py-4"
            >
              <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600 dark:bg-zinc-800 dark:text-zinc-300">
                <Icon className="h-[18px] w-[18px]" strokeWidth={2} aria-hidden />
              </span>
              <p className="min-w-0 text-[13px] leading-snug text-text-primary sm:text-sm">
                <span className="font-bold uppercase tracking-[0.08em] text-text-secondary">{item.eyebrow}: </span>
                <span className="font-semibold text-text-primary">{item.value}</span>
              </p>
            </li>
          );
        })}
      </ul>

      <div className="relative z-[1] mx-auto mt-7 max-w-[960px]">
        <div className="relative overflow-visible rounded-2xl border border-emerald-200/70 bg-gradient-to-r from-emerald-50 via-emerald-50/98 to-emerald-50 px-3 py-3 sm:px-5 sm:py-3.5 dark:border-emerald-900/45 dark:from-emerald-950/40 dark:via-emerald-950/35 dark:to-emerald-950/40">
          <PlantGlyph className="pointer-events-none absolute -bottom-1 left-1 z-10 h-11 w-9 sm:left-3 sm:h-12 sm:w-10" />
          <PlantGlyph
            className="pointer-events-none absolute -bottom-1 right-1 z-10 h-11 w-9 sm:right-3 sm:h-12 sm:w-10"
            mirror
          />
          <div className="flex items-center gap-3 pl-10 pr-10 sm:gap-4 sm:pl-14 sm:pr-14">
            <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-600/12 text-emerald-800 dark:bg-emerald-400/12 dark:text-emerald-300">
              <TrendingUp className="h-[18px] w-[18px]" strokeWidth={2} aria-hidden />
            </span>
            <p className="min-w-0 text-pretty text-center text-[13px] font-medium leading-snug text-emerald-950 sm:text-sm dark:text-emerald-100/95">
              {homeClearGrowthClosingLead}
              <span className="font-bold text-accent">{homeClearGrowthClosingAccent}</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
