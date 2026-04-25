"use client";

import {
  useState,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useCallback,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";
import {
  DndContext,
  DragOverlay,
  type DraggableAttributes,
  type DraggableSyntheticListeners,
  type DragEndEvent,
  type DragStartEvent,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Phone,
  PenLine,
  Megaphone,
  Handshake,
  Gift,
  Search,
  Clock,
  Circle,
  CheckCircle2,
  Mail,
  MessageSquare,
  Calendar,
  CalendarCheck,
  MoreHorizontal,
  Flame,
  Plus,
  Minus,
  Target,
  DollarSign,
  Pencil,
  Trash2,
  BookOpen,
  CalendarDays,
  ListTodo,
  UsersRound,
  GripVertical,
  Briefcase,
  Video,
  TrendingUp,
  Sparkles,
  Star,
} from "lucide-react";
import IconTabBar from "@/components/crm/prospecting/IconTabBar";
import {
  playbookCategories,
  standardMonthlyGoals,
  prospectingTasks,
  PROSPECTING_TASK_TYPE_LABELS,
  type PlaybookCategory,
  type PlaybookActivity,
  type MonthlyGoal,
  type ProspectingTask,
  type ProspectingTaskType,
  type ProspectingTaskStatus,
} from "@/lib/crm/mock-data";
import {
  fetchMonthlyClientsWonCount,
  fetchMonthlyRevenueFromWonClientProjects,
} from "@/lib/crm/monthly-goals-metrics";
import {
  loadMonthlyGoalTargets,
  monthKeyFromDate,
  saveMonthlyGoalTargets,
} from "@/lib/crm/monthly-goals-targets";
import {
  loadNorthStarGoalIds,
  pruneNorthStarGoalIds,
  saveNorthStarGoalIds,
} from "@/lib/crm/monthly-goals-store";
import {
  getCompletions,
  saveCompletions,
  loadPlaybookCategories,
  loadPlaybookPriorityActivityIds,
  loadPlaybookSectionCollapsed,
  prunePriorityActivityIds,
  savePlaybookCategories,
  savePlaybookPriorityActivityIds,
  savePlaybookSectionCollapsed,
} from "@/lib/crm/playbook-store";
import {
  fetchUserProspectingPlaybook,
  upsertUserProspectingPlaybook,
} from "@/lib/crm/playbook-remote";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";

// ── Shared helpers ──────────────────────────────────────────────────────────

const PLAYBOOK_CATEGORY_ICON_KEYS = [
  "phone",
  "pen-line",
  "megaphone",
  "handshake",
  "gift",
  "search",
  "book-open",
  "briefcase",
  "users",
  "calendar",
  "mail",
  "video",
  "trending-up",
  "sparkles",
  "target",
  "flame",
  "star",
] as const;

/** Preset tile colors for playbook section icons (stored on `PlaybookCategory.color`). */
const PLAYBOOK_SECTION_COLORS = [
  "#6366f1",
  "#2563eb",
  "#0ea5e9",
  "#059669",
  "#ca8a04",
  "#ea580c",
  "#dc2626",
  "#7c3aed",
  "#db2777",
  "#64748b",
  "#f59e0b",
  "#14b8a6",
] as const;

function playbookColorsMatch(a: string, b: string) {
  return a.replace(/\s/g, "").toLowerCase() === b.replace(/\s/g, "").toLowerCase();
}

function renderPlaybookCategoryIcon(key: string): React.ReactNode {
  const cls = "h-4 w-4";
  switch (key) {
    case "phone":
      return <Phone className={cls} />;
    case "pen-line":
      return <PenLine className={cls} />;
    case "megaphone":
      return <Megaphone className={cls} />;
    case "handshake":
      return <Handshake className={cls} />;
    case "gift":
      return <Gift className={cls} />;
    case "search":
      return <Search className={cls} />;
    case "book-open":
      return <BookOpen className={cls} />;
    case "briefcase":
      return <Briefcase className={cls} />;
    case "users":
      return <UsersRound className={cls} />;
    case "calendar":
      return <Calendar className={cls} />;
    case "mail":
      return <Mail className={cls} />;
    case "video":
      return <Video className={cls} />;
    case "trending-up":
      return <TrendingUp className={cls} />;
    case "sparkles":
      return <Sparkles className={cls} />;
    case "target":
      return <Target className={cls} />;
    case "flame":
      return <Flame className={cls} />;
    case "star":
      return <Star className={cls} />;
    default:
      return null;
  }
}

/** Stable id for collapse state / aria; not stored in categories JSON. */
const PLAYBOOK_PRIORITIES_SECTION_ID = "__playbook_priorities__";

function findActivityById(
  categories: PlaybookCategory[],
  activityId: string
): PlaybookActivity | null {
  for (const c of categories) {
    const a = c.activities.find((x) => x.id === activityId);
    if (a) return a;
  }
  return null;
}

function activityOwnerCategoryId(
  categories: PlaybookCategory[],
  activityId: string
): string | undefined {
  for (const c of categories) {
    if (c.activities.some((a) => a.id === activityId)) return c.id;
  }
  return undefined;
}

const TASK_TYPE_ICONS: Record<ProspectingTaskType, React.ReactNode> = {
  follow_up: <Clock className="h-4 w-4" />,
  call: <Phone className="h-4 w-4" />,
  email: <Mail className="h-4 w-4" />,
  text: <MessageSquare className="h-4 w-4" />,
  appointment: <CalendarCheck className="h-4 w-4" />,
  other: <MoreHorizontal className="h-4 w-4" />,
};

function formatDate(date: Date) {
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function formatShortDate(date: Date) {
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

function formatCurrency(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

function daysBetween(a: string, b: Date) {
  const d = new Date(a);
  d.setHours(0, 0, 0, 0);
  const bNorm = new Date(b);
  bNorm.setHours(0, 0, 0, 0);
  return Math.floor((bNorm.getTime() - d.getTime()) / 86_400_000);
}

// ── DateNavigator ───────────────────────────────────────────────────────────

function DateNavigator({
  date,
  onChange,
}: {
  date: Date;
  onChange: (d: Date) => void;
}) {
  function shift(days: number) {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    onChange(d);
  }

  return (
    <div className="flex items-center justify-center gap-4 rounded-xl border border-border bg-white px-4 py-2.5 dark:border-zinc-800/80 dark:bg-zinc-900/50">
      <button
        type="button"
        onClick={() => shift(-1)}
        className="rounded-lg p-1 text-text-secondary hover:bg-surface hover:text-text-primary dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
      <span className="text-sm font-medium text-text-primary dark:text-zinc-100">
        {formatDate(date)}
      </span>
      <button
        type="button"
        onClick={() => shift(1)}
        className="rounded-lg p-1 text-text-secondary hover:bg-surface hover:text-text-primary dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}

// ── Main Component ──────────────────────────────────────────────────────────

type ActiveTab = "playbook" | "goals" | "agenda" | "tasks";

const TABS = [
  { id: "playbook", label: "Playbook", icon: BookOpen },
  { id: "goals", label: "Goals", icon: Target },
  { id: "agenda", label: "Agenda", icon: CalendarDays },
  { id: "tasks", label: "Tasks", icon: ListTodo },
];

const DEFAULT_MONTHLY_TARGETS = {
  clients: standardMonthlyGoals[0].target,
  revenue: standardMonthlyGoals[1].target,
};

export default function ColdOutreachView() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("playbook");
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [goals, setGoals] = useState<MonthlyGoal[]>(() => [
    ...standardMonthlyGoals,
  ]);
  const [northStarGoalIds, setNorthStarGoalIds] = useState<string[]>([]);
  const [clientsActual, setClientsActual] = useState(0);
  const [revenueActual, setRevenueActual] = useState(0);

  useEffect(() => {
    const ym = monthKeyFromDate(new Date());
    const t = loadMonthlyGoalTargets(ym, DEFAULT_MONTHLY_TARGETS);
    setGoals([
      { ...standardMonthlyGoals[0], target: t.clients },
      { ...standardMonthlyGoals[1], target: t.revenue },
    ]);
    setNorthStarGoalIds(loadNorthStarGoalIds());
  }, []);

  useEffect(() => {
    setNorthStarGoalIds((prev) => {
      const next = pruneNorthStarGoalIds(
        prev,
        goals.map((goal) => goal.id)
      );
      if (next.length !== prev.length) saveNorthStarGoalIds(next);
      return next;
    });
  }, [goals]);

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setClientsActual(0);
      setRevenueActual(0);
      return;
    }
    let cancelled = false;
    const supabase = createClient();
    void (async () => {
      const [c, r] = await Promise.all([
        fetchMonthlyClientsWonCount(supabase),
        fetchMonthlyRevenueFromWonClientProjects(supabase),
      ]);
      if (!cancelled) {
        setClientsActual(c);
        setRevenueActual(r);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const goalsWithActuals = useMemo(
    () =>
      goals.map((g) => {
        if (g.id === "mg-clients") return { ...g, current: clientsActual };
        if (g.id === "mg-revenue") return { ...g, current: revenueActual };
        return g;
      }),
    [goals, clientsActual, revenueActual]
  );

  function handleGoalsChange(next: MonthlyGoal[]) {
    setGoals(next);
    const ym = monthKeyFromDate(new Date());
    const clientsT =
      next.find((x) => x.id === "mg-clients")?.target ??
      DEFAULT_MONTHLY_TARGETS.clients;
    const revenueT =
      next.find((x) => x.id === "mg-revenue")?.target ??
      DEFAULT_MONTHLY_TARGETS.revenue;
    saveMonthlyGoalTargets(ym, { clients: clientsT, revenue: revenueT });
  }

  function toggleNorthStarGoal(goalId: string) {
    setNorthStarGoalIds((prev) => {
      const next = prev.includes(goalId)
        ? prev.filter((id) => id !== goalId)
        : [...prev, goalId];
      saveNorthStarGoalIds(next);
      return next;
    });
  }

  return (
    <div>
      <div>
        <h1 className="heading-display text-2xl font-bold text-text-primary dark:text-zinc-100">
          Playbook
        </h1>
        <p className="mt-1 text-sm text-text-secondary dark:text-zinc-400">
          Complete your income-producing activities every day to generate more
          opportunities, appointments, and deals
        </p>
      </div>

      {/* Date navigator */}
      <div className="mt-6">
        <DateNavigator date={currentDate} onChange={setCurrentDate} />
      </div>

      {/* Tabs */}
      <div className="mt-4">
        <IconTabBar
          tabs={TABS}
          activeTab={activeTab}
          onTabChange={(id) => setActiveTab(id as ActiveTab)}
          ariaLabel="Playbook"
        />
      </div>

      <div className="mt-6">
        {activeTab === "playbook" && <PlaybookTab />}
        {activeTab === "goals" && (
          <GoalsTab
            goals={goalsWithActuals}
            onChange={handleGoalsChange}
            northStarGoalIds={northStarGoalIds}
            onToggleNorthStarGoal={toggleNorthStarGoal}
          />
        )}
        {activeTab === "agenda" && (
          <AgendaTab date={currentDate} />
        )}
        {activeTab === "tasks" && <TasksTab today={currentDate} />}
      </div>
    </div>
  );
}

// ── Monthly Goals Card ──────────────────────────────────────────────────────

function formatCompactUsd(n: number) {
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (abs >= 1000) return `$${(n / 1000).toFixed(1)}k`;
  return formatCurrency(n);
}

function GoalRow({
  goal,
  isNorthStar,
  onToggleNorthStar,
  editingTargetId,
  targetDraft,
  setTargetDraft,
  onStartEditTarget,
  onConfirmTargetEdit,
  onCancelTargetEdit,
}: {
  goal: MonthlyGoal;
  isNorthStar: boolean;
  onToggleNorthStar: (goalId: string) => void;
  editingTargetId: string | null;
  targetDraft: number;
  setTargetDraft: (value: number) => void;
  onStartEditTarget: (goal: MonthlyGoal) => void;
  onConfirmTargetEdit: (goal: MonthlyGoal) => void;
  onCancelTargetEdit: () => void;
}) {
  const pct = Math.min((goal.current / Math.max(goal.target, 1)) * 100, 100);
  const GoalIcon = goal.icon === "users" ? UsersRound : DollarSign;
  const isEditingTarget = editingTargetId === goal.id;
  const displayDots = Math.min(goal.target, 40);
  const filledDots =
    goal.target > 0
      ? Math.min(displayDots, Math.floor((goal.current / goal.target) * displayDots))
      : 0;

  return (
    <div className="border-t border-border px-5 py-4 first:border-t-0 dark:border-zinc-800">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-center gap-2.5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800/90">
            <GoalIcon className="h-4 w-4 text-zinc-600 dark:text-zinc-400" aria-hidden />
          </span>
          <span className="truncate text-sm font-medium text-text-primary dark:text-zinc-100">
            {goal.title}
          </span>
        </div>

        {isEditingTarget ? (
          <div className="flex shrink-0 items-center gap-1.5">
            {goal.unit === "currency" && (
              <span className="text-sm text-text-secondary dark:text-zinc-500">$</span>
            )}
            <input
              type="number"
              min="1"
              step="1"
              value={targetDraft}
              onChange={(e) => setTargetDraft(Number(e.target.value))}
              onKeyDown={(e) => {
                if (e.key === "Enter") onConfirmTargetEdit(goal);
                if (e.key === "Escape") onCancelTargetEdit();
              }}
              autoFocus
              className="w-24 rounded-lg border border-accent bg-white px-2 py-1 text-right text-sm font-semibold text-text-primary outline-none ring-2 ring-accent/15 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
            />
            <button
              type="button"
              onClick={() => onConfirmTargetEdit(goal)}
              className="flex h-7 w-7 items-center justify-center rounded-full text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-950/50"
              aria-label="Save monthly target"
            >
              <CheckCircle2 className="h-5 w-5" />
            </button>
          </div>
        ) : (
          <div className="flex shrink-0 items-center gap-1.5">
            <span className="text-sm font-semibold tabular-nums text-text-primary dark:text-zinc-100">
              {goal.unit === "currency" ? (
                <>
                  {formatCompactUsd(goal.current)} / {formatCompactUsd(goal.target)}
                </>
              ) : (
                <>
                  {goal.current} / {goal.target}
                </>
              )}
            </span>
            <button
              type="button"
              onClick={() => onStartEditTarget(goal)}
              className="rounded p-0.5 text-text-secondary/40 transition-colors hover:text-accent dark:hover:text-violet-400"
              title="Edit monthly target"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => onToggleNorthStar(goal.id)}
              className={`rounded p-0.5 transition-colors ${
                isNorthStar
                  ? "text-amber-500 hover:text-amber-600"
                  : "text-text-secondary/40 hover:text-amber-500"
              }`}
              title={isNorthStar ? "Remove from North Star" : "Add to North Star"}
              aria-label={isNorthStar ? "Remove from North Star" : "Add to North Star"}
            >
              <Star className={`h-3.5 w-3.5 ${isNorthStar ? "fill-current" : ""}`} />
            </button>
          </div>
        )}
      </div>

      {goal.unit === "count" ? (
        <div className="mt-2 flex flex-wrap items-center gap-1.5 pl-11">
          {Array.from({ length: displayDots }).map((_, i) => (
            <span
              key={i}
              className={`h-2.5 w-2.5 rounded-full ${
                i < filledDots ? "bg-emerald-500" : "bg-gray-200 dark:bg-zinc-700"
              }`}
            />
          ))}
          {goal.target > 40 ? (
            <span className="text-[10px] text-text-secondary dark:text-zinc-500">
              ({goal.target} total)
            </span>
          ) : null}
        </div>
      ) : (
        <div className="mt-2 pl-11">
          <div className="h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-zinc-800">
            <div
              className="h-full rounded-full bg-amber-400 transition-all dark:bg-amber-500/90"
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="mt-1 text-right text-xs text-text-secondary dark:text-zinc-500">
            {goal.current >= goal.target
              ? "Goal reached"
              : `${formatCompactUsd(Math.max(0, goal.target - goal.current))} more!`}
          </p>
        </div>
      )}
    </div>
  );
}

function GoalsSectionCard({
  title,
  icon,
  color,
  children,
  right,
}: {
  title: string;
  icon: ReactNode;
  color: string;
  children: ReactNode;
  right?: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950/40">
      <div className="flex items-center gap-2 px-5 py-4 sm:gap-3">
        <div
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white"
          style={{ backgroundColor: color }}
        >
          {icon}
        </div>
        <span className="min-w-0 flex-1 truncate text-sm font-semibold text-text-primary dark:text-zinc-100">
          {title}
        </span>
        {right}
      </div>
      <div className="border-t border-border dark:border-zinc-800">{children}</div>
    </div>
  );
}

function MonthlyGoalsCard({
  goals,
  onChange,
  northStarGoalIds,
  onToggleNorthStarGoal,
}: {
  goals: MonthlyGoal[];
  onChange: (goals: MonthlyGoal[]) => void;
  northStarGoalIds: string[];
  onToggleNorthStarGoal: (goalId: string) => void;
}) {
  const [editingTargetId, setEditingTargetId] = useState<string | null>(null);
  const [targetDraft, setTargetDraft] = useState(0);
  const northStarIdSet = useMemo(
    () => new Set(northStarGoalIds),
    [northStarGoalIds]
  );
  const northStarGoals = useMemo(
    () =>
      northStarGoalIds
        .map((id) => goals.find((goal) => goal.id === id))
        .filter((goal): goal is MonthlyGoal => Boolean(goal)),
    [northStarGoalIds, goals]
  );

  function startEditTarget(g: MonthlyGoal) {
    setEditingTargetId(g.id);
    setTargetDraft(g.target);
  }

  function confirmTargetEdit(g: MonthlyGoal) {
    const val = Math.max(1, Math.floor(targetDraft));
    onChange(goals.map((goal) => (goal.id === g.id ? { ...goal, target: val } : goal)));
    setEditingTargetId(null);
  }

  const now = new Date();
  const monthLabel = now.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  return (
    <div className="space-y-4">
      {northStarGoals.length > 0 ? (
        <GoalsSectionCard
          title="North Star"
          icon={<Star className="h-4 w-4 fill-current" aria-hidden />}
          color="#f59e0b"
          right={
            <span className="text-xs tabular-nums text-text-secondary">
              {northStarGoals.length}/{goals.length}
            </span>
          }
        >
          {northStarGoals.map((goal) => (
            <GoalRow
              key={`north-star-${goal.id}`}
              goal={goal}
              isNorthStar
              onToggleNorthStar={onToggleNorthStarGoal}
              editingTargetId={editingTargetId}
              targetDraft={targetDraft}
              setTargetDraft={setTargetDraft}
              onStartEditTarget={startEditTarget}
              onConfirmTargetEdit={confirmTargetEdit}
              onCancelTargetEdit={() => setEditingTargetId(null)}
            />
          ))}
        </GoalsSectionCard>
      ) : null}

      <GoalsSectionCard
        title="Monthly Goals"
        icon={<Target className="h-4 w-4" aria-hidden />}
        color="#7c3aed"
        right={
          <span className="flex items-center gap-1.5 rounded-full border border-violet-200/90 bg-violet-50 px-3 py-1 text-xs font-medium text-violet-800 dark:border-violet-500/30 dark:bg-violet-500/15 dark:text-violet-200">
            <Calendar className="h-3 w-3 text-violet-600 dark:text-violet-400" aria-hidden />
            {monthLabel}
          </span>
        }
      >
        {goals.map((goal) => (
          <GoalRow
            key={goal.id}
            goal={goal}
            isNorthStar={northStarIdSet.has(goal.id)}
            onToggleNorthStar={onToggleNorthStarGoal}
            editingTargetId={editingTargetId}
            targetDraft={targetDraft}
            setTargetDraft={setTargetDraft}
            onStartEditTarget={startEditTarget}
            onConfirmTargetEdit={confirmTargetEdit}
            onCancelTargetEdit={() => setEditingTargetId(null)}
          />
        ))}
      </GoalsSectionCard>
    </div>
  );
}

function GoalsTab({
  goals,
  onChange,
  northStarGoalIds,
  onToggleNorthStarGoal,
}: {
  goals: MonthlyGoal[];
  onChange: (goals: MonthlyGoal[]) => void;
  northStarGoalIds: string[];
  onToggleNorthStarGoal: (goalId: string) => void;
}) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="heading-display text-lg font-semibold text-text-primary dark:text-zinc-100">
          Goals
        </h2>
        <p className="mt-1 text-sm text-text-secondary dark:text-zinc-400">
          Track your monthly targets and star the goals that matter most right now.
        </p>
      </div>
      <MonthlyGoalsCard
        goals={goals}
        onChange={onChange}
        northStarGoalIds={northStarGoalIds}
        onToggleNorthStarGoal={onToggleNorthStarGoal}
      />
    </div>
  );
}

// ── Playbook Tab ────────────────────────────────────────────────────────────

type PlaybookEditFields = {
  title: string;
  points: number;
  target: number;
  timeEstimate: string;
};

function PlaybookCategoryRow({
  cat,
  isOpen,
  catEarned,
  catTotal,
  completions,
  editingSectionId,
  sectionNameDraft,
  setSectionNameDraft,
  onConfirmEditSection,
  onCancelEditSection,
  onStartEditSection,
  onDeleteSection,
  onToggleCollapse,
  editingActivity,
  editFields,
  setEditFields,
  onStartEditActivity,
  onConfirmEditActivity,
  onCancelEditActivity,
  onDeleteActivity,
  onAddActivity,
  onIncrement,
  onDecrement,
  iconPickerForCategoryId,
  onToggleIconPicker,
  onPickSectionIcon,
  onPickSectionColor,
  priorityIdSet,
  onTogglePriorityActivity,
  onReorderActivitiesInSection,
}: {
  cat: PlaybookCategory;
  isOpen: boolean;
  catEarned: number;
  catTotal: number;
  completions: Record<string, number>;
  priorityIdSet: Set<string>;
  onTogglePriorityActivity: (activityId: string) => void;
  onReorderActivitiesInSection: (
    catId: string,
    activeId: string,
    overId: string
  ) => void;
  editingSectionId: string | null;
  sectionNameDraft: string;
  setSectionNameDraft: (v: string) => void;
  onConfirmEditSection: () => void;
  onCancelEditSection: () => void;
  onStartEditSection: (c: PlaybookCategory) => void;
  onDeleteSection: (id: string) => void;
  onToggleCollapse: (id: string) => void;
  editingActivity: string | null;
  editFields: PlaybookEditFields;
  setEditFields: Dispatch<SetStateAction<PlaybookEditFields>>;
  onStartEditActivity: (a: PlaybookActivity) => void;
  onConfirmEditActivity: () => void;
  onCancelEditActivity: () => void;
  onDeleteActivity: (catId: string, activityId: string) => void;
  onAddActivity: (catId: string) => void;
  onIncrement: (activityId: string, target: number) => void;
  onDecrement: (activityId: string) => void;
  iconPickerForCategoryId: string | null;
  onToggleIconPicker: (catId: string) => void;
  onPickSectionIcon: (catId: string, iconKey: string) => void;
  onPickSectionColor: (catId: string, color: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: cat.id });

  const sortStyle = {
    transform: CSS.Transform.toString(transform),
    transition: isDragging ? undefined : transition,
  };

  const iconPickerOpen = iconPickerForCategoryId === cat.id;
  const visibleActivities = cat.activities.filter(
    (a) => !priorityIdSet.has(a.id)
  );

  const activitySensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    })
  );

  return (
    <div
      ref={setNodeRef}
      style={{
        ...sortStyle,
        ...(isDragging ? { opacity: 0, pointerEvents: "none" as const } : {}),
      }}
      className="rounded-2xl border border-border bg-white shadow-sm"
    >
      <div className="group/sec flex items-center gap-2 px-5 py-4 sm:gap-3">
        <button
          type="button"
          className="shrink-0 cursor-grab touch-none rounded-lg p-1.5 text-text-secondary/70 hover:bg-surface active:cursor-grabbing"
          aria-label="Reorder section"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4" />
        </button>

        <div
          className="relative shrink-0"
          data-playbook-icon-picker={iconPickerOpen ? "" : undefined}
        >
          <button
            type="button"
            onClick={() => onToggleIconPicker(cat.id)}
            aria-haspopup="dialog"
            aria-expanded={iconPickerOpen}
            aria-label="Change section icon"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-white transition-opacity hover:opacity-90"
            style={{ backgroundColor: cat.color }}
          >
            {renderPlaybookCategoryIcon(cat.icon) ?? (
              <Circle className="h-4 w-4" />
            )}
          </button>
          {iconPickerOpen && (
            <div
              className="absolute left-0 top-full z-50 mt-1 w-52 max-w-[calc(100vw-2rem)] rounded-xl border border-border bg-white p-2 shadow-lg"
              role="dialog"
              aria-label="Choose section icon and color"
            >
              <p className="px-1 pb-1 text-[10px] font-semibold uppercase tracking-wide text-text-secondary/80">
                Icon
              </p>
              <div className="grid max-h-44 grid-cols-4 gap-1 overflow-y-auto">
                {PLAYBOOK_CATEGORY_ICON_KEYS.map((key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => onPickSectionIcon(cat.id, key)}
                    className={`flex h-9 w-9 items-center justify-center rounded-lg text-text-secondary hover:bg-surface ${
                      cat.icon === key
                        ? "bg-accent/10 ring-1 ring-accent/30"
                        : ""
                    }`}
                    aria-label={`Use ${key} icon`}
                  >
                    {renderPlaybookCategoryIcon(key) ?? (
                      <Circle className="h-4 w-4" />
                    )}
                  </button>
                ))}
              </div>
              <p className="mt-2 px-1 pb-1 text-[10px] font-semibold uppercase tracking-wide text-text-secondary/80">
                Color
              </p>
              <div className="flex flex-wrap gap-2">
                {PLAYBOOK_SECTION_COLORS.map((hex) => {
                  const selected = playbookColorsMatch(cat.color, hex);
                  return (
                    <button
                      key={hex}
                      type="button"
                      onClick={() => onPickSectionColor(cat.id, hex)}
                      className={`h-7 w-7 shrink-0 rounded-full border border-black/10 shadow-sm outline-none ring-offset-2 transition-transform hover:scale-110 focus-visible:ring-2 focus-visible:ring-accent dark:border-white/20 ${
                        selected ? "ring-2 ring-text-primary ring-offset-2" : ""
                      }`}
                      style={{ backgroundColor: hex }}
                      aria-label={
                        selected
                          ? `Section color ${hex}, selected`
                          : `Set section color to ${hex}`
                      }
                    />
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={() => onToggleCollapse(cat.id)}
          aria-expanded={isOpen}
          aria-label={isOpen ? "Collapse section" : "Expand section"}
          className="flex shrink-0 items-center rounded-lg p-1 text-text-secondary transition-colors hover:bg-surface hover:text-text-primary"
        >
          <ChevronDown
            className={`h-4 w-4 transition-transform ${
              isOpen ? "" : "-rotate-90"
            }`}
          />
        </button>

        <div className="flex min-w-0 flex-1 items-center gap-2">
          {editingSectionId === cat.id ? (
            <>
              <input
                autoFocus
                value={sectionNameDraft}
                onChange={(e) => setSectionNameDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") onConfirmEditSection();
                  if (e.key === "Escape") onCancelEditSection();
                }}
                placeholder="Section name"
                className="min-w-0 flex-1 rounded-lg border border-accent bg-white px-2.5 py-1.5 text-sm font-semibold text-text-primary outline-none ring-2 ring-accent/15"
              />
              <button
                type="button"
                onClick={onConfirmEditSection}
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-emerald-500 hover:bg-emerald-50"
                aria-label="Save section name"
              >
                <CheckCircle2 className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={onCancelEditSection}
                className="shrink-0 rounded px-2 py-1 text-xs text-text-secondary hover:text-text-primary"
              >
                Cancel
              </button>
            </>
          ) : (
            <>
              <span className="truncate text-sm font-semibold text-text-primary">
                {cat.name}
              </span>
              <button
                type="button"
                onClick={() => onStartEditSection(cat)}
                className="rounded p-1 text-text-secondary/0 transition-colors group-hover/sec:text-text-secondary/50 hover:text-accent"
                aria-label="Rename section"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
            </>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <div className="h-1.5 w-20 overflow-hidden rounded-full bg-gray-100">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${catTotal > 0 ? (catEarned / catTotal) * 100 : 0}%`,
                backgroundColor: cat.color,
              }}
            />
          </div>
          <span className="text-xs tabular-nums text-text-secondary">
            {catEarned}/{catTotal} pts
          </span>
        </div>

        <button
          type="button"
          onClick={() => onDeleteSection(cat.id)}
          className="rounded p-1 text-text-secondary/40 transition-colors hover:text-red-500"
          aria-label="Delete section"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      {isOpen && (
        <div className="border-t border-border">
          <DndContext
            id={`playbook-act-${cat.id}`}
            sensors={activitySensors}
            collisionDetection={closestCenter}
            onDragEnd={(e) => {
              const { active, over } = e;
              if (!over || active.id === over.id) return;
              onReorderActivitiesInSection(
                cat.id,
                String(active.id),
                String(over.id)
              );
            }}
          >
            <SortableContext
              items={visibleActivities.map((a) => a.id)}
              strategy={verticalListSortingStrategy}
            >
              {visibleActivities.map((activity, activityIndex) => (
                <SortablePlaybookActivityRow
                  key={activity.id}
                  sortableId={activity.id}
                  sortableDisabled={editingActivity === activity.id}
                >
                  {(handle) => (
                    <ActivityRow
                      activity={activity}
                      listIndex={activityIndex + 1}
                      completed={completions[activity.id] ?? 0}
                      isEditing={editingActivity === activity.id}
                      editFields={editFields}
                      onEditFieldsChange={setEditFields}
                      onStartEdit={() => onStartEditActivity(activity)}
                      onConfirmEdit={onConfirmEditActivity}
                      onCancelEdit={onCancelEditActivity}
                      onDelete={() => onDeleteActivity(cat.id, activity.id)}
                      onIncrement={() =>
                        onIncrement(activity.id, activity.target)
                      }
                      onDecrement={() => onDecrement(activity.id)}
                      isPriority={false}
                      onTogglePriority={() =>
                        onTogglePriorityActivity(activity.id)
                      }
                      dragHandle={
                        editingActivity === activity.id ? null : handle
                      }
                    />
                  )}
                </SortablePlaybookActivityRow>
              ))}
            </SortableContext>
          </DndContext>
          <div className="px-5 py-3">
            <button
              type="button"
              onClick={() => onAddActivity(cat.id)}
              className="flex items-center gap-1 text-xs font-medium text-text-secondary hover:text-accent"
            >
              <Plus className="h-3 w-3" /> Add Activity
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/** Pinned Priorities block above draggable sections (no section DnD / delete / add). */
function PlaybookPinnedPrioritiesRow({
  cat,
  isOpen,
  catEarned,
  catTotal,
  completions,
  onToggleCollapse,
  editingActivity,
  editFields,
  setEditFields,
  onStartEditActivity,
  onConfirmEditActivity,
  onCancelEditActivity,
  onDeleteActivity,
  onIncrement,
  onDecrement,
  onTogglePriorityActivity,
  ownerCategoryId,
  onReorderPriorityActivities,
}: {
  cat: PlaybookCategory;
  isOpen: boolean;
  catEarned: number;
  catTotal: number;
  completions: Record<string, number>;
  onToggleCollapse: (id: string) => void;
  editingActivity: string | null;
  editFields: PlaybookEditFields;
  setEditFields: Dispatch<SetStateAction<PlaybookEditFields>>;
  onStartEditActivity: (a: PlaybookActivity) => void;
  onConfirmEditActivity: () => void;
  onCancelEditActivity: () => void;
  onDeleteActivity: (catId: string, activityId: string) => void;
  onIncrement: (activityId: string, target: number) => void;
  onDecrement: (activityId: string) => void;
  onTogglePriorityActivity: (activityId: string) => void;
  ownerCategoryId: (activityId: string) => string | undefined;
  onReorderPriorityActivities: (activeId: string, overId: string) => void;
}) {
  const priorityActivitySensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    })
  );

  return (
    <div className="rounded-2xl border border-border bg-white shadow-sm">
      <div className="group/sec flex items-center gap-2 px-5 py-4 sm:gap-3">
        <div
          className="w-9 shrink-0"
          aria-hidden
        />
        <div
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white"
          style={{ backgroundColor: cat.color }}
        >
          {renderPlaybookCategoryIcon(cat.icon) ?? (
            <Star className="h-4 w-4" />
          )}
        </div>
        <button
          type="button"
          onClick={() => onToggleCollapse(cat.id)}
          aria-expanded={isOpen}
          aria-label={isOpen ? "Collapse section" : "Expand section"}
          className="flex shrink-0 items-center rounded-lg p-1 text-text-secondary transition-colors hover:bg-surface hover:text-text-primary"
        >
          <ChevronDown
            className={`h-4 w-4 transition-transform ${
              isOpen ? "" : "-rotate-90"
            }`}
          />
        </button>
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <span className="truncate text-sm font-semibold text-text-primary">
            {cat.name}
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <div className="h-1.5 w-20 overflow-hidden rounded-full bg-gray-100">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${catTotal > 0 ? (catEarned / catTotal) * 100 : 0}%`,
                backgroundColor: cat.color,
              }}
            />
          </div>
          <span className="text-xs tabular-nums text-text-secondary">
            {catEarned}/{catTotal} pts
          </span>
        </div>
        <div className="w-8 shrink-0" aria-hidden />
      </div>

      {isOpen && (
        <div className="border-t border-border">
          <DndContext
            id="playbook-priority-activities"
            sensors={priorityActivitySensors}
            collisionDetection={closestCenter}
            onDragEnd={(e) => {
              const { active, over } = e;
              if (!over || active.id === over.id) return;
              onReorderPriorityActivities(
                String(active.id),
                String(over.id)
              );
            }}
          >
            <SortableContext
              items={cat.activities.map((a) => a.id)}
              strategy={verticalListSortingStrategy}
            >
              {cat.activities.map((activity, activityIndex) => (
                <SortablePlaybookActivityRow
                  key={activity.id}
                  sortableId={activity.id}
                  sortableDisabled={editingActivity === activity.id}
                >
                  {(handle) => (
                    <ActivityRow
                      activity={activity}
                      listIndex={activityIndex + 1}
                      completed={completions[activity.id] ?? 0}
                      isEditing={editingActivity === activity.id}
                      editFields={editFields}
                      onEditFieldsChange={setEditFields}
                      onStartEdit={() => onStartEditActivity(activity)}
                      onConfirmEdit={onConfirmEditActivity}
                      onCancelEdit={onCancelEditActivity}
                      onDelete={() => {
                        const cid = ownerCategoryId(activity.id);
                        if (cid) onDeleteActivity(cid, activity.id);
                      }}
                      onIncrement={() =>
                        onIncrement(activity.id, activity.target)
                      }
                      onDecrement={() => onDecrement(activity.id)}
                      isPriority
                      onTogglePriority={() =>
                        onTogglePriorityActivity(activity.id)
                      }
                      dragHandle={
                        editingActivity === activity.id ? null : handle
                      }
                    />
                  )}
                </SortablePlaybookActivityRow>
              ))}
            </SortableContext>
          </DndContext>
        </div>
      )}
    </div>
  );
}

function playbookCategoryPoints(
  cat: PlaybookCategory,
  completions: Record<string, number>,
  excludeActivityIds?: Set<string>
) {
  const acts =
    excludeActivityIds && excludeActivityIds.size > 0
      ? cat.activities.filter((a) => !excludeActivityIds.has(a.id))
      : cat.activities;
  const catEarned = acts.reduce((s, a) => {
    const done = completions[a.id] ?? 0;
    return s + (done >= a.target ? a.points : 0);
  }, 0);
  const catTotal = acts.reduce((s, a) => s + a.points, 0);
  return { catEarned, catTotal };
}

/** Reorder visible (non-priority) activities while keeping priority rows fixed in `activities`. */
function reorderNonPriorityActivities(
  activities: PlaybookActivity[],
  priorityIdSet: Set<string>,
  activeId: string,
  overId: string
): PlaybookActivity[] {
  const nonPri = activities.filter((a) => !priorityIdSet.has(a.id));
  const oldIdx = nonPri.findIndex((a) => a.id === activeId);
  const newIdx = nonPri.findIndex((a) => a.id === overId);
  if (oldIdx < 0 || newIdx < 0) return activities;
  const reordered = arrayMove(nonPri, oldIdx, newIdx);
  const q = [...reordered];
  return activities.map((a) =>
    priorityIdSet.has(a.id) ? a : (q.shift() as PlaybookActivity)
  );
}

/** Drag preview only — avoids transform + full card compositing (ghosting) on the live row. */
function PlaybookSectionDragPreview({
  cat,
  completions,
}: {
  cat: PlaybookCategory;
  completions: Record<string, number>;
}) {
  const { catEarned, catTotal } = playbookCategoryPoints(cat, completions);
  return (
    <div className="flex w-[min(100vw-2rem,28rem)] cursor-grabbing items-center gap-3 rounded-2xl border border-border bg-white px-5 py-4 shadow-xl dark:border-zinc-700 dark:bg-zinc-900">
      <GripVertical
        className="h-4 w-4 shrink-0 text-text-secondary/70"
        aria-hidden
      />
      <div
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white"
        style={{ backgroundColor: cat.color }}
      >
        {renderPlaybookCategoryIcon(cat.icon) ?? (
          <Circle className="h-4 w-4" aria-hidden />
        )}
      </div>
      <ChevronDown
        className="h-4 w-4 shrink-0 -rotate-90 text-text-secondary"
        aria-hidden
      />
      <span className="min-w-0 flex-1 truncate text-sm font-semibold text-text-primary dark:text-zinc-100">
        {cat.name}
      </span>
      <span className="shrink-0 text-xs tabular-nums text-text-secondary dark:text-zinc-400">
        {catEarned}/{catTotal} pts
      </span>
    </div>
  );
}

function PlaybookTab() {
  const [completions, setCompletions] = useState<Record<string, number>>({});
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const collapsedHydrated = useRef(false);
  const [categories, setCategories] = useState<PlaybookCategory[]>(playbookCategories);
  const [priorityActivityIds, setPriorityActivityIds] = useState<string[]>([]);
  const [playbookReady, setPlaybookReady] = useState(false);
  const [playbookUserId, setPlaybookUserId] = useState<string | null>(null);
  const [editingActivity, setEditingActivity] = useState<string | null>(null);
  const [editFields, setEditFields] = useState<PlaybookEditFields>({
    title: "",
    points: 0,
    target: 0,
    timeEstimate: "",
  });
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [sectionNameDraft, setSectionNameDraft] = useState("");
  const [iconPickerForCategoryId, setIconPickerForCategoryId] = useState<
    string | null
  >(null);
  const [activeSectionDragId, setActiveSectionDragId] = useState<string | null>(
    null
  );

  const priorityIdSet = useMemo(
    () => new Set(priorityActivityIds),
    [priorityActivityIds]
  );

  const prioritiesCat = useMemo((): PlaybookCategory | null => {
    const acts: PlaybookActivity[] = [];
    for (const id of priorityActivityIds) {
      const a = findActivityById(categories, id);
      if (a) acts.push(a);
    }
    if (acts.length === 0) return null;
    return {
      id: PLAYBOOK_PRIORITIES_SECTION_ID,
      name: "Priorities",
      icon: "star",
      color: "#f59e0b",
      activities: acts,
    };
  }, [priorityActivityIds, categories]);

  const reorderActivitiesInSection = useCallback(
    (catId: string, activeId: string, overId: string) => {
      setCategories((prev) =>
        prev.map((c) => {
          if (c.id !== catId) return c;
          return {
            ...c,
            activities: reorderNonPriorityActivities(
              c.activities,
              priorityIdSet,
              activeId,
              overId
            ),
          };
        })
      );
    },
    [priorityIdSet]
  );

  function reorderPriorityActivities(activeId: string, overId: string) {
    setPriorityActivityIds((prev) => {
      const oi = prev.indexOf(activeId);
      const ni = prev.indexOf(overId);
      if (oi < 0 || ni < 0) return prev;
      return arrayMove(prev, oi, ni);
    });
  }

  useEffect(() => {
    setPriorityActivityIds((prev) =>
      prunePriorityActivityIds(categories, prev)
    );
  }, [categories]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    })
  );

  useLayoutEffect(() => {
    setCollapsed(loadPlaybookSectionCollapsed());
    collapsedHydrated.current = true;
  }, []);

  useEffect(() => {
    if (!collapsedHydrated.current) return;
    savePlaybookSectionCollapsed(collapsed);
  }, [collapsed]);

  useEffect(() => {
    if (!playbookReady || !collapsedHydrated.current) return;
    setCollapsed((prev) => {
      const ids = new Set([
        PLAYBOOK_PRIORITIES_SECTION_ID,
        ...categories.map((c) => c.id),
      ]);
      const next: Record<string, boolean> = {};
      for (const id of ids) {
        if (prev[id]) next[id] = true;
      }
      if (
        Object.keys(prev).length === Object.keys(next).length &&
        Object.keys(next).every((id) => prev[id] === next[id])
      ) {
        return prev;
      }
      return next;
    });
  }, [categories, playbookReady]);

  useEffect(() => {
    if (!iconPickerForCategoryId) return;
    function onPointerDown(e: PointerEvent) {
      const el = e.target;
      if (!(el instanceof Element)) return;
      if (!el.closest("[data-playbook-icon-picker]")) {
        setIconPickerForCategoryId(null);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setIconPickerForCategoryId(null);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [iconPickerForCategoryId]);

  function handleDragStart(event: DragStartEvent) {
    setActiveSectionDragId(String(event.active.id));
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveSectionDragId(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setCategories((prev) => {
      const oldIndex = prev.findIndex((c) => c.id === active.id);
      const newIndex = prev.findIndex((c) => c.id === over.id);
      if (oldIndex < 0 || newIndex < 0) return prev;
      return arrayMove(prev, oldIndex, newIndex);
    });
  }

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      const loaded = loadPlaybookCategories();
      if (loaded !== null) setCategories(loaded);
      setCompletions(getCompletions());
      setPriorityActivityIds(
        prunePriorityActivityIds(
          loaded ?? [],
          loadPlaybookPriorityActivityIds()
        )
      );
      setPlaybookUserId(null);
      setPlaybookReady(true);
      return;
    }

    const supabase = createClient();
    let cancelled = false;

    function applyGuestLocal() {
      if (cancelled) return;
      const loaded = loadPlaybookCategories();
      if (loaded !== null) setCategories(loaded);
      setCompletions(getCompletions());
      setPriorityActivityIds(
        prunePriorityActivityIds(
          loaded ?? [],
          loadPlaybookPriorityActivityIds()
        )
      );
      setPlaybookUserId(null);
      setPlaybookReady(true);
    }

    async function hydrateForUser(user: { id: string }) {
      if (cancelled) return;
      const result = await fetchUserProspectingPlaybook(supabase, user.id);
      if (cancelled) return;

      const lsCats = loadPlaybookCategories();
      const lsCompletions = getCompletions();
      const hasLocalData = lsCats !== null && lsCats.length > 0;

      if (!result.found) {
        if (hasLocalData) {
          const lsPriority = loadPlaybookPriorityActivityIds();
          setCategories(lsCats);
          setCompletions(lsCompletions);
          setPriorityActivityIds(
            prunePriorityActivityIds(lsCats, lsPriority)
          );
          await upsertUserProspectingPlaybook(
            supabase,
            user.id,
            lsCats,
            lsCompletions,
            prunePriorityActivityIds(lsCats, lsPriority)
          );
        } else {
          setCategories([]);
          setCompletions({});
          setPriorityActivityIds([]);
        }
      } else {
        const { categories: dbCats, completions: dbComp, priorityActivityIds: dbPriority } = result;
        if (dbCats.length > 0) {
          setCategories(dbCats);
          setCompletions(dbComp);
          setPriorityActivityIds(
            prunePriorityActivityIds(dbCats, dbPriority)
          );
        } else if (hasLocalData) {
          const lsPriority = loadPlaybookPriorityActivityIds();
          setCategories(lsCats);
          setCompletions(lsCompletions);
          setPriorityActivityIds(
            prunePriorityActivityIds(lsCats, lsPriority)
          );
          await upsertUserProspectingPlaybook(
            supabase,
            user.id,
            lsCats,
            lsCompletions,
            prunePriorityActivityIds(lsCats, lsPriority)
          );
        } else {
          setCategories([]);
          setCompletions(dbComp);
          setPriorityActivityIds(
            prunePriorityActivityIds([], dbPriority)
          );
        }
      }

      setPlaybookUserId(user.id);
      setPlaybookReady(true);
    }

    void supabase.auth.getUser().then(({ data: { user } }) => {
      if (cancelled) return;
      if (user) void hydrateForUser(user);
      else applyGuestLocal();
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (cancelled) return;
      if (session?.user) void hydrateForUser(session.user);
      else applyGuestLocal();
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!playbookReady) return;
    const t = window.setTimeout(() => {
      if (playbookUserId) {
        const supabase = createClient();
        void upsertUserProspectingPlaybook(
          supabase,
          playbookUserId,
          categories,
          completions,
          priorityActivityIds
        );
      } else {
        savePlaybookCategories(categories);
        saveCompletions(completions);
        savePlaybookPriorityActivityIds(priorityActivityIds);
      }
    }, 450);
    return () => window.clearTimeout(t);
  }, [categories, completions, priorityActivityIds, playbookReady, playbookUserId]);

  function startEditActivity(a: PlaybookActivity) {
    setEditingSectionId(null);
    setEditingActivity(a.id);
    setEditFields({ title: a.title, points: a.points, target: a.target, timeEstimate: a.timeEstimate });
  }

  function startEditSection(cat: PlaybookCategory) {
    setEditingActivity(null);
    setEditingSectionId(cat.id);
    setSectionNameDraft(cat.name);
  }

  function confirmEditSection() {
    if (!editingSectionId) return;
    const id = editingSectionId;
    const name = sectionNameDraft.trim() || "Untitled section";
    setCategories((prev) =>
      prev.map((c) => (c.id === id ? { ...c, name } : c))
    );
    setEditingSectionId(null);
  }

  function cancelEditSection() {
    setEditingSectionId(null);
  }

  function confirmEditActivity() {
    if (!editingActivity) return;
    const id = editingActivity;
    setCategories((prev) =>
      prev.map((c) => ({
        ...c,
        activities: c.activities.map((a) =>
          a.id === id
            ? { ...a, title: editFields.title.trim() || a.title, points: Math.max(1, editFields.points), target: Math.max(1, editFields.target), timeEstimate: editFields.timeEstimate.trim() || a.timeEstimate }
            : a
        ),
      }))
    );
    setEditingActivity(null);
  }

  function togglePriorityActivity(activityId: string) {
    setPriorityActivityIds((prev) =>
      prev.includes(activityId)
        ? prev.filter((x) => x !== activityId)
        : [activityId, ...prev]
    );
  }

  function deleteActivity(catId: string, activityId: string) {
    setPriorityActivityIds((prev) => prev.filter((x) => x !== activityId));
    setCategories((prev) =>
      prev.map((c) =>
        c.id === catId
          ? { ...c, activities: c.activities.filter((a) => a.id !== activityId) }
          : c
      )
    );
  }

  function addActivity(catId: string) {
    const newId = `a-${Date.now()}`;
    setCategories((prev) =>
      prev.map((c) =>
        c.id === catId
          ? { ...c, activities: [...c.activities, { id: newId, title: "New Activity", points: 5, target: 1, timeEstimate: "5 min" }] }
          : c
      )
    );
    startEditActivity({ id: newId, title: "New Activity", points: 5, target: 1, timeEstimate: "5 min" });
  }

  function addSection() {
    const newId = `cat-${Date.now()}`;
    setEditingActivity(null);
    setCategories((prev) => [
      ...prev,
      { id: newId, name: "New Section", icon: "phone", color: "#6366f1", activities: [] },
    ]);
    setEditingSectionId(newId);
    setSectionNameDraft("New Section");
  }

  function deleteSection(catId: string) {
    if (editingSectionId === catId) setEditingSectionId(null);
    const removedIds =
      categories.find((c) => c.id === catId)?.activities.map((a) => a.id) ??
      [];
    if (removedIds.length > 0) {
      const drop = new Set(removedIds);
      setPriorityActivityIds((prev) => prev.filter((x) => !drop.has(x)));
    }
    setCategories((prev) => prev.filter((c) => c.id !== catId));
  }

  const totalPoints = categories.reduce(
    (sum, c) => sum + c.activities.reduce((s, a) => s + a.points, 0),
    0
  );
  const earnedPoints = categories.reduce(
    (sum, c) =>
      sum +
      c.activities.reduce((s, a) => {
        const done = completions[a.id] ?? 0;
        return s + (done >= a.target ? a.points : 0);
      }, 0),
    0
  );
  const totalActivities = categories.reduce(
    (s, c) => s + c.activities.length,
    0
  );
  const completedActivities = categories.reduce(
    (s, c) =>
      s +
      c.activities.filter((a) => (completions[a.id] ?? 0) >= a.target).length,
    0
  );
  const pct =
    totalActivities > 0
      ? Math.round((completedActivities / totalActivities) * 100)
      : 0;

  function increment(activityId: string, target: number) {
    setCompletions((prev) => {
      const cur = prev[activityId] ?? 0;
      if (cur >= target) return prev;
      return { ...prev, [activityId]: cur + 1 };
    });
  }

  function decrement(activityId: string) {
    setCompletions((prev) => {
      const cur = prev[activityId] ?? 0;
      if (cur <= 0) return prev;
      return { ...prev, [activityId]: cur - 1 };
    });
  }

  function toggleCollapse(catId: string) {
    setCollapsed((prev) => ({ ...prev, [catId]: !prev[catId] }));
  }

  const activeDragCategory = useMemo(() => {
    if (!activeSectionDragId) return null;
    return categories.find((c) => c.id === activeSectionDragId) ?? null;
  }, [activeSectionDragId, categories]);

  return (
    <div>
      {/* KPI row */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MiniKpi
          icon={<Target className="h-5 w-5 text-text-secondary" />}
          label="Today's Progress"
          value={`${completedActivities} / ${totalActivities}`}
        />
        <MiniKpi
          icon={<Flame className="h-5 w-5 text-amber-500" />}
          label="Points Today"
          value={`${earnedPoints} / ${totalPoints}`}
        />
        <MiniKpi
          icon={<Clock className="h-5 w-5 text-text-secondary" />}
          label="Current Streak"
          value="0 days"
        />
        <MiniKpi
          icon={<CheckCircle2 className="h-5 w-5 text-emerald-500" />}
          label="Keep going"
          value="Time to make money."
        />
      </div>

      {/* Progress bar */}
      <div className="mt-5 flex items-center gap-3">
        <span className="text-xs font-medium text-text-secondary">Today</span>
        <div className="flex-1">
          <div className="h-2 overflow-hidden rounded-full bg-gray-100">
            <div
              className="h-full rounded-full bg-accent transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
        <span className="text-xs font-medium text-text-secondary">
          {pct}% complete
        </span>
      </div>

      {/* Activity sections */}
      <div className="mt-6 space-y-4">
        {prioritiesCat ? (
          <PlaybookPinnedPrioritiesRow
            cat={prioritiesCat}
            isOpen={!collapsed[PLAYBOOK_PRIORITIES_SECTION_ID]}
            catEarned={
              playbookCategoryPoints(prioritiesCat, completions).catEarned
            }
            catTotal={
              playbookCategoryPoints(prioritiesCat, completions).catTotal
            }
            completions={completions}
            onToggleCollapse={toggleCollapse}
            editingActivity={editingActivity}
            editFields={editFields}
            setEditFields={setEditFields}
            onStartEditActivity={startEditActivity}
            onConfirmEditActivity={confirmEditActivity}
            onCancelEditActivity={() => setEditingActivity(null)}
            onDeleteActivity={deleteActivity}
            onIncrement={increment}
            onDecrement={decrement}
            onTogglePriorityActivity={togglePriorityActivity}
            ownerCategoryId={(id) => activityOwnerCategoryId(categories, id)}
            onReorderPriorityActivities={reorderPriorityActivities}
          />
        ) : null}
        <DndContext
          id="playbook-sections"
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragCancel={() => setActiveSectionDragId(null)}
        >
          <SortableContext
            items={categories.map((c) => c.id)}
            strategy={verticalListSortingStrategy}
          >
            {categories.map((cat) => {
              const { catEarned, catTotal } = playbookCategoryPoints(
                cat,
                completions,
                priorityIdSet
              );
              const isOpen = !collapsed[cat.id];

              return (
                <PlaybookCategoryRow
                  key={cat.id}
                  cat={cat}
                  isOpen={isOpen}
                  catEarned={catEarned}
                  catTotal={catTotal}
                  completions={completions}
                  editingSectionId={editingSectionId}
                  sectionNameDraft={sectionNameDraft}
                  setSectionNameDraft={setSectionNameDraft}
                  onConfirmEditSection={confirmEditSection}
                  onCancelEditSection={cancelEditSection}
                  onStartEditSection={startEditSection}
                  onDeleteSection={deleteSection}
                  onToggleCollapse={toggleCollapse}
                  editingActivity={editingActivity}
                  editFields={editFields}
                  setEditFields={setEditFields}
                  onStartEditActivity={startEditActivity}
                  onConfirmEditActivity={confirmEditActivity}
                  onCancelEditActivity={() => setEditingActivity(null)}
                  onDeleteActivity={deleteActivity}
                  onAddActivity={addActivity}
                  onIncrement={increment}
                  onDecrement={decrement}
                  iconPickerForCategoryId={iconPickerForCategoryId}
                  onToggleIconPicker={(catId) =>
                    setIconPickerForCategoryId((p) =>
                      p === catId ? null : catId
                    )
                  }
                  onPickSectionIcon={(catId, iconKey) => {
                    setCategories((prev) =>
                      prev.map((c) =>
                        c.id === catId ? { ...c, icon: iconKey } : c
                      )
                    );
                  }}
                  onPickSectionColor={(catId, color) => {
                    setCategories((prev) =>
                      prev.map((c) =>
                        c.id === catId ? { ...c, color } : c
                      )
                    );
                  }}
                  priorityIdSet={priorityIdSet}
                  onTogglePriorityActivity={togglePriorityActivity}
                  onReorderActivitiesInSection={reorderActivitiesInSection}
                />
              );
            })}
          </SortableContext>
          <DragOverlay dropAnimation={null}>
            {activeDragCategory ? (
              <PlaybookSectionDragPreview
                cat={activeDragCategory}
                completions={completions}
              />
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>

      <button
        type="button"
        onClick={addSection}
        className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-2xl border border-dashed border-border py-3 text-sm font-medium text-text-secondary hover:border-accent hover:text-accent"
      >
        <Plus className="h-4 w-4" /> Add New Section
      </button>
    </div>
  );
}

/** Ring + fraction for playbook activity progress (matches CRM playbook visual). */
function ActivityProgressRing({
  completed,
  target,
}: {
  completed: number;
  target: number;
}) {
  const size = 44;
  const stroke = 3;
  const r = (size - stroke) / 2 - 1;
  const c = 2 * Math.PI * r;
  const safeTarget = Math.max(1, target);
  const pct = Math.min(Math.max(completed / safeTarget, 0), 1);
  const dashOffset = c * (1 - pct);

  return (
    <div
      className="relative h-11 w-11 shrink-0"
      aria-hidden
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="absolute inset-0 -rotate-90"
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          className="stroke-gray-200 dark:stroke-zinc-700"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          className="stroke-[var(--color-accent-warm)] transition-[stroke-dashoffset] duration-300 ease-out"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={dashOffset}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center px-0.5">
        <span className="text-center text-[10px] font-bold leading-tight tabular-nums text-text-primary">
          {completed}/{target}
        </span>
      </div>
    </div>
  );
}

type PlaybookActivityDragHandle = {
  attributes: DraggableAttributes;
  listeners: DraggableSyntheticListeners;
};

function SortablePlaybookActivityRow({
  sortableId,
  sortableDisabled,
  children,
}: {
  sortableId: string;
  sortableDisabled: boolean;
  children: (handle: PlaybookActivityDragHandle) => ReactNode;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: sortableId, disabled: sortableDisabled });
  const sortStyle = {
    transform: CSS.Transform.toString(transform),
    transition,
    ...(isDragging ? { opacity: 0.55 } : {}),
  };
  return (
    <div ref={setNodeRef} style={sortStyle}>
      {children({ attributes, listeners })}
    </div>
  );
}

function ActivityRow({
  activity,
  listIndex,
  completed,
  isEditing,
  editFields,
  onEditFieldsChange,
  onStartEdit,
  onConfirmEdit,
  onCancelEdit,
  onDelete,
  onIncrement,
  onDecrement,
  isPriority,
  onTogglePriority,
  dragHandle,
}: {
  activity: PlaybookActivity;
  /** 1-based position in the section (not the internal id — those can be long timestamps). */
  listIndex: number;
  completed: number;
  isEditing: boolean;
  editFields: { title: string; points: number; target: number; timeEstimate: string };
  onEditFieldsChange: (f: { title: string; points: number; target: number; timeEstimate: string }) => void;
  onStartEdit: () => void;
  onConfirmEdit: () => void;
  onCancelEdit: () => void;
  onDelete: () => void;
  onIncrement: () => void;
  onDecrement: () => void;
  isPriority: boolean;
  onTogglePriority: () => void;
  dragHandle?: PlaybookActivityDragHandle | null;
}) {
  const isDone = completed >= activity.target;
  const capped = Math.min(completed, activity.target);
  const maxPts = activity.target * activity.points;
  const earnedPts = capped * activity.points;

  if (isEditing) {
    return (
      <div className="flex flex-col gap-2 border-b border-border bg-surface/30 px-5 py-3 last:border-b-0">
        <input
          autoFocus
          value={editFields.title}
          onChange={(e) => onEditFieldsChange({ ...editFields, title: e.target.value })}
          onKeyDown={(e) => { if (e.key === "Enter") onConfirmEdit(); if (e.key === "Escape") onCancelEdit(); }}
          className="w-full rounded-lg border border-border px-2.5 py-1.5 text-sm focus:border-accent focus:outline-none"
          placeholder="Activity name"
        />
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1 text-xs text-text-secondary">
            Points
            <input
              type="number"
              min="1"
              value={editFields.points}
              onChange={(e) => onEditFieldsChange({ ...editFields, points: Number(e.target.value) })}
              className="w-14 rounded-lg border border-border px-2 py-1 text-xs focus:border-accent focus:outline-none"
            />
          </label>
          <label className="flex items-center gap-1 text-xs text-text-secondary">
            Target
            <input
              type="number"
              min="1"
              value={editFields.target}
              onChange={(e) => onEditFieldsChange({ ...editFields, target: Number(e.target.value) })}
              className="w-14 rounded-lg border border-border px-2 py-1 text-xs focus:border-accent focus:outline-none"
            />
          </label>
          <label className="flex items-center gap-1 text-xs text-text-secondary">
            Time
            <input
              value={editFields.timeEstimate}
              onChange={(e) => onEditFieldsChange({ ...editFields, timeEstimate: e.target.value })}
              className="w-20 rounded-lg border border-border px-2 py-1 text-xs focus:border-accent focus:outline-none"
              placeholder="e.g. 5 min"
            />
          </label>
          <div className="ml-auto flex items-center gap-1">
            <button type="button" onClick={onConfirmEdit} className="flex h-7 w-7 items-center justify-center rounded-full text-emerald-500 hover:bg-emerald-50">
              <CheckCircle2 className="h-4 w-4" />
            </button>
            <button type="button" onClick={onCancelEdit} className="rounded px-2 py-1 text-xs text-text-secondary hover:text-text-primary">
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="group flex items-center gap-3 border-b border-border px-5 py-3 last:border-b-0"
      role="listitem"
      aria-label={`Activity ${listIndex}: ${activity.title}, ${completed} of ${activity.target} done`}
    >
      {dragHandle ? (
        <button
          type="button"
          className="shrink-0 cursor-grab touch-none rounded-lg p-1 text-text-secondary/50 hover:bg-surface hover:text-text-secondary/80 active:cursor-grabbing"
          aria-label="Reorder activity"
          {...dragHandle.attributes}
          {...dragHandle.listeners}
        >
          <GripVertical className="h-4 w-4" />
        </button>
      ) : (
        <div className="w-7 shrink-0" aria-hidden />
      )}
      <ActivityProgressRing completed={completed} target={activity.target} />
      <div className="min-w-0 flex-1">
        <p
          className={`text-sm ${
            isDone
              ? "text-text-secondary line-through"
              : "text-text-primary"
          }`}
        >
          {activity.title}
        </p>
        <p className="text-xs text-text-secondary/60">
          +{activity.points} pts each · {earnedPts}/{maxPts} pts ·{" "}
          {activity.timeEstimate}
        </p>
      </div>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={onTogglePriority}
          title={isPriority ? "Remove from priorities" : "Add to priorities"}
          aria-label={
            isPriority ? "Remove from priorities" : "Add to priorities"
          }
          className={`rounded p-1 transition-colors group-hover:text-text-secondary/40 ${
            isPriority
              ? "text-accent-warm group-hover:text-accent-warm"
              : "text-text-secondary/0 group-hover:text-text-secondary/40"
          }`}
        >
          <Star
            className={`h-3.5 w-3.5 ${isPriority ? "fill-accent-warm text-accent-warm" : ""}`}
            strokeWidth={2}
            aria-hidden
          />
        </button>
        <button
          type="button"
          onClick={onStartEdit}
          className="rounded p-1 text-text-secondary/0 transition-colors group-hover:text-text-secondary/40 group-hover:hover:text-accent"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="rounded p-1 text-text-secondary/0 transition-colors group-hover:text-text-secondary/40 group-hover:hover:text-red-500"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
        <div className="ml-1 flex items-stretch rounded-lg border border-border bg-white">
          <button
            type="button"
            onClick={onDecrement}
            disabled={completed <= 0}
            aria-label="Decrease progress"
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-l-md border-r border-border text-text-secondary transition-colors hover:bg-gray-50 disabled:pointer-events-none disabled:opacity-40"
          >
            <Minus className="h-2.5 w-2.5 stroke-[2.25]" aria-hidden />
          </button>
          <span className="flex min-w-[1.75rem] items-center justify-center px-0.5 text-xs font-semibold tabular-nums text-text-primary">
            {completed}
          </span>
          <button
            type="button"
            onClick={onIncrement}
            disabled={isDone}
            aria-label={isDone ? "Target reached" : "Increase progress"}
            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-r-md border-l transition-colors disabled:pointer-events-none ${
              isDone
                ? "border-emerald-300 bg-emerald-50"
                : "border-accent/35 bg-accent/5 text-accent hover:bg-accent/10"
            }`}
          >
            {isDone ? (
              <CheckCircle2
                className="h-3 w-3 text-emerald-600"
                strokeWidth={2.5}
                aria-hidden
              />
            ) : (
              <Plus className="h-2.5 w-2.5 stroke-[2.25] text-accent" aria-hidden />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Agenda Tab ──────────────────────────────────────────────────────────────

interface AgendaEntry {
  id: string;
  text: string;
  done: boolean;
}

const AGENDA_STORAGE_KEY = "crm-agenda";

function loadAgenda(): Record<string, AgendaEntry[]> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(AGENDA_STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}

function persistAgenda(data: Record<string, AgendaEntry[]>) {
  if (typeof window === "undefined") return;
  localStorage.setItem(AGENDA_STORAGE_KEY, JSON.stringify(data));
}

function carryForward(
  all: Record<string, AgendaEntry[]>,
  todayKey: string
): Record<string, AgendaEntry[]> {
  const updated = { ...all };
  const existingIds = new Set((updated[todayKey] ?? []).map((e) => e.id));

  const pastKeys = Object.keys(updated)
    .filter((k) => k < todayKey)
    .sort();

  for (const key of pastKeys) {
    const incomplete = updated[key].filter((e) => !e.done);
    if (incomplete.length === 0) continue;
    const toMove = incomplete.filter((e) => !existingIds.has(e.id));
    if (toMove.length > 0) {
      updated[todayKey] = [...(updated[todayKey] ?? []), ...toMove];
      toMove.forEach((e) => existingIds.add(e.id));
    }
    updated[key] = updated[key].filter((e) => e.done);
  }
  return updated;
}

function AgendaTab({ date }: { date: Date }) {
  const dateKey = date.toISOString().slice(0, 10);
  const [entriesByDate, setEntriesByDate] = useState<Record<string, AgendaEntry[]>>(() => {
    const raw = loadAgenda();
    const today = new Date().toISOString().slice(0, 10);
    return carryForward(raw, today);
  });
  const [draft, setDraft] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

  const entries = entriesByDate[dateKey] ?? [];

  function update(next: Record<string, AgendaEntry[]>) {
    setEntriesByDate(next);
    persistAgenda(next);
  }

  function addEntry() {
    if (!draft.trim()) return;
    const entry: AgendaEntry = {
      id: `ae-${Date.now()}`,
      text: draft.trim(),
      done: false,
    };
    update({
      ...entriesByDate,
      [dateKey]: [...entries, entry],
    });
    setDraft("");
  }

  function toggleDone(id: string) {
    update({
      ...entriesByDate,
      [dateKey]: entries.map((e) =>
        e.id === id ? { ...e, done: !e.done } : e
      ),
    });
  }

  function deleteEntry(id: string) {
    update({
      ...entriesByDate,
      [dateKey]: entries.filter((e) => e.id !== id),
    });
  }

  function startEdit(entry: AgendaEntry) {
    setEditingId(entry.id);
    setEditText(entry.text);
  }

  function commitEdit() {
    if (editingId === null) return;
    const trimmed = editText.trim();
    if (trimmed) {
      update({
        ...entriesByDate,
        [dateKey]: entries.map((e) =>
          e.id === editingId ? { ...e, text: trimmed } : e
        ),
      });
    }
    setEditingId(null);
    setEditText("");
  }

  function handleDragStart(idx: number) {
    setDragIdx(idx);
  }

  function handleDragOver(e: React.DragEvent, idx: number) {
    e.preventDefault();
    setDragOverIdx(idx);
  }

  function handleDrop(idx: number) {
    if (dragIdx === null || dragIdx === idx) {
      setDragIdx(null);
      setDragOverIdx(null);
      return;
    }
    const reordered = [...entries];
    const [moved] = reordered.splice(dragIdx, 1);
    reordered.splice(idx, 0, moved);
    update({ ...entriesByDate, [dateKey]: reordered });
    setDragIdx(null);
    setDragOverIdx(null);
  }

  function handleDragEnd() {
    setDragIdx(null);
    setDragOverIdx(null);
  }

  const completed = entries.filter((e) => e.done).length;
  const dayLabel = date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  const LINE_HEIGHT = 44;

  return (
    <div
      className="relative overflow-hidden rounded-2xl border border-amber-200/60 shadow-sm"
      style={{
        background:
          "linear-gradient(to bottom, #fefce8 0%, #fef9c3 6%, #fefce8 12%, #fffef5 100%)",
      }}
    >
      {/* Spiral binding dots */}
      <div className="absolute left-7 top-0 bottom-0 w-px bg-rose-300/40" />
      <div className="absolute left-[30px] top-0 bottom-0 w-px bg-rose-300/25" />

      <div className="relative px-12 pt-6 pb-4">
        {/* Date header */}
        <p
          className="text-2xl text-amber-800/80"
          style={{ fontFamily: "var(--font-caveat), cursive" }}
        >
          {dayLabel}
        </p>
        {entries.length > 0 && (
          <p
            className="mt-0.5 text-sm text-amber-700/50"
            style={{ fontFamily: "var(--font-caveat), cursive" }}
          >
            {completed}/{entries.length} completed
          </p>
        )}

        {/* Ruled lines + entries */}
        <div className="mt-4">
          {entries.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-12 text-center">
              <p
                className="text-xl text-amber-800/40"
                style={{ fontFamily: "var(--font-caveat), cursive" }}
              >
                Nothing on the agenda yet...
              </p>
              <p
                className="text-base text-amber-700/30"
                style={{ fontFamily: "var(--font-caveat), cursive" }}
              >
                Write something below to get started
              </p>
            </div>
          ) : (
            <div className="space-y-0">
              {entries.map((entry, idx) => (
                <div
                  key={entry.id}
                  draggable
                  onDragStart={() => handleDragStart(idx)}
                  onDragOver={(e) => handleDragOver(e, idx)}
                  onDrop={() => handleDrop(idx)}
                  onDragEnd={handleDragEnd}
                  className={`group flex items-center gap-3 border-b border-amber-200/40 transition-colors ${
                    dragOverIdx === idx && dragIdx !== idx
                      ? "bg-amber-100/50"
                      : ""
                  } ${dragIdx === idx ? "opacity-40" : ""}`}
                  style={{ height: LINE_HEIGHT, cursor: "grab" }}
                >
                  {/* Number */}
                  <span
                    className="w-5 shrink-0 text-right text-sm text-amber-700/30"
                    style={{ fontFamily: "var(--font-caveat), cursive" }}
                  >
                    {idx + 1}
                  </span>

                  {/* Completion circle */}
                  <button
                    type="button"
                    onClick={() => toggleDone(entry.id)}
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                      entry.done
                        ? "border-emerald-400 bg-emerald-400 text-white"
                        : "border-amber-300/60 hover:border-emerald-400"
                    }`}
                  >
                    {entry.done && (
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    )}
                  </button>

                  {/* Text / inline edit */}
                  {editingId === entry.id ? (
                    <input
                      autoFocus
                      type="text"
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") commitEdit();
                        if (e.key === "Escape") { setEditingId(null); setEditText(""); }
                      }}
                      onBlur={commitEdit}
                      className="flex-1 bg-transparent text-lg font-semibold text-amber-900/80 outline-none"
                      style={{ fontFamily: "var(--font-caveat), cursive" }}
                    />
                  ) : (
                    <span
                      className={`flex-1 text-lg font-semibold ${
                        entry.done
                          ? "text-amber-700/30 line-through"
                          : "text-amber-900/80"
                      }`}
                      style={{ fontFamily: "var(--font-caveat), cursive" }}
                    >
                      {entry.text}
                    </span>
                  )}

                  {/* Edit */}
                  <button
                    type="button"
                    onClick={() => startEdit(entry)}
                    className="rounded p-1 text-amber-400/0 transition-colors group-hover:text-amber-400 group-hover:hover:text-amber-600"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>

                  {/* Delete */}
                  <button
                    type="button"
                    onClick={() => deleteEntry(entry.id)}
                    className="rounded p-1 text-amber-400/0 transition-colors group-hover:text-amber-400 group-hover:hover:text-red-400"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>

                  {/* Drag handle */}
                  <span className="cursor-grab text-amber-300/0 transition-colors group-hover:text-amber-400">
                    <MoreHorizontal className="h-4 w-4" />
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Input row — looks like the next ruled line */}
          <div
            className="flex items-center gap-3 border-b border-amber-200/40"
            style={{ height: LINE_HEIGHT }}
          >
            <span
              className="w-5 shrink-0 text-right text-sm text-amber-700/20"
              style={{ fontFamily: "var(--font-caveat), cursive" }}
            >
              {entries.length + 1}
            </span>
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 border-dashed border-amber-200/50" />
            <input
              type="text"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addEntry()}
              placeholder="Write something…"
              className="flex-1 bg-transparent text-lg text-amber-900/80 outline-none placeholder:text-amber-600/25"
              style={{ fontFamily: "var(--font-caveat), cursive" }}
            />
          </div>

          {/* Extra ruled lines for notebook feel */}
          {Array.from({ length: Math.max(0, 4 - entries.length) }).map((_, i) => (
            <div
              key={i}
              className="border-b border-amber-200/30"
              style={{ height: LINE_HEIGHT }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Tasks Tab ───────────────────────────────────────────────────────────────

type TaskFilter =
  | "active"
  | ProspectingTaskStatus
  | ProspectingTaskType;

const STATUS_FILTERS: TaskFilter[] = [
  "active",
  "pending",
  "in_progress",
  "completed",
  "skipped",
];
const TYPE_FILTERS: ProspectingTaskType[] = [
  "follow_up",
  "call",
  "email",
  "text",
  "appointment",
  "other",
];

const FILTER_LABELS: Record<string, string> = {
  active: "Active",
  pending: "Pending",
  in_progress: "In Progress",
  completed: "Completed",
  skipped: "Skipped",
  ...PROSPECTING_TASK_TYPE_LABELS,
};

function TasksTab({ today }: { today: Date }) {
  const [localTasks, setLocalTasks] = useState<ProspectingTask[]>(prospectingTasks);
  const [filter, setFilter] = useState<TaskFilter>("active");
  const [search, setSearch] = useState("");
  const [addModalOpen, setAddModalOpen] = useState(false);

  const counts = useMemo(() => {
    const pending = localTasks.filter((t) => t.status === "pending").length;
    const inProgress = localTasks.filter(
      (t) => t.status === "in_progress"
    ).length;
    const completed = localTasks.filter(
      (t) => t.status === "completed"
    ).length;
    const overdue = localTasks.filter(
      (t) =>
        t.status !== "completed" &&
        t.status !== "skipped" &&
        daysBetween(t.dueDate, today) > 0
    ).length;
    return { pending, inProgress, completed, overdue };
  }, [localTasks, today]);

  const filtered = useMemo(() => {
    let list = localTasks;

    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          t.linkedLead?.toLowerCase().includes(q)
      );
    }

    if (filter === "active") {
      list = list.filter(
        (t) => t.status !== "completed" && t.status !== "skipped"
      );
    } else if (STATUS_FILTERS.includes(filter)) {
      list = list.filter((t) => t.status === filter);
    } else {
      list = list.filter((t) => t.type === filter);
    }

    return list;
  }, [localTasks, filter, search, today]);

  const overdueTasks = filtered.filter(
    (t) =>
      t.status !== "completed" &&
      t.status !== "skipped" &&
      daysBetween(t.dueDate, today) > 0
  );
  const upcomingTasks = filtered.filter(
    (t) => !overdueTasks.includes(t)
  );

  function toggleComplete(id: string) {
    setLocalTasks((prev) =>
      prev.map((t) =>
        t.id === id
          ? {
              ...t,
              status:
                t.status === "completed"
                  ? "pending"
                  : "completed",
            }
          : t
      )
    );
  }

  function addTask(task: ProspectingTask) {
    setLocalTasks((prev) => [task, ...prev]);
    setAddModalOpen(false);
  }

  return (
    <div>
      {/* Header row */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-text-secondary">
          Manage your follow-ups, calls, emails, and activities
        </p>
        <button
          type="button"
          onClick={() => setAddModalOpen(true)}
          className="rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-accent-hover"
        >
          + Add Task
        </button>
      </div>

      {/* KPI row */}
      <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <TaskKpi
          color="text-amber-500"
          label="Pending"
          value={counts.pending}
        />
        <TaskKpi
          color="text-blue-500"
          label="In Progress"
          value={counts.inProgress}
        />
        <TaskKpi
          color="text-emerald-500"
          label="Completed"
          value={counts.completed}
        />
        <TaskKpi
          color="text-red-500"
          label="Overdue"
          value={counts.overdue}
        />
      </div>

      {/* Search + filters */}
      <div className="mt-5 flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary/50" />
          <input
            type="text"
            placeholder="Search tasks or opportunities…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-48 rounded-lg border border-border bg-white py-1.5 pl-8 pr-3 text-sm text-text-primary outline-none focus:border-accent focus:ring-2 focus:ring-accent/15"
          />
        </div>
        {[...STATUS_FILTERS, ...TYPE_FILTERS].map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              filter === f
                ? "bg-accent text-white"
                : "bg-surface text-text-secondary hover:text-text-primary"
            }`}
          >
            {FILTER_LABELS[f]}
          </button>
        ))}
      </div>

      {/* Task lists */}
      <div className="mt-6 space-y-6">
        {overdueTasks.length > 0 && (
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-red-600">
              Overdue ({overdueTasks.length})
            </h3>
            <div className="mt-2 space-y-2">
              {overdueTasks.map((t) => (
                <TaskRow
                  key={t.id}
                  task={t}
                  today={today}
                  overdue
                  onToggle={() => toggleComplete(t.id)}
                />
              ))}
            </div>
          </div>
        )}

        {upcomingTasks.length > 0 && (
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-text-secondary">
              {filter === "completed" ? "Completed" : "Upcoming"} ({upcomingTasks.length})
            </h3>
            <div className="mt-2 space-y-2">
              {upcomingTasks.map((t) => (
                <TaskRow
                  key={t.id}
                  task={t}
                  today={today}
                  onToggle={() => toggleComplete(t.id)}
                />
              ))}
            </div>
          </div>
        )}

        {overdueTasks.length === 0 && upcomingTasks.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border bg-white py-16 text-center text-sm text-text-secondary">
            No tasks match your filters.
          </div>
        )}
      </div>

      {addModalOpen && (
        <AddTaskModal
          onClose={() => setAddModalOpen(false)}
          onAdd={addTask}
        />
      )}
    </div>
  );
}

function TaskRow({
  task,
  today,
  overdue,
  onToggle,
}: {
  task: ProspectingTask;
  today: Date;
  overdue?: boolean;
  onToggle: () => void;
}) {
  const diff = daysBetween(task.dueDate, today);
  const isCompleted = task.status === "completed";

  return (
    <div
      className={`flex items-center gap-3 rounded-xl border px-4 py-3 ${
        overdue
          ? "border-red-200 bg-red-50/60"
          : "border-border bg-white"
      }`}
    >
      <button type="button" onClick={onToggle} className="shrink-0">
        {isCompleted ? (
          <CheckCircle2 className="h-5 w-5 text-emerald-500" />
        ) : (
          <Circle className="h-5 w-5 text-text-secondary/30" />
        )}
      </button>
      <span className="text-text-secondary/60">
        {TASK_TYPE_ICONS[task.type]}
      </span>
      <div className="flex-1">
        <p
          className={`text-sm ${
            isCompleted
              ? "text-text-secondary line-through"
              : "font-medium text-text-primary"
          }`}
        >
          {task.title}
        </p>
        <div className="mt-0.5 flex flex-wrap items-center gap-2">
          {task.linkedLead && (
            <span className="rounded-full bg-accent/10 px-2 py-0.5 text-[11px] font-medium text-accent">
              {task.linkedLead}
            </span>
          )}
          {overdue && diff > 0 && (
            <span className="rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-medium text-red-700">
              Overdue by {diff} day{diff > 1 ? "s" : ""}
            </span>
          )}
        </div>
      </div>
      <span className="text-xs text-text-secondary">
        {new Date(task.dueDate).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        })}
      </span>
    </div>
  );
}

function TaskKpi({
  color,
  label,
  value,
}: {
  color: string;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-xl border border-border bg-white px-4 py-3 shadow-sm">
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      <p className="text-xs text-text-secondary">{label}</p>
    </div>
  );
}

function MiniKpi({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-white px-4 py-3 shadow-sm">
      {icon}
      <div>
        <p className="text-xs text-text-secondary">{label}</p>
        <p className="text-sm font-semibold text-text-primary">{value}</p>
      </div>
    </div>
  );
}

// ── Add Task Modal ──────────────────────────────────────────────────────────

function AddTaskModal({
  onClose,
  onAdd,
}: {
  onClose: () => void;
  onAdd: (task: ProspectingTask) => void;
}) {
  const inputClass =
    "w-full rounded-xl border border-border bg-white px-3 py-2.5 text-sm text-text-primary outline-none focus:border-accent focus:ring-2 focus:ring-accent/15";

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    onAdd({
      id: `pt-${Date.now()}`,
      title: (fd.get("title") as string) || "Untitled Task",
      type: (fd.get("type") as ProspectingTaskType) || "other",
      status: "pending",
      dueDate: (fd.get("dueDate") as string) || new Date().toISOString().slice(0, 10),
      linkedLead: (fd.get("linkedLead") as string) || undefined,
    });
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/40 p-4 sm:items-center"
      onClick={onClose}
      onKeyDown={(e) => e.key === "Escape" && onClose()}
      role="presentation"
    >
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-border bg-white p-6 shadow-xl"
        role="dialog"
        onClick={(e) => e.stopPropagation()}
        aria-modal="true"
        aria-labelledby="add-task-title"
      >
        <h2
          id="add-task-title"
          className="text-sm font-bold uppercase tracking-wider text-text-secondary"
        >
          New Task
        </h2>

        <form onSubmit={onSubmit} className="mt-5 space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-text-primary">
              Title
            </label>
            <input name="title" type="text" required className={inputClass} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-text-primary">
                Type
              </label>
              <select name="type" className={inputClass}>
                {TYPE_FILTERS.map((t) => (
                  <option key={t} value={t}>
                    {PROSPECTING_TASK_TYPE_LABELS[t]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-text-primary">
                Due Date
              </label>
              <input name="dueDate" type="date" className={inputClass} />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-text-primary">
              Linked opportunity / company
            </label>
            <input
              name="linkedLead"
              type="text"
              placeholder="e.g. Orbital AI"
              className={inputClass}
            />
          </div>
          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              className="rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-white hover:bg-accent-hover"
            >
              Add task
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-text-primary hover:bg-surface"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
