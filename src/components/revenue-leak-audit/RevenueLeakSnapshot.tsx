"use client";

import { useMemo } from "react";
import type {
  AuditCategory,
  AuditFinding,
  AuditSeverity,
  FoundIssuesMoneySummary,
  RevenueLeakAudit,
} from "@/lib/revenue-leak-audit/types";

const GBP_CATEGORIES = new Set<AuditCategory>([
  "My Business vs Google Competitors",
  "Google Business Profile",
  "Reviews & Reputation",
  "Photo Quality & Quantity",
]);

const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

function roundMoneyDisplay(n: number): number {
  const step = Math.max(Math.abs(n), 0) >= 5000 ? 100 : 10;
  return Math.round(n / step) * step;
}

function formatUsdSingle(n: number): string {
  return usd.format(roundMoneyDisplay(n));
}

/** Midpoint of low/high impact, same rounding as other snapshot money. */
function formatFindingImpactAverage(low: number, high: number): string {
  return formatUsdSingle((low + high) / 2);
}

function leakSourceLabel(category: AuditCategory): "Google Business Profile" | "Website" {
  return GBP_CATEGORIES.has(category) ? "Google Business Profile" : "Website";
}

function effortLabel(finding: AuditFinding, audit: RevenueLeakAudit): "Easy" | "Medium" | "Hard" {
  const idx = audit.findings.findIndex((f) => f.id === finding.id);
  if (idx >= 0 && idx < audit.actionPlan.length) {
    const d = audit.actionPlan[idx].difficulty;
    if (d === "Low") return "Easy";
    if (d === "Medium") return "Medium";
    return "Hard";
  }
  if (finding.severity === "Critical" || finding.severity === "High") return "Hard";
  if (finding.severity === "Medium") return "Medium";
  return "Easy";
}

function severityCardTone(sev: AuditSeverity): string {
  switch (sev) {
    case "Critical":
      return "border-rose-200 bg-rose-50/80";
    case "High":
      return "border-orange-200 bg-orange-50/70";
    case "Medium":
      return "border-amber-200 bg-amber-50/60";
    default:
      return "border-slate-200 bg-slate-50/80";
  }
}

function severityBadge(sev: AuditSeverity): string {
  switch (sev) {
    case "Critical":
      return "bg-rose-100 text-rose-800";
    case "High":
      return "bg-orange-100 text-orange-900";
    case "Medium":
      return "bg-amber-100 text-amber-900";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

function hasCostEstimate(f: AuditFinding): boolean {
  return f.estimatedRevenueImpactHigh > 0 || f.estimatedRevenueImpactLow > 0;
}

function TopLeakCard({ finding, audit }: { finding: AuditFinding; audit: RevenueLeakAudit }) {
  const source = leakSourceLabel(finding.category);
  const effort = effortLabel(finding, audit);
  const hasCost = hasCostEstimate(finding);
  return (
    <article
      className={`flex flex-col rounded-2xl border p-5 shadow-sm ${severityCardTone(finding.severity)}`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full border border-border bg-white/90 px-2.5 py-0.5 text-[11px] font-bold text-text-secondary">
          {source}
        </span>
        <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${severityBadge(finding.severity)}`}>
          {finding.severity}
        </span>
        <span className="rounded-full border border-border bg-white/90 px-2.5 py-0.5 text-[11px] font-semibold text-text-secondary">
          Effort: {effort}
        </span>
      </div>
      <h3 className="mt-3 text-lg font-black leading-snug text-text-primary">{finding.title}</h3>
      <p className="mt-2 text-sm font-bold text-text-primary">
        {hasCost ? (
          <>
            Estimated monthly revenue at risk:{" "}
            <span className="tabular-nums text-accent">
              {formatFindingImpactAverage(
                finding.estimatedRevenueImpactLow,
                finding.estimatedRevenueImpactHigh
              )}
            </span>{" "}
            average
          </>
        ) : (
          <span className="font-semibold text-text-secondary">Not enough data to estimate cost for this item.</span>
        )}
      </p>
      <p className="mt-2 text-sm leading-relaxed text-text-secondary">
        <span className="font-semibold text-text-primary">Evidence: </span>
        {finding.whatWeFound}
      </p>
      <p className="mt-2 text-sm leading-relaxed text-text-secondary">
        <span className="font-semibold text-text-primary">Why it matters: </span>
        {finding.whyItMatters}
      </p>
      <p className="mt-3 text-sm leading-relaxed text-text-secondary">
        <span className="font-semibold text-text-primary">Recommended fix: </span>
        {finding.recommendedFix}
      </p>
    </article>
  );
}

export function RevenueLeakTopLeaksSection({
  audit,
  findingsWithMoney,
}: {
  audit: RevenueLeakAudit;
  findingsWithMoney: AuditFinding[];
}) {
  const top3 = useMemo(() => {
    const s = [...findingsWithMoney].sort(
      (a, b) => b.estimatedRevenueImpactHigh - a.estimatedRevenueImpactHigh
    );
    return s.slice(0, 3);
  }, [findingsWithMoney]);

  return (
    <div className="mt-8">
      <h3 className="text-lg font-black text-text-primary">Your biggest revenue leaks</h3>
      <p className="mt-1 text-sm text-text-secondary">
        Fix order follows estimated impact. Only issues observed in your Google Business Profile and website audit are
        shown.
      </p>
      {top3.length === 0 ? (
        <p className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 text-sm font-semibold text-emerald-900">
          No major issues were flagged in this snapshot.
        </p>
      ) : (
        <div className="mt-5 grid gap-4 lg:grid-cols-3">
          {top3.map((f) => (
            <TopLeakCard key={f.id} finding={f} audit={audit} />
          ))}
        </div>
      )}
    </div>
  );
}

function SnapshotWarningIcon() {
  return (
    <span className="relative flex h-9 w-9 shrink-0 items-center justify-center" aria-hidden>
      <span className="absolute inset-[-2px] rounded-lg bg-red-500/30 blur-[7px]" />
      <svg viewBox="0 0 24 24" className="relative h-7 w-7 drop-shadow-md" aria-hidden>
        <path fill="#dc2626" d="M12 2.5L22.5 21H1.5L12 2.5z" />
        <path
          fill="#ffffff"
          d="M11.25 8.25h1.5v5.25h-1.5V8.25zm0 6.75h1.5v1.5h-1.5v-1.5z"
        />
      </svg>
    </span>
  );
}

const SNAPSHOT_TOP_ISSUES = 5;

export type RevenueLeakSnapshotProps = {
  audit: RevenueLeakAudit;
  moneySummary: FoundIssuesMoneySummary;
  findingsWithMoney: AuditFinding[];
  /** Omit top leak cards when rendering them inside the action plan section. */
  hideTopLeaks?: boolean;
};

export default function RevenueLeakSnapshot({
  audit,
  moneySummary,
  findingsWithMoney,
  hideTopLeaks = false,
}: RevenueLeakSnapshotProps) {
  const top3 = useMemo(() => {
    const s = [...findingsWithMoney].sort(
      (a, b) => b.estimatedRevenueImpactHigh - a.estimatedRevenueImpactHigh
    );
    return s.slice(0, 3);
  }, [findingsWithMoney]);

  const topIssueRows = useMemo(() => {
    const s = [...findingsWithMoney].sort(
      (a, b) => b.estimatedRevenueImpactHigh - a.estimatedRevenueImpactHigh
    );
    return s.slice(0, SNAPSHOT_TOP_ISSUES);
  }, [findingsWithMoney]);

  const issueCount = moneySummary.totalIssues;
  const avgMonthly = formatUsdSingle(moneySummary.estimatedMonthlyCost);

  return (
    <section className="rounded-[2rem] border border-border bg-white p-6 shadow-soft sm:p-8">
      <div className="min-w-0">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-accent">Revenue Leak Snapshot</p>
        <h2 className="mt-2 text-2xl font-black tracking-tight text-text-primary sm:text-3xl lg:text-4xl">
          {issueCount === 0 ? (
            <>No major revenue leaks were flagged in this snapshot.</>
          ) : (
            <>
              <span className="tabular-nums">{issueCount}</span>{" "}
              {issueCount === 1 ? "issue" : "issues"} are costing you{" "}
              <span className="text-accent">{avgMonthly}</span> average / month
            </>
          )}
        </h2>
      </div>

      {topIssueRows.length > 0 ? (
        <ul className="mt-8 space-y-4">
          {topIssueRows.map((finding, index) => (
            <li key={finding.id} className="flex gap-3.5">
              <SnapshotWarningIcon />
              <span
                className={`min-w-0 pt-0.5 text-[15px] font-semibold leading-snug sm:text-base ${
                  index >= 3 ? "text-text-secondary" : "text-text-primary"
                }`}
              >
                {finding.title}
              </span>
            </li>
          ))}
        </ul>
      ) : null}

      {!hideTopLeaks ? (
        <div className="mt-10">
          <h3 className="text-lg font-black text-text-primary">Your biggest revenue leaks</h3>
          <p className="mt-1 text-sm text-text-secondary">
            Fix order follows estimated impact. Only issues observed in your Google Business Profile and website audit
            are shown.
          </p>
          {top3.length === 0 ? (
            <p className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 text-sm font-semibold text-emerald-900">
              No major issues were flagged in this snapshot.
            </p>
          ) : (
            <div className="mt-5 grid gap-4 lg:grid-cols-3">
              {top3.map((f) => (
                <TopLeakCard key={f.id} finding={f} audit={audit} />
              ))}
            </div>
          )}
        </div>
      ) : null}

    </section>
  );
}
