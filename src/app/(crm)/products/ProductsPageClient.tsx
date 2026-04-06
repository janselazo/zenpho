"use client";

import { Suspense, useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  projects as initialProjects,
  projectClientDisplayLabel,
  projectTeamDisplayName,
  colorForTeamTagLabel,
  getTeamById,
  PLAN_COLORS,
  PLAN_STAGE_ORDER,
  type MockTeamMember,
  type PlanStage,
  type MockProject,
} from "@/lib/crm/mock-data";
import type { MergedCrmFieldOptions } from "@/lib/crm/field-options";
import { useCrmTeamMembers } from "@/lib/crm/use-crm-team-members";
import {
  listCrmProjectsForAgency,
  createCrmProject,
  updateCrmProject,
  deleteCrmProject,
  updateCrmProjectPlanStage,
} from "@/app/(crm)/actions/projects";
import { crmPayloadFromMock } from "@/lib/crm/map-project-row";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import {
  ArrowDownUp,
  Calendar,
  ChevronDown,
  Circle,
  CircleDot,
  Flag,
  Hammer,
  LayoutGrid,
  Layers,
  List,
  ListFilter,
  Loader2,
  Pencil,
  Rocket,
  Search,
  TestTube2,
  Trash2,
} from "lucide-react";
import KanbanBoard, { type KanbanColumn } from "@/components/crm/KanbanBoard";
import NewProjectModal from "@/components/crm/NewProjectModal";
import { fetchDealPrefillForNewProject } from "@/lib/crm/fetch-deal-prefill-for-new-project";
import type { NewProjectDealPrefill } from "@/lib/crm/new-project-deal-prefill";
import {
  readStoredProjects,
  writeStoredProjects,
  CRM_SUPABASE_PROJECTS_CHANGED_EVENT,
} from "@/lib/crm/projects-storage";

type ViewMode = "kanban" | "table";
type SortKey = "title-asc" | "title-desc" | "end-asc" | "end-desc";

/** Column glyphs for the five default stages; custom stages use a generic icon. */
const BUILTIN_PLAN_ICONS: Record<PlanStage, ReactNode> = {
  backlog: (
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
  building: (
    <Hammer
      className="h-4 w-4 shrink-0 text-sky-600 dark:text-sky-400"
      strokeWidth={2}
      aria-hidden
    />
  ),
  testing: (
    <TestTube2
      className="h-4 w-4 shrink-0 text-violet-600 dark:text-violet-400"
      strokeWidth={2}
      aria-hidden
    />
  ),
  release: (
    <Rocket
      className="h-4 w-4 shrink-0 text-emerald-500"
      strokeWidth={2}
      aria-hidden
    />
  ),
};

function planColumnIconFor(slug: string): ReactNode {
  if ((PLAN_STAGE_ORDER as readonly string[]).includes(slug)) {
    return BUILTIN_PLAN_ICONS[slug as PlanStage];
  }
  return (
    <Layers
      className="h-4 w-4 shrink-0 text-zinc-500 dark:text-zinc-400"
      strokeWidth={2}
      aria-hidden
    />
  );
}

const EXTRA_PLAN_HEX = [
  "#6366f1",
  "#8b5cf6",
  "#ec4899",
  "#f97316",
  "#14b8a6",
  "#0ea5e9",
  "#84cc16",
] as const;

function planHexForSlug(slug: string): string {
  if ((PLAN_STAGE_ORDER as readonly string[]).includes(slug)) {
    return PLAN_COLORS[slug as PlanStage];
  }
  let h = 0;
  for (let i = 0; i < slug.length; i++) {
    h = (h * 31 + slug.charCodeAt(i)) >>> 0;
  }
  return EXTRA_PLAN_HEX[h % EXTRA_PLAN_HEX.length];
}

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
  if (t.includes("website") || t === "mvp dev")
    return "bg-cyan-100 text-cyan-800 dark:bg-cyan-950/50 dark:text-cyan-300";
  if (t.includes("ai") && t.includes("autom"))
    return "bg-violet-100 text-violet-800 dark:bg-violet-950/50 dark:text-violet-300";
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

function planTagStyles(plan: string) {
  const c = planHexForSlug(plan);
  return {
    backgroundColor: `${c}18`,
    color: c,
    borderColor: `${c}33`,
  };
}

function priorityFlagColor(plan: string) {
  switch (plan) {
    case "backlog":
      return "text-zinc-400";
    case "planning":
      return "text-amber-500";
    case "building":
      return "text-sky-500";
    case "testing":
      return "text-violet-500";
    case "release":
      return "text-emerald-500";
    default:
      return "text-zinc-500";
  }
}

function ProjectsPageContent({
  fieldOptions,
}: {
  fieldOptions: MergedCrmFieldOptions;
}) {
  const planOrder =
    Array.isArray(fieldOptions.productPlanStageOrder) &&
    fieldOptions.productPlanStageOrder.length > 0
      ? fieldOptions.productPlanStageOrder
      : [...PLAN_STAGE_ORDER];
  const planLabels = fieldOptions.productPlanLabels;
  const router = useRouter();
  const searchParams = useSearchParams();
  const [view, setView] = useState<ViewMode>("kanban");
  const [filterPlan, setFilterPlan] = useState<string>("all");
  const [filterTeam, setFilterTeam] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("title-asc");
  const [projectList, setProjectList] = useState<MockProject[]>(() => [
    ...initialProjects,
  ]);
  const [modalOpen, setModalOpen] = useState(false);
  const [dealPrefill, setDealPrefill] = useState<NewProjectDealPrefill | null>(
    null
  );
  const [editProject, setEditProject] = useState<MockProject | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [listError, setListError] = useState<string | null>(null);

  const spNew = searchParams.get("new");
  const spDealId = searchParams.get("dealId");

  useEffect(() => {
    if (spNew !== "1" || !spDealId?.trim()) return;
    if (!isSupabaseConfigured()) {
      router.replace("/products");
      return;
    }
    let cancelled = false;
    void (async () => {
      const prefill = await fetchDealPrefillForNewProject(
        spDealId.trim(),
        fieldOptions.leadProjectTypes
      );
      if (cancelled) return;
      if (!prefill) {
        router.replace("/products");
        return;
      }
      setDealPrefill(prefill);
      setModalOpen(true);
      router.replace("/products", { scroll: false });
    })();
    return () => {
      cancelled = true;
    };
  }, [spNew, spDealId, router, fieldOptions.leadProjectTypes]);

  useEffect(() => {
    if (isSupabaseConfigured()) {
      let cancelled = false;
      const loadRemote = () => {
        void listCrmProjectsForAgency().then(({ projects, error }) => {
          if (cancelled) return;
          if (error) {
            setListError(error);
            setProjectList([]);
            return;
          }
          setListError(null);
          setProjectList(projects);
        });
      };
      loadRemote();
      window.addEventListener(CRM_SUPABASE_PROJECTS_CHANGED_EVENT, loadRemote);
      return () => {
        cancelled = true;
        window.removeEventListener(
          CRM_SUPABASE_PROJECTS_CHANGED_EVENT,
          loadRemote
        );
      };
    }

    const stored = readStoredProjects();
    if (stored.length > 0) setProjectList(stored);

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
      if (a === "Member") return -1;
      if (b === "Member") return 1;
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
      const client = projectClientDisplayLabel(p).toLowerCase();
      return (
        p.title.toLowerCase().includes(q) ||
        team.includes(q) ||
        type.includes(q) ||
        client.includes(q) ||
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
    label: planLabels[plan] ?? plan,
    color: planHexForSlug(plan),
    icon: planColumnIconFor(plan),
    items: sortedForBoard.filter((p) => p.plan === plan),
  }));

  async function handleMove(itemId: string, _from: string, to: string) {
    const stage = to;
    if (isSupabaseConfigured()) {
      const res = await updateCrmProjectPlanStage(itemId, stage);
      if ("error" in res) {
        alert(res.error);
        return;
      }
      setProjectList((prev) =>
        prev.map((p) => (p.id === itemId ? { ...p, plan: stage } : p))
      );
      window.dispatchEvent(new Event(CRM_SUPABASE_PROJECTS_CHANGED_EVENT));
      return;
    }
    setProjectList((prev) => {
      const next = prev.map((p) =>
        p.id === itemId ? { ...p, plan: stage } : p
      );
      writeStoredProjects(next);
      return next;
    });
  }

  function openCreateModal() {
    setEditProject(null);
    setDealPrefill(null);
    setModalOpen(true);
  }

  function openEditModal(project: MockProject) {
    setDealPrefill(null);
    setEditProject(project);
    setModalOpen(true);
  }

  async function handleDeleteProject(project: MockProject) {
    const label = project.title.trim() || "this product";
    if (!confirm(`Delete “${label}”? This cannot be undone.`)) return;
    setDeletingId(project.id);
    if (isSupabaseConfigured()) {
      const res = await deleteCrmProject(project.id);
      setDeletingId(null);
      if ("error" in res) {
        alert(res.error);
        return;
      }
      setProjectList((prev) => prev.filter((p) => p.id !== project.id));
      window.dispatchEvent(new Event(CRM_SUPABASE_PROJECTS_CHANGED_EVENT));
      return;
    }
    setProjectList((prev) => {
      const next = prev.filter((p) => p.id !== project.id);
      writeStoredProjects(next);
      return next;
    });
    setDeletingId(null);
  }

  return (
    <div className="p-6 sm:p-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2.5 gap-y-2">
            <h1 className="text-2xl font-bold tracking-tight text-text-primary dark:text-zinc-50">
              Products
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
              ? "Drag cards between columns to update plan stage. Each product is linked to a client."
              : "Sort and filter the full product list. Each product is linked to a client."}
          </p>
          {listError ? (
            <p
              className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/35 dark:text-amber-100"
              role="status"
            >
              {listError}
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-[0_1px_2px_rgba(0,0,0,0.06)] transition-colors hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500"
          >
            + Add product
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
                  {planLabels[p]}
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
              aria-label="Sort products"
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
              <ProjectCard
                project={project}
                planLabels={planLabels}
                hidePlanTag
                onEdit={() => openEditModal(project)}
                onDelete={() => void handleDeleteProject(project)}
                deleteBusy={deletingId === project.id}
              />
            )}
            onAddNew={openCreateModal}
            onMove={handleMove}
          />
        ) : (
          <ProjectTable
            projects={sortedForBoard}
            planLabels={planLabels}
            onEdit={openEditModal}
            onDelete={handleDeleteProject}
            deletingId={deletingId}
          />
        )}
      </div>

      {modalOpen && (
        <NewProjectModal
          dealPrefill={editProject ? null : dealPrefill}
          editProject={editProject}
          leadProjectTypeOptions={fieldOptions.leadProjectTypes}
          planStageOrder={planOrder}
          planLabels={planLabels}
          onClose={() => {
            setModalOpen(false);
            setDealPrefill(null);
            setEditProject(null);
          }}
          onAdd={async (project) => {
            if (isSupabaseConfigured()) {
              const res = await createCrmProject(crmPayloadFromMock(project));
              if ("error" in res) {
                alert(res.error);
                return;
              }
              const { projects, error } = await listCrmProjectsForAgency();
              if (error) {
                alert(error);
                return;
              }
              setProjectList(projects);
              window.dispatchEvent(new Event(CRM_SUPABASE_PROJECTS_CHANGED_EVENT));
            } else {
              setProjectList((prev) => {
                const next = [...prev, project];
                writeStoredProjects(next);
                return next;
              });
            }
            setModalOpen(false);
            setDealPrefill(null);
            setEditProject(null);
          }}
          onUpdate={async (project) => {
            if (isSupabaseConfigured()) {
              const res = await updateCrmProject(
                project.id,
                crmPayloadFromMock(project)
              );
              if ("error" in res) {
                alert(res.error);
                return;
              }
              const { projects, error } = await listCrmProjectsForAgency();
              if (error) {
                alert(error);
                return;
              }
              setProjectList(projects);
              window.dispatchEvent(new Event(CRM_SUPABASE_PROJECTS_CHANGED_EVENT));
            } else {
              setProjectList((prev) => {
                const next = prev.map((p) =>
                  p.id === project.id ? project : p
                );
                writeStoredProjects(next);
                return next;
              });
            }
            setModalOpen(false);
            setDealPrefill(null);
            setEditProject(null);
          }}
        />
      )}
    </div>
  );
}

function ProjectsPageFallback() {
  return (
    <div
      className="flex min-h-[50vh] flex-col items-center justify-center gap-3 p-6 sm:p-8"
      role="status"
      aria-live="polite"
      aria-label="Loading products"
    >
      <Loader2 className="h-8 w-8 animate-spin text-violet-500" aria-hidden />
      <p className="text-sm text-text-secondary dark:text-zinc-400">
        Loading products…
      </p>
    </div>
  );
}

export default function ProductsPageClient({
  fieldOptions,
}: {
  fieldOptions: MergedCrmFieldOptions;
}) {
  return (
    <Suspense fallback={<ProjectsPageFallback />}>
      <ProjectsPageContent fieldOptions={fieldOptions} />
    </Suspense>
  );
}

const cardActionBtnClass =
  "rounded-lg p-1.5 text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-200";

function initialsFromPersonName(name: string): string {
  const n = name.trim();
  if (!n) return "?";
  const parts = n.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    const a = parts[0]?.[0];
    const b = parts[parts.length - 1]?.[0];
    if (a && b) return `${a}${b}`.toUpperCase();
  }
  return n.slice(0, 2).toUpperCase();
}

function projectCardFooterAvatar(
  project: MockProject,
  roster: MockTeamMember[]
): {
  title: string;
  display: string;
  variant: "solid" | "gradient";
  solidBg: string | null;
} {
  const mid = project.pointOfContactMemberId?.trim();
  const member = mid ? roster.find((m) => m.id === mid) : undefined;
  if (member?.name?.trim()) {
    const display = (
      member.avatarFallback?.trim() || initialsFromPersonName(member.name)
    ).slice(0, 2);
    const team = getTeamById(member.teamId);
    const solidBg =
      team?.color ??
      (member.tags[0]
        ? colorForTeamTagLabel(member.tags[0])
        : "#6366f1");
    const title =
      project.pointOfContactName?.trim() || member.name.trim();
    return { title, display, variant: "solid", solidBg };
  }

  const pocName = project.pointOfContactName?.trim();
  if (pocName) {
    return {
      title: pocName,
      display: initialsFromPersonName(pocName),
      variant: "solid",
      solidBg: "#6366f1",
    };
  }

  const teamLabel = projectTeamDisplayName(project);
  const display =
    teamLabel === "Member"
      ? "?"
      : teamLabel
          .split(/\s+/)
          .map((w) => w[0])
          .join("")
          .slice(0, 2)
          .toUpperCase() || "?";
  return {
    title: teamLabel,
    display,
    variant: "gradient",
    solidBg: null,
  };
}

function ProjectCard({
  project,
  planLabels,
  hidePlanTag,
  onEdit,
  onDelete,
  deleteBusy,
}: {
  project: MockProject;
  planLabels: Record<string, string>;
  /** Hide plan pill on kanban — column already encodes stage. */
  hidePlanTag?: boolean;
  onEdit: () => void;
  onDelete: () => void;
  deleteBusy?: boolean;
}) {
  const roster = useCrmTeamMembers();
  const avatar = useMemo(
    () => projectCardFooterAvatar(project, roster),
    [project, roster]
  );

  return (
    <div className="group rounded-xl border border-zinc-200/70 bg-white p-4 shadow-[0_1px_3px_rgba(15,23,42,0.06),0_1px_2px_rgba(15,23,42,0.04)] transition-[box-shadow,transform,border-color] hover:-translate-y-px hover:border-zinc-300/80 hover:shadow-[0_12px_28px_rgba(15,23,42,0.1),0_4px_8px_rgba(15,23,42,0.06)] dark:border-zinc-700/80 dark:bg-zinc-900 dark:hover:border-zinc-600">
      <div className="flex items-start justify-between gap-2">
        <span className="font-mono text-[11px] font-medium tracking-wide text-zinc-400 dark:text-zinc-500">
          {projectRefId(project.id)}
        </span>
        <div
          className="-mr-1 -mt-1 flex shrink-0 items-center gap-0.5"
          onMouseDown={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            className={cardActionBtnClass}
            aria-label={`Edit ${project.title}`}
            title="Edit"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onEdit();
            }}
          >
            <Pencil className="h-4 w-4" aria-hidden />
          </button>
          <button
            type="button"
            className={`${cardActionBtnClass} hover:text-red-600 dark:hover:text-red-400`}
            aria-label={`Delete ${project.title}`}
            title="Delete"
            disabled={deleteBusy}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              void onDelete();
            }}
          >
            {deleteBusy ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <Trash2 className="h-4 w-4" aria-hidden />
            )}
          </button>
        </div>
      </div>
      <Link
        href={
          project.primaryPhaseId
            ? `/products/${project.id}?project=${project.primaryPhaseId}&tab=projects`
            : `/products/${project.id}`
        }
        className="mt-0.5 block rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/60 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-zinc-900"
      >
        <p className="text-[15px] font-semibold leading-snug tracking-tight text-zinc-900 dark:text-zinc-50">
          {project.title}
        </p>
        <p className="mt-1 text-xs font-medium text-zinc-500 dark:text-zinc-400">
          {projectClientDisplayLabel(project)}
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
              {planLabels[project.plan] ?? project.plan}
            </span>
          ) : null}
          <span className="inline-flex rounded-md bg-zinc-100 px-2 py-0.5 text-[11px] font-semibold leading-tight text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
            {project.sprintCount} sprint{project.sprintCount === 1 ? "" : "s"}
          </span>
        </div>
        <div className="mt-4 flex items-center justify-between gap-3 border-t border-zinc-100 pt-3.5 dark:border-zinc-800">
          <span
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ring-2 ring-white dark:ring-zinc-900 ${
              avatar.variant === "solid"
                ? "text-white"
                : "bg-gradient-to-br from-violet-100 to-violet-200 text-violet-800 dark:from-violet-900/80 dark:to-violet-800/60 dark:text-violet-200"
            }`}
            style={
              avatar.variant === "solid" && avatar.solidBg
                ? { backgroundColor: avatar.solidBg }
                : undefined
            }
            title={avatar.title}
          >
            {avatar.display}
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

function ProjectTable({
  projects: items,
  planLabels,
  onEdit,
  onDelete,
  deletingId,
}: {
  projects: MockProject[];
  planLabels: Record<string, string>;
  onEdit: (p: MockProject) => void;
  onDelete: (p: MockProject) => void;
  deletingId: string | null;
}) {
  const iconBtn =
    "inline-flex items-center justify-center rounded-md p-1.5 text-zinc-600 transition-colors hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-40 dark:text-zinc-400 dark:hover:bg-zinc-800";

  return (
    <div className="overflow-x-auto rounded-2xl border border-border bg-white shadow-sm dark:border-zinc-700 dark:bg-zinc-950">
      <table className="w-full min-w-[64rem] text-left text-sm">
        <thead>
          <tr className="border-b border-border dark:border-zinc-700">
            <th className="px-4 py-3 font-semibold text-text-secondary">Product</th>
            <th className="px-4 py-3 font-semibold text-text-secondary">Client</th>
            <th className="px-4 py-3 font-semibold text-text-secondary">Type</th>
            <th className="px-4 py-3 font-semibold text-text-secondary">Plan</th>
            <th className="px-4 py-3 font-semibold text-text-secondary">Team name</th>
            <th className="px-4 py-3 font-semibold text-text-secondary">End Date</th>
            <th className="px-4 py-3 font-semibold text-text-secondary">Budget</th>
            <th className="px-4 py-3 font-semibold text-text-secondary">Website</th>
            <th className="px-4 py-3 font-semibold text-text-secondary">Sprints</th>
            <th className="px-4 py-3 font-semibold text-text-secondary">Tasks</th>
            <th className="px-4 py-3 font-semibold text-text-secondary">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border dark:divide-zinc-700">
          {items.map((p) => {
            const teamLabel = projectTeamDisplayName(p);
            return (
              <tr key={p.id} className="hover:bg-surface/50 dark:hover:bg-zinc-900/40">
                <td className="px-4 py-3">
                  <Link
                    href={
                      p.primaryPhaseId
                        ? `/products/${p.id}?project=${p.primaryPhaseId}&tab=projects`
                        : `/products/${p.id}`
                    }
                    className="font-medium text-text-primary hover:text-accent"
                  >
                    {p.title}
                  </Link>
                </td>
                <td className="px-4 py-3 text-text-secondary">
                  {projectClientDisplayLabel(p)}
                </td>
                <td className="px-4 py-3 text-text-secondary">
                  {p.projectType ?? "—"}
                </td>
                <td className="px-4 py-3">
                  <span
                    className="inline-block rounded-full px-2.5 py-0.5 text-xs font-medium text-white"
                    style={{ backgroundColor: planHexForSlug(p.plan) }}
                  >
                    {planLabels[p.plan] ?? p.plan}
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
                <td className="px-4 py-3">
                  <div className="flex flex-wrap items-center gap-1">
                    <button
                      type="button"
                      className={iconBtn}
                      aria-label={`Edit ${p.title}`}
                      title="Edit"
                      onClick={() => onEdit(p)}
                    >
                      <Pencil className="h-4 w-4 shrink-0" aria-hidden />
                    </button>
                    <button
                      type="button"
                      className={`${iconBtn} text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40`}
                      aria-label={`Delete ${p.title}`}
                      title="Delete"
                      disabled={deletingId === p.id}
                      aria-busy={deletingId === p.id}
                      onClick={() => void onDelete(p)}
                    >
                      {deletingId === p.id ? (
                        <Loader2
                          className="h-4 w-4 shrink-0 animate-spin"
                          aria-hidden
                        />
                      ) : (
                        <Trash2 className="h-4 w-4 shrink-0" aria-hidden />
                      )}
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
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
