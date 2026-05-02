"use client";

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
import { motion } from "framer-motion";
import Button from "@/components/ui/Button";
import {
  homeClearGrowthClosingAccent,
  homeClearGrowthClosingLead,
  homeClearGrowthEyebrow,
  homeClearGrowthFinalCtaBody,
  homeClearGrowthFinalCtaHeadline,
  homeClearGrowthHeadline,
  homeClearGrowthMetricCards,
  homeClearGrowthSubheadParts,
  homeClearGrowthSummaryItems,
  type ClearGrowthMetricIcon,
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

const MAIN_ID = "home-clear-growth-heading";
const CTA_ID = "home-clear-growth-cta-heading";

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
              const orange = card.accent === "orange";
              const toneIcon = orange
                ? "text-orange-600 dark:text-orange-400"
                : "text-accent dark:text-accent";
              const toneBg = orange ? "bg-orange-500/15 dark:bg-orange-400/15" : "bg-accent/15";
              const toneLine = orange ? "bg-orange-500/50 dark:bg-orange-400/45" : "bg-accent/45";
              const toneValue = orange
                ? "text-orange-600 dark:text-orange-400"
                : "text-accent dark:text-accent";

              return (
                <div
                  key={card.id}
                  className="flex h-full flex-col rounded-2xl border border-border/70 bg-white p-5 shadow-sm dark:border-zinc-700/80 dark:bg-zinc-900/50"
                >
                  <span
                    className={`inline-flex h-11 w-11 items-center justify-center rounded-xl ${toneBg} ${toneIcon}`}
                  >
                    <Icon className="h-5 w-5" strokeWidth={2} aria-hidden />
                  </span>
                  <p className={`mt-4 text-3xl font-black tabular-nums tracking-tight ${toneValue}`}>
                    {card.value}
                  </p>
                  <p className="mt-2 text-sm font-semibold leading-snug text-text-primary">{card.label}</p>
                  <div className={`mt-auto pt-5 ${toneLine} h-1 w-full rounded-full`} aria-hidden />
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

        <motion.div
          initial={{ opacity: 1, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.08, margin: "0px 0px 120px 0px" }}
          transition={{ duration: 0.45 }}
          className="relative mt-10 overflow-hidden rounded-[2rem] border border-border bg-white p-8 text-center shadow-soft-lg ring-1 ring-black/[0.04] sm:mt-12 sm:p-10 lg:p-14 dark:border-zinc-700/80 dark:bg-zinc-900/50"
          aria-labelledby={CTA_ID}
        >
          <div className="pointer-events-none absolute inset-0 opacity-50">
            <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-accent/10 blur-3xl" />
            <div className="absolute -bottom-16 -left-12 h-48 w-48 rounded-full bg-accent-violet/10 blur-3xl" />
          </div>
          <div className="relative z-10">
            <h2
              id={CTA_ID}
              className="heading-display text-balance text-2xl font-bold tracking-tight text-text-primary sm:text-3xl lg:text-4xl"
            >
              {homeClearGrowthFinalCtaHeadline}
            </h2>
            <p className="mx-auto mt-4 max-w-lg text-sm leading-relaxed text-text-secondary sm:mt-5 sm:text-base">
              {homeClearGrowthFinalCtaBody}
            </p>
            <div className="mx-auto mt-8 flex max-w-xl flex-col items-stretch justify-center gap-3 sm:flex-row sm:gap-4">
              <Button href="/revenue" variant="primary" size="lg" className="sm:flex-1">
                Run Revenue Leak Audit
              </Button>
              <Button href="/booking" variant="dark" size="lg" showLiveDot className="sm:flex-1">
                Book a growth call
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
