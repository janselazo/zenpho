"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  projects as initialProjects,
  projectTeamDisplayName,
  PLAN_COLORS,
  PLAN_LABELS,
  LEAD_PROJECT_TYPE_OPTIONS,
  type PlanStage,
  type MockProject,
} from "@/lib/crm/mock-data";
import {
  ArrowDownUp,
  Calendar,
  CheckCircle2,
  ChevronDown,
  Circle,
  CircleDot,
  Flag,
  Info,
  LayoutGrid,
  List,
  ListFilter,
  MoreVertical,
  RotateCw,
  Search,
} from "lucide-react";
import KanbanBoard, { type KanbanColumn } from "@/components/crm/KanbanBoard";
import CrmPopoverDateField from "@/components/crm/CrmPopoverDateField";
import { useCrmTeamMembers } from "@/lib/crm/use-crm-team-members";
import {
  createProjectId,
  readStoredProjects,
  writeStoredProjects,
} from "@/lib/crm/projects-storage";

type ViewMode = "kanban" | "table";
type SortKey = "title-asc" | "title-desc" | "end-asc" | "end-desc";

const planOrder: PlanStage[] = ["pipeline", "planning", "mvp", "growth"];

/** Column glyphs aligned with board-style status columns (pending → done). */
const planColumnIcon: Record<PlanStage, ReactNode> = {
  pipeline: (
    <Circle
      className="h-4 w-4 shrink-0 text-zinc-400"
      strokeWidth={2}
      aria-hidden
    />
  ),
  planning: (
    <CircleDot
      className="h-4 w-4 shrink-0 text-amber-500"
      strokeWidth={2}
      aria-hidden
    />
  ),
  mvp: (
    <RotateCw
      className="h-4 w-4 shrink-0 text-violet-600 dark:text-violet-400"
      strokeWidth={2}
      aria-hidden
    />
  ),
  growth: (
    <CheckCircle2
      className="h-4 w-4 shrink-0 text-emerald-500"
      strokeWidth={2}
      aria-hidden
    />
  ),
};

function projectRefId(id: string) {
  const tail = id.replace(/\D/g, "").slice(-4) || id.slice(0, 4);
  return `PRJ-${tail}`.toUpperCase();
}

function formatCardDate(value: string) {
  if (!value || value === "TBD") return "TBD";
  const t = Date.parse(value);
  if (Number.isNaN(t)) return value;
  return new Date(t).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function typeTagStyles(projectType: string | undefined) {
  if (!projectType)
    return "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300";
  const t = projectType.toLowerCase();
  if (t.includes("mobile"))
    return "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300";
  if (t.includes("web"))
    return "bg-sky-100 text-sky-800 dark:bg-sky-950/50 dark:text-sky-300";
  if (t.includes("design") || t.includes("brand"))
    return "bg-violet-100 text-violet-800 dark:bg-violet-950/50 dark:text-violet-300";
  if (t.includes("market"))
    return "bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-300";
  return "bg-amber-100 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200";
}

function planTagStyles(plan: PlanStage) {
  const c = PLAN_COLORS[plan];
  return {
    backgroundColor: `${c}18`,
    color: c,
    borderColor: `${c}33`,
  };
}

function priorityFlagColor(plan: PlanStage) {
  switch (plan) {
    case "pipeline":
      return "text-red-500";
    case "planning":
      return "text-amber-500";
    case "mvp":
      return "text-sky-500";
    default:
      return "text-emerald-500";
  }
}

export default function ProjectsPage() {
  const [view, setView] = useState<ViewMode>("kanban");
  const [filterPlan, setFilterPlan] = useState<string>("all");
  const [filterTeam, setFilterTeam] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("title-asc");
  const [projectList, setProjectList] = useState<MockProject[]>(() => [
    ...initialProjects,
  ]);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    const stored = readStoredProjects();
    if (stored.length > 0) setProjectList(stored);
  }, []);

  useEffect(() => {
    const sync = () => {
      const next = readStoredProjects();
      if (next.length > 0) setProjectList(next);
    };
    window.addEventListener("crm-projects-changed", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("crm-projects-changed", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const teamFilterOptions = useMemo(() => {
    const labels = new Set<string>();
    for (const p of projectList) {
      labels.add(projectTeamDisplayName(p));
    }
    return Array.from(labels).sort((a, b) => {
      if (a === "Unassigned") return -1;
      if (b === "Unassigned") return 1;
      return a.localeCompare(b);
    });
  }, [projectList]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return projectList.filter((p) => {
      if (filterPlan !== "all" && p.plan !== filterPlan) return false;
      if (filterTeam !== "all" && projectTeamDisplayName(p) !== filterTeam) {
        return false;
      }
      if (!q) return true;
      const team = projectTeamDisplayName(p).toLowerCase();
      const type = (p.projectType ?? "").toLowerCase();
      return (
        p.title.toLowerCase().includes(q) ||
        team.includes(q) ||
        type.includes(q) ||
        projectRefId(p.id).toLowerCase().includes(q)
      );
    });
  }, [projectList, filterPlan, filterTeam, search]);

  const sortedForBoard = useMemo(() => {
    const arr = [...filtered];
    const endRank = (p: MockProject) => {
      if (!p.expectedEndDate || p.expectedEndDate === "TBD") return Infinity;
      const t = Date.parse(p.expectedEndDate);
      return Number.isNaN(t) ? Infinity : t;
    };
    arr.sort((a, b) => {
      switch (sortKey) {
        case "title-desc":
          return b.title.localeCompare(a.title);
        case "end-asc":
          return endRank(a) - endRank(b);
        case "end-desc":
          return endRank(b) - endRank(a);
        default:
          return a.title.localeCompare(b.title);
      }
    });
    return arr;
  }, [filtered, sortKey]);

  const kanbanColumns: KanbanColumn<MockProject>[] = planOrder.map((plan) => ({
    id: plan,
    label: PLAN_LABELS[plan],
    color: PLAN_COLORS[plan],
    icon: planColumnIcon[plan],
    items: sortedForBoard.filter((p) => p.plan === plan),
  }));

  function handleMove(itemId: string, _from: string, to: string) {
    setProjectList((prev) => {
      const next = prev.map((p) =>
        p.id === itemId ? { ...p, plan: to as PlanStage } : p
      );
      writeStoredProjects(next);
      return next;
    });
  }

  return (
    <div className="p-6 sm:p-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2.5 gap-y-2">
            <h1 className="text-2xl font-bold tracking-tight text-text-primary dark:text-zinc-50">
              Projects
            </h1>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-50 px-2.5 py-0.5 text-xs font-semibold text-sky-800 dark:bg-sky-950/50 dark:text-sky-200">
              <span
                className="h-1.5 w-1.5 shrink-0 rounded-full bg-sky-500"
                aria-hidden
              />
              Active · {filtered.length} in view
            </span>
          </div>
          <p className="mt-2 text-sm text-text-secondary dark:text-zinc-400">
            {view === "kanban"
              ? "Drag cards between columns to update plan stage."
              : "Sort and filter the full project list."}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-white px-3.5 py-2 text-sm font-medium text-text-primary shadow-sm transition-colors hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
            title="Workspace overview"
          >
            <LayoutGrid className="h-4 w-4 text-text-secondary" aria-hidden />
            Overview
          </button>
          <button
            type="button"
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-white text-text-secondary shadow-sm transition-colors hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900 dark:hover:bg-zinc-800"
            aria-label="About this board"
          >
            <Info className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#5b21b6] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_1px_2px_rgba(0,0,0,0.06)] transition-colors hover:bg-[#4c1d95] dark:bg-violet-600 dark:hover:bg-violet-500"
          >
            + Add project
          </button>
        </div>
      </div>

      <div className="mt-8 border-b border-zinc-200/90 dark:border-zinc-700">
        <div className="flex gap-10">
          <ViewTab
            active={view === "table"}
            onClick={() => setView("table")}
          >
            <span className="inline-flex items-center gap-2">
              <List className="h-3.5 w-3.5 opacity-80" aria-hidden />
              List
            </span>
          </ViewTab>
          <ViewTab
            active={view === "kanban"}
            onClick={() => setView("kanban")}
          >
            <span className="inline-flex items-center gap-2">
              <LayoutGrid className="h-3.5 w-3.5 opacity-80" aria-hidden />
              Board
            </span>
          </ViewTab>
        </div>
      </div>

      <div
        className={`mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-3 ${
          view === "kanban" ? "rounded-2xl bg-white/80 p-1 dark:bg-zinc-900/40" : ""
        }`}
      >
        <div className="relative min-w-0 flex-1">
          <Search
            className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400 dark:text-zinc-500"
            aria-hidden
          />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search"
            className="h-11 w-full rounded-xl border border-zinc-200/90 bg-white py-2 pl-10 pr-3 text-sm text-text-primary shadow-[0_1px_2px_rgba(0,0,0,0.04)] outline-none transition-[border-color,box-shadow] placeholder:text-zinc-400 focus:border-violet-300 focus:ring-2 focus:ring-violet-500/12 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-violet-500/50"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:shrink-0">
          <div className="relative">
            <ListFilter
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary"
              aria-hidden
            />
            <select
              value={filterPlan}
              onChange={(e) => setFilterPlan(e.target.value)}
              className="h-11 min-w-[9.5rem] cursor-pointer appearance-none rounded-xl border border-zinc-200/90 bg-white py-2 pl-9 pr-9 text-sm font-semibold text-zinc-800 shadow-[0_1px_2px_rgba(0,0,0,0.04)] outline-none transition-[border-color,box-shadow] focus:border-violet-300 focus:ring-2 focus:ring-violet-500/12 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
              aria-label="Filter by plan"
            >
              <option value="all">All status</option>
              {planOrder.map((p) => (
                <option key={p} value={p}>
                  {PLAN_LABELS[p]}
                </option>
              ))}
            </select>
            <ChevronDown
              className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary/70"
              aria-hidden
            />
          </div>
          <div className="relative">
            <ArrowDownUp
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary"
              aria-hidden
            />
            <select
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value as SortKey)}
              className="h-11 min-w-[10.5rem] cursor-pointer appearance-none rounded-xl border border-zinc-200/90 bg-white py-2 pl-9 pr-9 text-sm font-semibold text-zinc-800 shadow-[0_1px_2px_rgba(0,0,0,0.04)] outline-none transition-[border-color,box-shadow] focus:border-violet-300 focus:ring-2 focus:ring-violet-500/12 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
              aria-label="Sort projects"
            >
              <option value="title-asc">Name A–Z</option>
              <option value="title-desc">Name Z–A</option>
              <option value="end-asc">End date (soonest)</option>
              <option value="end-desc">End date (latest)</option>
            </select>
            <ChevronDown
              className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary/70"
              aria-hidden
            />
          </div>
          <div className="relative min-w-[8.5rem] flex-1 sm:flex-initial">
            <select
              value={filterTeam}
              onChange={(e) => setFilterTeam(e.target.value)}
              className="h-11 w-full cursor-pointer appearance-none rounded-xl border border-zinc-200/90 bg-white px-3 py-2 pr-8 text-sm font-semibold text-zinc-800 shadow-[0_1px_2px_rgba(0,0,0,0.04)] outline-none transition-[border-color,box-shadow] focus:border-violet-300 focus:ring-2 focus:ring-violet-500/12 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
              aria-label="Filter by team"
            >
              <option value="all">All teams</option>
              {teamFilterOptions.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
            <ChevronDown
              className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary/70"
              aria-hidden
            />
          </div>
        </div>
      </div>

      <div className={view === "kanban" ? "mt-7" : "mt-6"}>
        {view === "kanban" ? (
          <KanbanBoard
            columns={kanbanColumns}
            renderCard={(project) => (
              <ProjectCard project={project} hidePlanTag />
            )}
            onAddNew={() => setModalOpen(true)}
            onMove={handleMove}
          />
        ) : (
          <ProjectTable projects={sortedForBoard} />
        )}
      </div>

      {modalOpen && (
        <NewProjectModal
          onClose={() => setModalOpen(false)}
          onAdd={(project) => {
            setProjectList((prev) => {
              const next = [...prev, project];
              writeStoredProjects(next);
              return next;
            });
            setModalOpen(false);
          }}
        />
      )}
    </div>
  );
}

function ProjectCard({
  project,
  hidePlanTag,
}: {
  project: MockProject;
  /** Hide plan pill on kanban — column already encodes stage. */
  hidePlanTag?: boolean;
}) {
  const teamLabel = projectTeamDisplayName(project);
  const initials =
    teamLabel === "Unassigned"
      ? "?"
      : teamLabel
          .split(/\s+/)
          .map((w) => w[0])
          .join("")
          .slice(0, 2)
          .toUpperCase() || "?";

  return (
    <div className="group rounded-xl border border-zinc-200/70 bg-white p-4 shadow-[0_1px_3px_rgba(15,23,42,0.06),0_1px_2px_rgba(15,23,42,0.04)] transition-[box-shadow,transform,border-color] hover:-translate-y-px hover:border-zinc-300/80 hover:shadow-[0_12px_28px_rgba(15,23,42,0.1),0_4px_8px_rgba(15,23,42,0.06)] dark:border-zinc-700/80 dark:bg-zinc-900 dark:hover:border-zinc-600">
      <div className="flex items-start justify-between gap-2">
        <span className="font-mono text-[11px] font-medium tracking-wide text-zinc-400 dark:text-zinc-500">
          {projectRefId(project.id)}
        </span>
        <button
          type="button"
          className="-mr-1 -mt-1 rounded-lg p-1 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600 dark:text-zinc-500 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
          aria-label="Card actions"
          onMouseDown={(e) => e.stopPropagation()}
        >
          <MoreVertical className="h-4 w-4" />
        </button>
      </div>
      <Link
        href={`/projects/${project.id}`}
        className="mt-0.5 block rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/60 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-zinc-900"
      >
        <p className="text-[15px] font-semibold leading-snug tracking-tight text-zinc-900 dark:text-zinc-50">
          {project.title}
        </p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {project.projectType ? (
            <span
              className={`inline-flex rounded-md px-2 py-0.5 text-[11px] font-semibold leading-tight ${typeTagStyles(project.projectType)}`}
            >
              {project.projectType}
            </span>
          ) : null}
          {!hidePlanTag ? (
            <span
              className="inline-flex rounded-md border px-2 py-0.5 text-[11px] font-semibold leading-tight"
              style={planTagStyles(project.plan)}
            >
              {PLAN_LABELS[project.plan]}
            </span>
          ) : null}
          <span className="inline-flex rounded-md bg-zinc-100 px-2 py-0.5 text-[11px] font-semibold leading-tight text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
            {project.sprintCount} sprint{project.sprintCount === 1 ? "" : "s"}
          </span>
        </div>
        <div className="mt-4 flex items-center justify-between gap-3 border-t border-zinc-100 pt-3.5 dark:border-zinc-800">
          <span
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-100 to-violet-200 text-[11px] font-bold text-violet-800 ring-2 ring-white dark:from-violet-900/80 dark:to-violet-800/60 dark:text-violet-200 dark:ring-zinc-900"
            title={teamLabel}
          >
            {initials}
          </span>
          <div className="flex items-center gap-2.5 text-xs text-zinc-500 dark:text-zinc-400">
            <Flag
              className={`h-3.5 w-3.5 shrink-0 ${priorityFlagColor(project.plan)}`}
              fill="currentColor"
              aria-hidden
            />
            <span className="inline-flex items-center gap-1 font-semibold text-zinc-700 dark:text-zinc-300">
              <Calendar className="h-3.5 w-3.5 text-zinc-400 dark:text-zinc-500" aria-hidden />
              {formatCardDate(project.expectedEndDate)}
            </span>
          </div>
        </div>
      </Link>
    </div>
  );
}

function ProjectTable({ projects: items }: { projects: MockProject[] }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-border bg-white shadow-sm">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-border">
            <th className="px-4 py-3 font-semibold text-text-secondary">Project</th>
            <th className="px-4 py-3 font-semibold text-text-secondary">Type</th>
            <th className="px-4 py-3 font-semibold text-text-secondary">Plan</th>
            <th className="px-4 py-3 font-semibold text-text-secondary">Team name</th>
            <th className="px-4 py-3 font-semibold text-text-secondary">End Date</th>
            <th className="px-4 py-3 font-semibold text-text-secondary">Budget</th>
            <th className="px-4 py-3 font-semibold text-text-secondary">Website</th>
            <th className="px-4 py-3 font-semibold text-text-secondary">Sprints</th>
            <th className="px-4 py-3 font-semibold text-text-secondary">Tasks</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {items.map((p) => {
            const teamLabel = projectTeamDisplayName(p);
            return (
              <tr key={p.id} className="hover:bg-surface/50">
                <td className="px-4 py-3">
                  <Link
                    href={`/projects/${p.id}`}
                    className="font-medium text-text-primary hover:text-accent"
                  >
                    {p.title}
                  </Link>
                </td>
                <td className="px-4 py-3 text-text-secondary">
                  {p.projectType ?? "—"}
                </td>
                <td className="px-4 py-3">
                  <span
                    className="inline-block rounded-full px-2.5 py-0.5 text-xs font-medium text-white"
                    style={{ backgroundColor: PLAN_COLORS[p.plan] }}
                  >
                    {PLAN_LABELS[p.plan]}
                  </span>
                </td>
                <td className="px-4 py-3 text-text-secondary">{teamLabel}</td>
                <td className="px-4 py-3 text-text-secondary">{p.expectedEndDate}</td>
                <td className="px-4 py-3 text-text-secondary">
                  {p.budget != null && p.budget > 0
                    ? new Intl.NumberFormat("en-US", {
                        style: "currency",
                        currency: "USD",
                        maximumFractionDigits: 0,
                      }).format(p.budget)
                    : "—"}
                </td>
                <td className="px-4 py-3 text-text-secondary">
                  {p.website ? (
                    <span className="max-w-[10rem] truncate block" title={p.website}>
                      {p.website.replace(/^https?:\/\//i, "")}
                    </span>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="px-4 py-3 text-text-secondary">{p.sprintCount}</td>
                <td className="px-4 py-3 text-text-secondary">{p.taskCount}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function NewProjectModal({
  onClose,
  onAdd,
}: {
  onClose: () => void;
  onAdd: (p: MockProject) => void;
}) {
  const teamMembers = useCrmTeamMembers();
  const [title, setTitle] = useState("");
  const [plan, setPlan] = useState<PlanStage>("pipeline");
  const [teamMemberId, setTeamMemberId] = useState("");
  const [projectType, setProjectType] = useState<string>(
    LEAD_PROJECT_TYPE_OPTIONS[0]
  );
  const [endDate, setEndDate] = useState("");
  const [budget, setBudget] = useState("");
  const [website, setWebsite] = useState("");

  const fieldClass =
    "w-full rounded-xl border border-border bg-white px-3.5 py-2.5 text-sm text-text-primary shadow-sm outline-none transition-[box-shadow,border-color] placeholder:text-text-secondary/45 focus:border-accent focus:ring-2 focus:ring-accent/15";

  const selectClass = `${fieldClass} cursor-pointer appearance-none pr-10`;

  const labelClass =
    "mb-1.5 block text-xs font-semibold uppercase tracking-wide text-text-primary";

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    const budgetRaw = budget.replace(/,/g, "").trim();
    let budgetNum: number | null = null;
    if (budgetRaw !== "") {
      const n = Number(budgetRaw);
      if (!Number.isNaN(n) && n >= 0) budgetNum = n;
    }
    const member = teamMemberId
      ? teamMembers.find((m) => m.id === teamMemberId)
      : undefined;
    const name = member?.name.trim() ?? "";
    onAdd({
      id: createProjectId(),
      title: title.trim(),
      plan,
      teamId: member ? member.teamId : "team-general",
      teamName: name || null,
      projectType,
      color: "#6366f1",
      expectedEndDate: endDate || "TBD",
      budget: budgetNum,
      website: website.trim() || null,
      sprintCount: 0,
      taskCount: 0,
    });
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/45 p-4 backdrop-blur-[2px] sm:items-center"
      onClick={onClose}
      onKeyDown={(e) => e.key === "Escape" && onClose()}
      role="presentation"
      tabIndex={-1}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="new-project-title"
        className="max-h-[min(92vh,44rem)] w-full max-w-lg overflow-y-auto rounded-2xl border border-border bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <form onSubmit={handleSubmit} className="p-6 sm:p-8">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-text-secondary">
            Create
          </p>
          <h2
            id="new-project-title"
            className="mt-1 font-sans text-xl font-bold tracking-tight text-text-primary"
          >
            New project
          </h2>
          <p className="mt-1.5 text-sm leading-relaxed text-text-secondary">
            Name your build, set status and type, then pick a target date or leave
            it open as TBD.
          </p>

          <div className="mt-8 space-y-5">
            <div>
              <label htmlFor="np-title" className={labelClass}>
                Project name
              </label>
              <input
                id="np-title"
                autoFocus
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className={fieldClass}
                placeholder="e.g. Acme Redesign"
              />
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label htmlFor="np-status" className={labelClass}>
                  Status
                </label>
                <div className="relative">
                  <select
                    id="np-status"
                    value={plan}
                    onChange={(e) => setPlan(e.target.value as PlanStage)}
                    className={selectClass}
                  >
                    {planOrder.map((p) => (
                      <option key={p} value={p}>
                        {PLAN_LABELS[p]}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary/55"
                    aria-hidden
                  />
                </div>
              </div>
              <div>
                <label htmlFor="np-team-name" className={labelClass}>
                  Team name
                </label>
                <div className="relative">
                  <select
                    id="np-team-name"
                    value={teamMemberId}
                    onChange={(e) => setTeamMemberId(e.target.value)}
                    className={selectClass}
                    disabled={teamMembers.length === 0}
                  >
                    <option value="">Unassigned</option>
                    {teamMembers.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                        {m.role ? ` · ${m.role}` : ""}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary/55"
                    aria-hidden
                  />
                </div>
              </div>
            </div>

            <div>
              <label htmlFor="np-type" className={labelClass}>
                Project type
              </label>
              <div className="relative">
                <select
                  id="np-type"
                  value={projectType}
                  onChange={(e) => setProjectType(e.target.value)}
                  className={selectClass}
                >
                  {LEAD_PROJECT_TYPE_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary/55"
                  aria-hidden
                />
              </div>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label htmlFor="np-budget" className={labelClass}>
                  Budget (USD)
                </label>
                <input
                  id="np-budget"
                  type="text"
                  inputMode="decimal"
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                  className={fieldClass}
                  placeholder="e.g. 25000"
                />
              </div>
              <div>
                <label htmlFor="np-website" className={labelClass}>
                  Website
                </label>
                <input
                  id="np-website"
                  type="text"
                  inputMode="url"
                  autoComplete="url"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  className={fieldClass}
                  placeholder="https://example.com"
                />
              </div>
            </div>

            <div>
              <label htmlFor="np-end" className={labelClass}>
                Expected end date
              </label>
              <CrmPopoverDateField
                id="np-end"
                value={endDate}
                onChange={setEndDate}
                triggerClassName={`${fieldClass} relative flex min-h-[2.625rem] items-center`}
              />
              <p className="mt-1.5 text-xs text-text-secondary">
                Optional. If you skip this, the project shows as{" "}
                <span className="font-medium text-text-primary">TBD</span>.
              </p>
            </div>
          </div>

          <div className="mt-8 flex flex-col-reverse gap-2 border-t border-border pt-6 sm:flex-row sm:justify-end sm:gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-border bg-white px-5 py-2.5 text-sm font-medium text-text-primary shadow-sm transition-colors hover:bg-surface"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-accent-hover"
            >
              Add project
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ViewTab({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`-mb-px border-b-[3px] pb-3 text-sm font-semibold transition-colors ${
        active
          ? "border-[#5b21b6] text-[#5b21b6] dark:border-violet-400 dark:text-violet-400"
          : "border-transparent text-zinc-500 hover:text-zinc-800 dark:text-zinc-500 dark:hover:text-zinc-300"
      }`}
    >
      {children}
    </button>
  );
}
