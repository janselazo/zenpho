"use client";

import { useCallback, useMemo, useState, type UIEvent } from "react";
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
    <span
      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-sm bg-white"
      aria-hidden
    >
      <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" aria-hidden>
        <path fill="#dc2626" d="M12 2.5L22.5 21H1.5L12 2.5z" />
        <path
          fill="#ffffff"
          d="M11.25 8.25h1.5v5.25h-1.5V8.25zm0 6.75h1.5v1.5h-1.5v-1.5z"
        />
      </svg>
    </span>
  );
}

const WHEEL_ROW_HEIGHT_PX = 52;
const WHEEL_VISIBLE_ROWS = 5;
const WHEEL_EDGE_PAD_ROWS = 2;

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

function SnapshotIssuesWheelPicker({ findings }: { findings: AuditFinding[] }) {
  const [scrollTop, setScrollTop] = useState(0);

  const { rowH, viewH, padPx } = useMemo(() => {
    const rowH = WHEEL_ROW_HEIGHT_PX;
    const viewH = rowH * WHEEL_VISIBLE_ROWS;
    const padPx = rowH * WHEEL_EDGE_PAD_ROWS;
    return { rowH, viewH, padPx };
  }, []);

  const onScroll = useCallback((e: UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  const viewportCenterInContent = scrollTop + viewH / 2;

  return (
    <div className="mt-8">
      <p className="mb-2 text-center text-[11px] font-medium text-text-secondary sm:text-xs">
        Scroll to browse — top items are highest impact.
      </p>
      <div
        className="relative overflow-hidden rounded-2xl border border-border [perspective:900px] [perspective-origin:center_center]"
        style={{
          maskImage: "linear-gradient(to bottom, transparent 0%, black 10%, black 90%, transparent 100%)",
          WebkitMaskImage:
            "linear-gradient(to bottom, transparent 0%, black 10%, black 90%, transparent 100%)",
        }}
      >
        <div
          onScroll={onScroll}
          className="max-h-[260px] overflow-y-auto overflow-x-hidden overscroll-y-contain [touch-action:pan-y] [scrollbar-width:thin]"
          style={{ height: `${viewH}px` }}
          role="region"
          aria-label="Revenue leak issues, scrollable list"
          tabIndex={0}
        >
          <ul
            className="relative m-0 list-none p-0 [transform-style:preserve-3d]"
            style={{
              paddingTop: padPx,
              paddingBottom: padPx,
            }}
          >
            {findings.map((finding, index) => {
              const itemCenterY = padPx + index * rowH + rowH / 2;
              const delta = itemCenterY - viewportCenterInContent;
              const abs = Math.abs(delta);
              const rotateX = clamp(delta * -0.11, -52, 52);
              const scale = clamp(1 - abs / (rowH * 4.8) * 0.22, 0.78, 1);
              const opacity = clamp(1 - abs / (rowH * 4.2) * 0.72, 0.3, 1);

              return (
                <li
                  key={finding.id}
                  className="flex items-center gap-3.5"
                  style={{
                    height: rowH,
                    transform: `rotateX(${rotateX}deg) scale(${scale})`,
                    transformOrigin: "center center",
                    opacity,
                    transition: "transform 0.08s ease-out, opacity 0.08s ease-out",
                    willChange: "transform, opacity",
                  }}
                >
                  <SnapshotWarningIcon />
                  <span className="min-w-0 flex-1 text-[15px] font-semibold leading-snug text-text-primary sm:text-base">
                    {finding.title}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}

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

  const wheelFindings = useMemo(() => {
    const s = [...findingsWithMoney].sort(
      (a, b) => b.estimatedRevenueImpactHigh - a.estimatedRevenueImpactHigh
    );
    return s;
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

      {wheelFindings.length > 0 ? <SnapshotIssuesWheelPicker findings={wheelFindings} /> : null}

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
