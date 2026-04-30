"use client";

import { useMemo } from "react";
import type {
  AuditAssumptions,
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

function formatUsdRange(low: number, high: number): string {
  const rl = roundMoneyDisplay(low);
  const rh = roundMoneyDisplay(high);
  if (rl === rh) return usd.format(rl);
  return `${usd.format(rl)}–${usd.format(rh)}`;
}

function formatUsdSingle(n: number): string {
  return usd.format(roundMoneyDisplay(n));
}

function leakSourceLabel(category: AuditCategory): "Google Business Profile" | "Website" {
  return GBP_CATEGORIES.has(category) ? "Google Business Profile" : "Website";
}

function estimateConfidence(audit: RevenueLeakAudit): "Low" | "Medium" | "High" {
  let score = 0;
  if (audit.websiteAudit.available) score += 2;
  else score -= 1;
  if ((audit.business.reviewCount ?? 0) >= 8) score += 1;
  if (audit.warnings.length <= 2) score += 1;
  else score -= 1;
  if (audit.business.rating != null) score += 1;
  if (audit.findings.length >= 3) score += 1;
  if (score >= 5) return "High";
  if (score >= 2) return "Medium";
  return "Low";
}

function confidencePillClasses(level: "Low" | "Medium" | "High"): string {
  switch (level) {
    case "High":
      return "border border-emerald-200/90 bg-emerald-50 px-3 py-1 text-sm font-bold text-emerald-900";
    case "Medium":
      return "border border-amber-200/90 bg-amber-50 px-3 py-1 text-sm font-bold text-amber-900";
    case "Low":
      return "border border-border bg-white px-3 py-1 text-sm font-bold text-text-primary";
  }
}

function suggestedAverageJobFromCategory(category: string | null): number | null {
  if (!category?.trim()) return null;
  const c = category.toLowerCase();
  if (/hvac|plumb|electric|roof|landscap|pool|garage|locksmith|pest/i.test(c)) return 4500;
  if (/legal|attorney|law\b|cpa|account/i.test(c)) return 800;
  if (/dental|medical|clinic|chiropract|veterinar/i.test(c)) return 350;
  if (/restaurant|food|cafe|coffee/i.test(c)) return 45;
  if (/auto|repair|tire|collision/i.test(c)) return 800;
  return null;
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
              {formatUsdRange(finding.estimatedRevenueImpactLow, finding.estimatedRevenueImpactHigh)}
            </span>
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

export type RevenueLeakSnapshotProps = {
  audit: RevenueLeakAudit;
  assumptions: AuditAssumptions;
  onAssumptionsChange: (next: AuditAssumptions) => void;
  moneySummary: FoundIssuesMoneySummary;
  findingsWithMoney: AuditFinding[];
  /** Omit top leak cards when rendering them inside the action plan section. */
  hideTopLeaks?: boolean;
};

export default function RevenueLeakSnapshot({
  audit,
  assumptions,
  onAssumptionsChange,
  moneySummary,
  findingsWithMoney,
  hideTopLeaks = false,
}: RevenueLeakSnapshotProps) {
  const confidence = useMemo(() => estimateConfidence(audit), [audit]);

  const top3 = useMemo(() => {
    const s = [...findingsWithMoney].sort(
      (a, b) => b.estimatedRevenueImpactHigh - a.estimatedRevenueImpactHigh
    );
    return s.slice(0, 3);
  }, [findingsWithMoney]);

  const monthlyRange = formatUsdRange(
    moneySummary.estimatedMonthlyCostLow,
    moneySummary.estimatedMonthlyCostHigh
  );
  const annualRange = formatUsdRange(
    moneySummary.estimatedAnnualCostLow,
    moneySummary.estimatedAnnualCostHigh
  );
  const jobsRange = `${moneySummary.lostJobsPerMonthLow.toFixed(1)}–${moneySummary.lostJobsPerMonthHigh.toFixed(1)}`;

  const suggestedJob = suggestedAverageJobFromCategory(audit.business.category);
  const showJobHint =
    suggestedJob != null && assumptions.usingDefaults?.includes("averageJobValue") === true;

  const closePctInput = Math.round(assumptions.closeRate * 100);

  return (
    <section className="rounded-[2rem] border border-border bg-white p-6 shadow-soft sm:p-8">
      <div className="min-w-0">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-accent">Revenue Leak Snapshot</p>
        <h2 className="mt-2 flex flex-wrap items-baseline gap-x-1.5 text-2xl font-black tracking-tight text-text-primary sm:gap-x-2 sm:text-nowrap sm:text-3xl lg:text-4xl">
          <span>Revenue Leaks are costing you</span>
          <span className="text-accent">{monthlyRange}</span>
          <span className="text-text-primary">/ month</span>
        </h2>
      </div>

      <div className="mt-8 rounded-2xl border border-border bg-surface/40 p-5 sm:p-6">
        <h3 className="text-sm font-black uppercase tracking-[0.14em] text-text-primary">Estimate assumptions</h3>
        <p className="mt-1 text-xs text-text-secondary">Adjust these to see how the opportunity changes for your business.</p>
        {showJobHint && suggestedJob != null ? (
          <p className="mt-2 text-xs text-text-secondary">
            Suggested starting point for <span className="font-semibold text-text-primary">{audit.business.category}</span>
            : {usd.format(suggestedJob)} average job — tap to use, then refine.
            <button
              type="button"
              className="ml-2 font-bold text-accent underline decoration-accent/30 underline-offset-2"
              onClick={() =>
                onAssumptionsChange({
                  ...assumptions,
                  averageJobValue: suggestedJob,
                  usingDefaults: (assumptions.usingDefaults ?? []).filter((x) => x !== "averageJobValue"),
                })
              }
            >
              Use {usd.format(suggestedJob)}
            </button>
          </p>
        ) : null}
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label htmlFor="rva-avg-job" className="block text-xs font-bold text-text-secondary">
              Average job value
            </label>
            <div className="relative mt-1">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-text-secondary">
                $
              </span>
              <input
                id="rva-avg-job"
                type="number"
                min={1}
                step={10}
                className="w-full rounded-xl border border-border bg-white py-2.5 pl-7 pr-3 text-sm font-semibold tabular-nums outline-none focus:border-accent focus:ring-2 focus:ring-accent/15"
                value={assumptions.averageJobValue || ""}
                onChange={(e) =>
                  onAssumptionsChange({
                    ...assumptions,
                    averageJobValue: Math.max(1, Math.round(Number(e.target.value) || 0)),
                    usingDefaults: (assumptions.usingDefaults ?? []).filter((x) => x !== "averageJobValue"),
                  })
                }
              />
            </div>
          </div>
          <div>
            <label htmlFor="rva-leads" className="block text-xs font-bold text-text-secondary">
              Monthly leads (opportunities)
            </label>
            <input
              id="rva-leads"
              type="number"
              min={1}
              step={1}
              className="mt-1 w-full rounded-xl border border-border bg-white px-3 py-2.5 text-sm font-semibold tabular-nums outline-none focus:border-accent focus:ring-2 focus:ring-accent/15"
              value={assumptions.estimatedMonthlyLeads || ""}
              onChange={(e) =>
                onAssumptionsChange({
                  ...assumptions,
                  estimatedMonthlyLeads: Math.max(1, Math.round(Number(e.target.value) || 0)),
                  usingDefaults: (assumptions.usingDefaults ?? []).filter((x) => x !== "estimatedMonthlyLeads"),
                })
              }
            />
          </div>
          <div>
            <label htmlFor="rva-close" className="block text-xs font-bold text-text-secondary">
              Close rate (%)
            </label>
            <input
              id="rva-close"
              type="number"
              min={1}
              max={100}
              step={1}
              className="mt-1 w-full rounded-xl border border-border bg-white px-3 py-2.5 text-sm font-semibold tabular-nums outline-none focus:border-accent focus:ring-2 focus:ring-accent/15"
              value={closePctInput}
              onChange={(e) => {
                const raw = Math.min(100, Math.max(1, Math.round(Number(e.target.value) || 0)));
                onAssumptionsChange({
                  ...assumptions,
                  closeRate: raw / 100,
                  usingDefaults: (assumptions.usingDefaults ?? []).filter((x) => x !== "closeRate"),
                });
              }}
            />
          </div>
          <div>
            <span className="block text-xs font-bold text-text-secondary">Addressable monthly revenue</span>
            <p className="mt-3 text-sm font-black tabular-nums text-text-primary">
              {formatUsdSingle(moneySummary.addressableMonthlyRevenue)}
            </p>
            <p className="mt-0.5 text-[11px] text-text-secondary">Leads × close × avg job</p>
          </div>
        </div>
      </div>

      <div className="mt-8 rounded-2xl border border-border bg-surface/40 p-5 sm:p-6">
        <dl className="grid gap-4 sm:grid-cols-2 md:grid-cols-4 md:gap-6">
          <div>
            <dt className="text-xs font-bold uppercase tracking-wide text-text-secondary">Estimated monthly risk</dt>
            <dd className="mt-1 text-xl font-black tabular-nums text-text-primary sm:text-2xl">{monthlyRange}</dd>
          </div>
          <div>
            <dt className="text-xs font-bold uppercase tracking-wide text-text-secondary">Estimated annualized risk</dt>
            <dd className="mt-1 text-lg font-black tabular-nums text-text-primary sm:text-xl">{annualRange}</dd>
          </div>
          <div>
            <dt className="text-xs font-bold uppercase tracking-wide text-text-secondary">Jobs at risk / mo</dt>
            <dd className="mt-1 text-base font-bold tabular-nums text-text-primary sm:text-lg">{jobsRange}</dd>
          </div>
          <div>
            <dt className="text-xs font-bold uppercase tracking-wide text-text-secondary">Estimate confidence</dt>
            <dd className="mt-1">
              <span className={`inline-flex rounded-full ${confidencePillClasses(confidence)}`} aria-label={`Estimate confidence: ${confidence}`}>
                {confidence}
              </span>
            </dd>
          </div>
        </dl>
      </div>

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
