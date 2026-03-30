"use client";

import { useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  projects,
  teamMembers,
  tasks,
  leads,
  deals,
  PLAN_LABELS,
  PLAN_COLORS,
  PLAN_STAGE_ORDER,
  DEAL_STAGE_LABELS,
  DEAL_STAGE_COLORS,
  LEAD_STAGE_LABELS,
  LEAD_PIPELINE_STAGES,
  LEAD_PIPELINE_COLUMN_COLORS,
  parseLeadPipelineStage,
  type PlanStage,
  type DealStage,
  type TaskStatus,
  TASK_STATUS_LABELS,
  TASK_STATUS_COLORS,
} from "@/lib/crm/mock-data";

type Tab = "revenue" | "team" | "sales";

const CURRENCY = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

function fmt(n: number) {
  return CURRENCY.format(n);
}

// ── Derived data ────────────────────────────────────────────────────────────

function buildMonthlyRevenue() {
  const months = [
    "Oct", "Nov", "Dec", "Jan", "Feb", "Mar",
  ];
  const values = [14200, 24000, 8500, 31000, 42500, 38000];
  const expenses = [6200, 9800, 5100, 12000, 15500, 11000];
  return months.map((m, i) => ({
    month: m,
    revenue: values[i],
    expenses: expenses[i],
    profit: values[i] - expenses[i],
  }));
}

function buildDealStageDistribution() {
  const stages: DealStage[] = [
    "prospect", "proposal", "negotiation", "closed_won", "closed_lost",
  ];
  return stages.map((s) => {
    const matching = deals.filter((d) => d.stage === s);
    return {
      name: DEAL_STAGE_LABELS[s],
      value: matching.reduce((sum, d) => sum + d.value, 0),
      count: matching.length,
      color: DEAL_STAGE_COLORS[s],
    };
  }).filter((s) => s.count > 0);
}

function buildLeadFunnel() {
  return LEAD_PIPELINE_STAGES.map((s) => ({
    stage: LEAD_STAGE_LABELS[s],
    count: leads.filter((l) => parseLeadPipelineStage(l.stage) === s).length,
    color: LEAD_PIPELINE_COLUMN_COLORS[s],
  }));
}

function buildTeamUtilization() {
  return teamMembers.map((m) => ({
    name: m.name.split(" ")[0],
    utilization: m.utilization,
    projects: m.activeProjects,
  }));
}

function buildTaskBreakdown() {
  const statuses: TaskStatus[] = [
    "completed", "in_progress", "action_started", "test_qa", "not_started",
  ];
  return statuses.map((s) => ({
    name: TASK_STATUS_LABELS[s],
    value: tasks.filter((t) => t.status === s).length,
    color: TASK_STATUS_COLORS[s],
  })).filter((s) => s.value > 0);
}

function buildProjectsByStage() {
  const stages: PlanStage[] = [...PLAN_STAGE_ORDER];
  return stages.map((s) => ({
    stage: PLAN_LABELS[s],
    count: projects.filter((p) => p.plan === s).length,
    color: PLAN_COLORS[s],
  }));
}

function buildLeadSourceBreakdown() {
  const sources = new Map<string, number>();
  leads.forEach((l) => {
    const src = l.source || "Unknown";
    sources.set(src, (sources.get(src) ?? 0) + 1);
  });
  const colors = ["#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ef4444", "#6b7280"];
  return Array.from(sources.entries()).map(([name, value], i) => ({
    name,
    value,
    color: colors[i % colors.length],
  }));
}

// ── Component ───────────────────────────────────────────────────────────────

export default function ReportsView() {
  const [activeTab, setActiveTab] = useState<Tab>("revenue");

  const totalDealValue = deals.reduce((s, d) => s + d.value, 0);
  const wonValue = deals.filter((d) => d.stage === "closed_won").reduce((s, d) => s + d.value, 0);
  const openPipeline = deals.filter((d) => !["closed_won", "closed_lost"].includes(d.stage)).reduce((s, d) => s + d.value, 0);
  const avgUtil =
    teamMembers.length === 0
      ? 0
      : Math.round(
          teamMembers.reduce((s, m) => s + m.utilization, 0) / teamMembers.length
        );
  const completedTasks = tasks.filter((t) => t.status === "completed").length;
  const leadProgressedStages = new Set([
    "discoverycall_completed",
    "proposal_sent",
    "negotiation",
    "closed_won",
  ]);
  const winRate =
    leads.length > 0
      ? Math.round(
          (leads.filter((l) => leadProgressedStages.has(l.stage)).length /
            leads.length) *
            100
        )
      : 0;

  const tabs: { id: Tab; label: string }[] = [
    { id: "revenue", label: "Revenue" },
    { id: "team", label: "Team" },
    { id: "sales", label: "Sales" },
  ];

  return (
    <div>
      {/* Header */}
      <div>
        <h1 className="heading-display text-2xl font-bold text-text-primary">
          Reports
        </h1>
        <p className="mt-1 text-sm text-text-secondary">
          Revenue, team performance, and sales analytics
        </p>
      </div>

      {/* KPIs */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Total Pipeline" value={fmt(totalDealValue)} />
        <KpiCard label="Won Revenue" value={fmt(wonValue)} accent />
        <KpiCard label="Open Pipeline" value={fmt(openPipeline)} />
        <KpiCard label="Qualification Rate" value={`${winRate}%`} />
      </div>

      {/* Tab bar */}
      <div className="mt-8 flex items-center gap-4 border-b border-border">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setActiveTab(t.id)}
            className={`pb-2.5 text-sm font-medium transition-colors ${
              activeTab === t.id
                ? "border-b-2 border-accent text-accent"
                : "text-text-secondary hover:text-text-primary"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="mt-6">
        {activeTab === "revenue" && <RevenueTab />}
        {activeTab === "team" && <TeamTab avgUtil={avgUtil} completedTasks={completedTasks} />}
        {activeTab === "sales" && <SalesTab />}
      </div>
    </div>
  );
}

// ── Revenue Tab ─────────────────────────────────────────────────────────────

function RevenueTab() {
  const monthly = buildMonthlyRevenue();
  const dealDist = buildDealStageDistribution();

  return (
    <div className="space-y-6">
      {/* Monthly Revenue & Expenses */}
      <ChartCard title="Monthly Revenue & Expenses">
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthly} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e8ecf1" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#5c6370" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#5c6370" }} axisLine={false} tickLine={false} tickFormatter={(v) => v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v}`} />
              <Tooltip formatter={(value) => fmt(Number(value))} contentStyle={{ borderRadius: 12, border: "1px solid #e8ecf1", fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="revenue" name="Revenue" fill="#2563eb" radius={[4, 4, 0, 0]} maxBarSize={28} />
              <Bar dataKey="expenses" name="Expenses" fill="#94a3b8" radius={[4, 4, 0, 0]} maxBarSize={28} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      {/* Profit Trend */}
      <ChartCard title="Profit Trend">
        <div className="h-[260px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={monthly} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e8ecf1" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#5c6370" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#5c6370" }} axisLine={false} tickLine={false} tickFormatter={(v) => v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v}`} />
              <Tooltip formatter={(value) => fmt(Number(value))} contentStyle={{ borderRadius: 12, border: "1px solid #e8ecf1", fontSize: 12 }} />
              <Line type="monotone" dataKey="profit" name="Profit" stroke="#10b981" strokeWidth={2} dot={{ r: 4, fill: "#10b981" }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      {/* Deal Value by Stage */}
      <ChartCard title="Deal Value by Stage">
        <div className="flex flex-col items-center gap-6 sm:flex-row">
          <div className="h-[240px] w-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={dealDist} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={55} outerRadius={95} paddingAngle={3}>
                  {dealDist.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => fmt(Number(value))} contentStyle={{ borderRadius: 12, border: "1px solid #e8ecf1", fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-2">
            {dealDist.map((d) => (
              <div key={d.name} className="flex items-center gap-2.5 text-sm">
                <span className="h-3 w-3 rounded-full" style={{ backgroundColor: d.color }} />
                <span className="text-text-primary">{d.name}</span>
                <span className="ml-auto font-medium text-text-primary">{fmt(d.value)}</span>
                <span className="text-text-secondary">({d.count})</span>
              </div>
            ))}
          </div>
        </div>
      </ChartCard>
    </div>
  );
}

// ── Team Tab ────────────────────────────────────────────────────────────────

function TeamTab({ avgUtil, completedTasks }: { avgUtil: number; completedTasks: number }) {
  const utilData = buildTeamUtilization();
  const taskData = buildTaskBreakdown();
  const projectStages = buildProjectsByStage();
  const overloaded = teamMembers.filter((m) => m.utilization > 100).length;

  return (
    <div className="space-y-6">
      {/* Summary row */}
      <div className="grid gap-4 sm:grid-cols-3">
        <MiniKpi label="Avg Utilization" value={`${avgUtil}%`} />
        <MiniKpi label="Completed Tasks" value={String(completedTasks)} />
        <MiniKpi label="Overallocated" value={String(overloaded)} warn={overloaded > 0} />
      </div>

      {/* Team Utilization */}
      <ChartCard title="Team Utilization">
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={utilData} layout="vertical" margin={{ top: 0, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e8ecf1" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11, fill: "#5c6370" }} axisLine={false} tickLine={false} domain={[0, 220]} tickFormatter={(v) => `${v}%`} />
              <YAxis dataKey="name" type="category" tick={{ fontSize: 12, fill: "#1a1a2e" }} axisLine={false} tickLine={false} width={70} />
              <Tooltip formatter={(v) => `${v}%`} contentStyle={{ borderRadius: 12, border: "1px solid #e8ecf1", fontSize: 12 }} />
              <Bar dataKey="utilization" name="Utilization" radius={[0, 4, 4, 0]} maxBarSize={20}>
                {utilData.map((entry) => (
                  <Cell
                    key={entry.name}
                    fill={entry.utilization > 100 ? "#ef4444" : entry.utilization > 80 ? "#f59e0b" : "#10b981"}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Task Breakdown */}
        <ChartCard title="Task Status Breakdown">
          <div className="flex flex-col items-center gap-6 sm:flex-row">
            <div className="h-[200px] w-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={taskData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={45} outerRadius={80} paddingAngle={3}>
                    {taskData.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e8ecf1", fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-2">
              {taskData.map((d) => (
                <div key={d.name} className="flex items-center gap-2.5 text-sm">
                  <span className="h-3 w-3 rounded-full" style={{ backgroundColor: d.color }} />
                  <span className="text-text-primary">{d.name}</span>
                  <span className="ml-auto font-semibold text-text-primary">{d.value}</span>
                </div>
              ))}
            </div>
          </div>
        </ChartCard>

        {/* Projects by Stage */}
        <ChartCard title="Projects by Stage">
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={projectStages} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e8ecf1" vertical={false} />
                <XAxis dataKey="stage" tick={{ fontSize: 11, fill: "#5c6370" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#5c6370" }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e8ecf1", fontSize: 12 }} />
                <Bar dataKey="count" name="Projects" radius={[4, 4, 0, 0]} maxBarSize={36}>
                  {projectStages.map((entry) => (
                    <Cell key={entry.stage} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>
    </div>
  );
}

// ── Sales Tab ───────────────────────────────────────────────────────────────

function SalesTab() {
  const funnel = buildLeadFunnel();
  const sourceData = buildLeadSourceBreakdown();
  const maxFunnel = Math.max(...funnel.map((f) => f.count), 1);

  const leadProgressedStages = new Set([
    "discoverycall_completed",
    "proposal_sent",
    "negotiation",
    "closed_won",
  ]);
  const conversionRate =
    leads.length > 0
      ? (
          (leads.filter((l) => leadProgressedStages.has(l.stage)).length /
            leads.length) *
          100
        ).toFixed(1)
      : "0";
  const avgDealSize = deals.length > 0
    ? fmt(Math.round(deals.reduce((s, d) => s + d.value, 0) / deals.length))
    : "$0";
  const openDeals = deals.filter((d) => !["closed_won", "closed_lost"].includes(d.stage)).length;

  return (
    <div className="space-y-6">
      {/* Summary row */}
      <div className="grid gap-4 sm:grid-cols-3">
        <MiniKpi label="Conversion Rate" value={`${conversionRate}%`} />
        <MiniKpi label="Avg Deal Size" value={avgDealSize} />
        <MiniKpi label="Open Deals" value={String(openDeals)} />
      </div>

      {/* Opportunities funnel */}
      <ChartCard title="Opportunities funnel">
        <div className="space-y-3">
          {funnel.map((stage) => (
            <div key={stage.stage} className="flex items-center gap-3">
              <span className="w-20 text-right text-sm text-text-secondary">{stage.stage}</span>
              <div className="relative flex-1">
                <div className="h-7 rounded-full bg-surface" />
                <div
                  className="absolute inset-y-0 left-0 rounded-full transition-all"
                  style={{
                    width: `${Math.max((stage.count / maxFunnel) * 100, 4)}%`,
                    backgroundColor: stage.color,
                  }}
                />
                <span className="absolute inset-y-0 left-3 flex items-center text-xs font-semibold text-white">
                  {stage.count}
                </span>
              </div>
            </div>
          ))}
        </div>
      </ChartCard>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Opportunity sources */}
        <ChartCard title="Opportunity sources">
          <div className="flex flex-col items-center gap-6 sm:flex-row">
            <div className="h-[200px] w-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={sourceData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={45} outerRadius={80} paddingAngle={3}>
                    {sourceData.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e8ecf1", fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-2">
              {sourceData.map((d) => (
                <div key={d.name} className="flex items-center gap-2.5 text-sm">
                  <span className="h-3 w-3 rounded-full" style={{ backgroundColor: d.color }} />
                  <span className="text-text-primary">{d.name}</span>
                  <span className="ml-auto font-semibold text-text-primary">{d.value}</span>
                </div>
              ))}
            </div>
          </div>
        </ChartCard>

        {/* Deal Stage Pipeline */}
        <ChartCard title="Deals by Stage">
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={buildDealStageDistribution()}
                margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e8ecf1" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#5c6370" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#5c6370" }} axisLine={false} tickLine={false} tickFormatter={(v) => v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v}`} />
                <Tooltip formatter={(value) => fmt(Number(value))} contentStyle={{ borderRadius: 12, border: "1px solid #e8ecf1", fontSize: 12 }} />
                <Bar dataKey="value" name="Value" radius={[4, 4, 0, 0]} maxBarSize={36}>
                  {buildDealStageDistribution().map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>
    </div>
  );
}

// ── Shared components ───────────────────────────────────────────────────────

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-white p-6 shadow-sm">
      <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-text-secondary">
        {title}
      </h2>
      {children}
    </div>
  );
}

function KpiCard({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div
      className={`rounded-2xl border border-border bg-white p-5 shadow-sm ${
        accent ? "ring-1 ring-accent/20" : ""
      }`}
    >
      <p className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
        {label}
      </p>
      <p className={`mt-2 text-2xl font-bold tracking-tight ${accent ? "text-accent" : "text-text-primary"}`}>
        {value}
      </p>
    </div>
  );
}

function MiniKpi({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <div className="rounded-xl border border-border bg-white px-4 py-3 shadow-sm">
      <p className="text-xs font-medium text-text-secondary">{label}</p>
      <p className={`mt-1 text-lg font-bold ${warn ? "text-red-600" : "text-text-primary"}`}>
        {value}
      </p>
    </div>
  );
}
