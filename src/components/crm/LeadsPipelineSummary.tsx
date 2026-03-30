"use client";

import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  YAxis,
} from "recharts";
import {
  CheckCircle2,
  ChevronDown,
  Download,
  Filter,
  HelpCircle,
  TrendingUp,
} from "lucide-react";
import {
  enumerateDays,
  formatDashboardRangeLabel,
} from "@/lib/crm/dashboard-range";
import {
  leadStageLabelColor,
  normalizeLeadStageForPipeline,
  type PipelineColumnDef,
} from "@/lib/crm/pipeline-columns";

export type LeadsPipelineSummaryRow = {
  id: string;
  name: string | null;
  email: string | null;
  phone?: string | null;
  company: string | null;
  stage: string | null;
  source?: string | null;
  notes?: string | null;
  project_type?: string | null;
  created_at?: string | null;
};

function toYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function leadCreatedYmd(lead: LeadsPipelineSummaryRow): string | null {
  if (!lead.created_at) return null;
  return lead.created_at.slice(0, 10);
}

function inYmdRange(ymd: string | null, from: string, to: string): boolean {
  if (!ymd) return false;
  return ymd >= from && ymd <= to;
}

function shiftRangeOneYear(from: string, to: string): { from: string; to: string } {
  const parse = (s: string) => {
    const [y, m, d] = s.split("-").map(Number);
    return new Date(y, m - 1, d);
  };
  const a = parse(from);
  const b = parse(to);
  a.setFullYear(a.getFullYear() - 1);
  b.setFullYear(b.getFullYear() - 1);
  return { from: toYmd(a), to: toYmd(b) };
}

/** First pipeline index at or after a “booking / serious” stage (discovery+). */
function bookingEntryIndex(pipeline: PipelineColumnDef[]): number {
  const entrySlugs = [
    "discoverycall_scheduled",
    "discoverycall_completed",
    "proposal_sent",
    "negotiation",
    "closed_won",
  ];
  for (const slug of entrySlugs) {
    const i = pipeline.findIndex((c) => c.slug === slug);
    if (i >= 0) return i;
  }
  const byLabel = pipeline.findIndex((c) =>
    /discovery\s*call\s*scheduled|proposal|negotiation|closed\s*won/i.test(
      c.label
    )
  );
  return byLabel;
}

function isBookingOrLater(
  rawStage: string | null,
  pipeline: PipelineColumnDef[]
): boolean {
  const slug = normalizeLeadStageForPipeline(rawStage, pipeline);
  const li = pipeline.findIndex((c) => c.slug === slug);
  const bi = bookingEntryIndex(pipeline);
  if (bi < 0 || li < 0) return false;
  return li >= bi;
}

function isClosedWon(
  rawStage: string | null,
  pipeline: PipelineColumnDef[]
): boolean {
  return normalizeLeadStageForPipeline(rawStage, pipeline) === "closed_won";
}

type Bucket = { start: string; end: string; label: string };

function dayBuckets(from: string, to: string, maxPoints = 24): Bucket[] {
  const days = enumerateDays(from, to);
  if (days.length === 0) return [];
  if (days.length <= maxPoints) {
    return days.map((d) => ({ start: d, end: d, label: d.slice(5) }));
  }
  const size = Math.ceil(days.length / maxPoints);
  const out: Bucket[] = [];
  for (let i = 0; i < days.length; i += size) {
    const slice = days.slice(i, i + size);
    out.push({
      start: slice[0],
      end: slice[slice.length - 1],
      label: slice[0].slice(5),
    });
  }
  return out;
}

function countInBuckets(
  leads: LeadsPipelineSummaryRow[],
  from: string,
  to: string,
  predicate: (lead: LeadsPipelineSummaryRow) => boolean
): { label: string; v: number }[] {
  const buckets = dayBuckets(from, to);
  return buckets.map((b) => {
    let n = 0;
    for (const lead of leads) {
      const ymd = leadCreatedYmd(lead);
      if (!ymd || ymd < b.start || ymd > b.end) continue;
      if (predicate(lead)) n += 1;
    }
    return { label: b.label, v: n };
  });
}

function conversionSeries(
  leads: LeadsPipelineSummaryRow[],
  pipeline: PipelineColumnDef[],
  from: string,
  to: string
): { label: string; v: number }[] {
  const buckets = dayBuckets(from, to);
  return buckets.map((b) => {
    let inq = 0;
    let won = 0;
    for (const lead of leads) {
      const ymd = leadCreatedYmd(lead);
      if (!ymd || ymd < b.start || ymd > b.end) continue;
      inq += 1;
      if (isClosedWon(lead.stage, pipeline)) won += 1;
    }
    const v = inq > 0 ? Math.round((won / inq) * 1000) / 10 : 0;
    return { label: b.label, v };
  });
}

function pctChange(cur: number, prev: number): { pct: number; up: boolean } | null {
  if (prev === 0 && cur === 0) return null;
  if (prev === 0) return { pct: 100, up: cur > 0 };
  const raw = ((cur - prev) / prev) * 100;
  const rounded = Math.round(Math.abs(raw) * 10) / 10;
  return { pct: rounded, up: raw >= 0 };
}

function formatCount(n: number) {
  return n.toLocaleString(undefined, { maximumFractionDigits: 0 });
}

function escapeCsvCell(s: string) {
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function buildQuarterPresets(): { label: string; from: string; to: string }[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const cy = today.getFullYear();
  const out: { label: string; from: string; to: string }[] = [];
  for (let y = cy; y >= cy - 4; y--) {
    for (let q = 4; q >= 1; q--) {
      const from = new Date(y, (q - 1) * 3, 1);
      if (from > today) continue;
      const to = new Date(y, q * 3, 0);
      out.push({
        label: `Q${q}, ${y}`,
        from: toYmd(from),
        to: toYmd(to),
      });
    }
  }
  return out;
}

function thisQuarterRange(): { from: string; to: string } {
  const now = new Date();
  const q = Math.floor(now.getMonth() / 3);
  const from = new Date(now.getFullYear(), q * 3, 1);
  const to = new Date(now.getFullYear(), q * 3 + 3, 0);
  return { from: toYmd(from), to: toYmd(to) };
}

function last30Range(): { from: string; to: string } {
  const to = new Date();
  to.setHours(0, 0, 0, 0);
  const from = new Date(to);
  from.setDate(from.getDate() - 29);
  return { from: toYmd(from), to: toYmd(to) };
}

function thisYearRange(): { from: string; to: string } {
  const now = new Date();
  const from = new Date(now.getFullYear(), 0, 1);
  const to = new Date(now.getFullYear(), 11, 31);
  return { from: toYmd(from), to: toYmd(to) };
}

const cardShell =
  "relative overflow-hidden rounded-2xl border border-border/80 bg-white p-4 shadow-sm dark:border-zinc-700/70 dark:bg-zinc-900/50";

function MiniSparkline({
  data,
  positive,
  chartId,
  variant = "count",
}: {
  data: { label: string; v: number }[];
  positive: boolean;
  chartId: string;
  variant?: "count" | "percent";
}) {
  const stroke = positive ? "#22c55e" : "#f472b6";
  const fillId = `spark-${chartId}`;
  if (data.length === 0) {
    return <div className="h-12 w-[4.5rem] shrink-0" />;
  }
  const yDomain: [number, number | string] =
    variant === "percent" ? [0, 100] : [0, "dataMax"];
  return (
    <div className="relative h-12 w-[4.5rem] shrink-0">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={stroke} stopOpacity={0.45} />
              <stop offset="100%" stopColor={stroke} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <YAxis hide domain={yDomain} />
          <Area
            type="monotone"
            dataKey="v"
            stroke={stroke}
            strokeWidth={1.75}
            fill={`url(#${fillId})`}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

type SummaryCardProps = {
  title: string;
  value: string;
  sub: string;
  trend: { pct: number; up: boolean } | null;
  spark: { label: string; v: number }[];
  icon: React.ReactNode;
  chartId: string;
  sparkVariant?: "count" | "percent";
};

function SummaryCard({
  title,
  value,
  sub,
  trend,
  spark,
  icon,
  chartId,
  sparkVariant = "count",
}: SummaryCardProps) {
  const up = trend?.up ?? true;
  const trendColor = trend == null ? "text-zinc-400" : up ? "text-emerald-600 dark:text-emerald-400" : "text-pink-600 dark:text-pink-400";
  return (
    <div className={cardShell}>
      <div
        className="pointer-events-none absolute -bottom-6 -right-6 h-28 w-28 rounded-full blur-2xl dark:opacity-90"
        style={{
          background:
            trend == null
              ? "radial-gradient(circle, rgb(167 139 250 / 0.2) 0%, transparent 70%)"
              : up
                ? "radial-gradient(circle, rgb(34 197 94 / 0.22) 0%, transparent 70%)"
                : "radial-gradient(circle, rgb(244 114 182 / 0.22) 0%, transparent 70%)",
        }}
        aria-hidden
      />
      <div className="relative flex items-start justify-between gap-2">
        <div className="flex min-w-0 flex-1 items-start gap-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-violet-100 text-violet-600 dark:bg-violet-950/80 dark:text-violet-300">
            {icon}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-text-primary underline decoration-zinc-300 decoration-1 underline-offset-2 dark:text-zinc-100 dark:decoration-zinc-600">
              {title}
            </p>
          </div>
        </div>
      </div>
      <div className="relative mt-3 flex items-end justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-2xl font-bold tabular-nums tracking-tight text-text-primary dark:text-zinc-50">
            {value}
          </p>
          <p className="mt-0.5 text-[11px] text-text-secondary dark:text-zinc-500">
            {sub}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          {trend ? (
            <span className={`text-sm font-semibold tabular-nums ${trendColor}`}>
              {trend.pct}%
              {trend.up ? " ↑" : " ↓"}
            </span>
          ) : (
            <span className="text-sm font-medium text-zinc-400">—</span>
          )}
          <MiniSparkline
            data={spark}
            positive={trend?.up ?? true}
            chartId={chartId}
            variant={sparkVariant}
          />
        </div>
      </div>
    </div>
  );
}

export default function LeadsPipelineSummary({
  leads,
  leadPipeline,
  searchQuery,
}: {
  leads: LeadsPipelineSummaryRow[];
  leadPipeline: PipelineColumnDef[];
  searchQuery: string;
}) {
  const tq = thisQuarterRange();
  const [rangeKey, setRangeKey] = useState<string>("this-quarter");

  const quarterPresets = useMemo(() => buildQuarterPresets(), []);

  const range = useMemo(() => {
    if (rangeKey === "this-quarter") return tq;
    if (rangeKey === "last-30") return last30Range();
    if (rangeKey === "this-year") return thisYearRange();
    const hit = quarterPresets.find((q) => `${q.from}|${q.to}` === rangeKey);
    if (hit) return { from: hit.from, to: hit.to };
    return tq;
  }, [rangeKey, quarterPresets, tq]);

  const priorRange = useMemo(
    () => shiftRangeOneYear(range.from, range.to),
    [range.from, range.to]
  );

  const metrics = useMemo(() => {
    const inPeriod = (lead: LeadsPipelineSummaryRow) =>
      inYmdRange(leadCreatedYmd(lead), range.from, range.to);
    const inPrior = (lead: LeadsPipelineSummaryRow) =>
      inYmdRange(leadCreatedYmd(lead), priorRange.from, priorRange.to);

    const inquiries = (pred: (l: LeadsPipelineSummaryRow) => boolean) =>
      leads.filter((l) => pred(l) && inPeriod(l)).length;
    const inquiriesPrior = (pred: (l: LeadsPipelineSummaryRow) => boolean) =>
      leads.filter((l) => pred(l) && inPrior(l)).length;

    const inq = inquiries(() => true);
    const inqP = inquiriesPrior(() => true);

    const book = inquiries((l) => isBookingOrLater(l.stage, leadPipeline));
    const bookP = inquiriesPrior((l) => isBookingOrLater(l.stage, leadPipeline));

    const del = inquiries((l) => isClosedWon(l.stage, leadPipeline));
    const delP = inquiriesPrior((l) => isClosedWon(l.stage, leadPipeline));

    const conv = inq > 0 ? Math.round((del / inq) * 1000) / 10 : 0;
    const convP = inqP > 0 ? Math.round((delP / inqP) * 1000) / 10 : 0;

    const sparkInq = countInBuckets(leads, range.from, range.to, () => true);
    const sparkBook = countInBuckets(
      leads,
      range.from,
      range.to,
      (l) => isBookingOrLater(l.stage, leadPipeline)
    );
    const sparkDel = countInBuckets(
      leads,
      range.from,
      range.to,
      (l) => isClosedWon(l.stage, leadPipeline)
    );
    const sparkConv = conversionSeries(leads, leadPipeline, range.from, range.to);

    return {
      inq,
      inqP,
      book,
      bookP,
      del,
      delP,
      conv,
      convP,
      sparkInq,
      sparkBook,
      sparkDel,
      sparkConv,
    };
  }, [leads, leadPipeline, range.from, range.to, priorRange.from, priorRange.to]);

  function exportCsv() {
    const q = searchQuery.trim().toLowerCase();
    const rows = leads.filter((l) => {
      if (!inYmdRange(leadCreatedYmd(l), range.from, range.to)) return false;
      if (!q) return true;
      return (
        l.name?.toLowerCase().includes(q) ||
        l.email?.toLowerCase().includes(q) ||
        l.company?.toLowerCase().includes(q) ||
        l.source?.toLowerCase().includes(q) ||
        l.project_type?.toLowerCase().includes(q) ||
        false
      );
    });

    const headers = [
      "Name",
      "Email",
      "Phone",
      "Company",
      "Stage",
      "Source",
      "Project type",
      "Created",
      "Notes",
    ];
    const lines = [
      headers.join(","),
      ...rows.map((l) => {
        const stageLabel = leadStageLabelColor(
          normalizeLeadStageForPipeline(l.stage, leadPipeline),
          leadPipeline
        ).label;
        return [
          escapeCsvCell(l.name ?? ""),
          escapeCsvCell(l.email ?? ""),
          escapeCsvCell(l.phone ?? ""),
          escapeCsvCell(l.company ?? ""),
          escapeCsvCell(stageLabel),
          escapeCsvCell(l.source ?? ""),
          escapeCsvCell(l.project_type ?? ""),
          escapeCsvCell(leadCreatedYmd(l) ?? ""),
          escapeCsvCell((l.notes ?? "").replace(/\r?\n/g, " ")),
        ].join(",");
      }),
    ];
    const blob = new Blob([lines.join("\n")], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `leads-${range.from}-to-${range.to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const selectOptions = useMemo(() => {
    const opts: { key: string; label: string }[] = [
      { key: "this-quarter", label: "This quarter" },
      { key: "last-30", label: "Last 30 days" },
      { key: "this-year", label: "This year" },
      ...quarterPresets.map((q) => ({
        key: `${q.from}|${q.to}`,
        label: q.label,
      })),
    ];
    return opts;
  }, [quarterPresets]);

  return (
    <div className="mt-6 rounded-2xl border border-border/80 bg-white p-5 shadow-sm dark:border-zinc-700/70 dark:bg-zinc-900/40 dark:shadow-none">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-xl font-bold tracking-tight text-text-primary dark:text-zinc-100">
          Pipeline
        </h2>
        <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
          <button
            type="button"
            onClick={exportCsv}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-white px-3 py-2 text-sm font-medium text-text-primary shadow-sm hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900 dark:hover:bg-zinc-800"
          >
            <Download className="h-4 w-4 text-violet-600 dark:text-violet-400" />
            Export
          </button>
          <div className="flex flex-col gap-1 sm:items-end">
            <div className="relative">
              <select
                value={
                  selectOptions.some((o) => o.key === rangeKey)
                    ? rangeKey
                    : "this-quarter"
                }
                onChange={(e) => setRangeKey(e.target.value)}
                className="w-full min-w-[10rem] appearance-none rounded-xl border border-border bg-white py-2 pl-3 pr-9 text-sm font-medium text-text-primary shadow-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-400/20 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 sm:w-auto"
                aria-label="Date range"
              >
                {selectOptions.map((o) => (
                  <option key={o.key} value={o.key}>
                    {o.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            </div>
            <span className="hidden text-right text-[11px] text-text-secondary dark:text-zinc-500 sm:block">
              {formatDashboardRangeLabel(range.from, range.to)}
            </span>
          </div>
        </div>
      </div>
      <p className="mt-1 text-xs text-text-secondary dark:text-zinc-500">
        Totals include leads created in the selected period (current vs same period last year). Export uses the same period and your search filter.
      </p>
      <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          title="Total inquiries"
          value={formatCount(metrics.inq)}
          sub="vs last year"
          trend={pctChange(metrics.inq, metrics.inqP)}
          spark={metrics.sparkInq}
          chartId="inq"
          icon={<HelpCircle className="h-4 w-4" strokeWidth={2.25} />}
        />
        <SummaryCard
          title="Total bookings"
          value={formatCount(metrics.book)}
          sub="vs last year"
          trend={pctChange(metrics.book, metrics.bookP)}
          spark={metrics.sparkBook}
          chartId="book"
          icon={<CheckCircle2 className="h-4 w-4" strokeWidth={2.25} />}
        />
        <SummaryCard
          title="Total deliveries"
          value={formatCount(metrics.del)}
          sub="vs last year"
          trend={pctChange(metrics.del, metrics.delP)}
          spark={metrics.sparkDel}
          chartId="del"
          icon={<TrendingUp className="h-4 w-4" strokeWidth={2.25} />}
        />
        <SummaryCard
          title="Conversion ratio"
          value={`${metrics.conv}%`}
          sub="vs last year"
          trend={pctChange(metrics.conv, metrics.convP)}
          spark={metrics.sparkConv}
          chartId="conv"
          sparkVariant="percent"
          icon={<Filter className="h-4 w-4" strokeWidth={2.25} />}
        />
      </div>
      <p className="mt-3 text-[11px] text-text-secondary dark:text-zinc-500">
        Bookings = leads at discovery call scheduled or a later stage. Deliveries = closed won. Conversion = deliveries ÷ inquiries in period.
      </p>
    </div>
  );
}
