"use client";

import { useState, useEffect, useMemo } from "react";
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
  Target,
  DollarSign,
  Pencil,
  Trash2,
  BookOpen,
  CalendarDays,
  ListTodo,
} from "lucide-react";
import IconTabBar from "@/components/crm/prospecting/IconTabBar";
import {
  playbookCategories,
  monthlyGoals,
  deals,
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
  getCompletions,
  saveCompletions,
  loadPlaybookCategories,
  savePlaybookCategories,
} from "@/lib/crm/playbook-store";
import {
  fetchUserProspectingPlaybook,
  upsertUserProspectingPlaybook,
} from "@/lib/crm/playbook-remote";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";

// ── Shared helpers ──────────────────────────────────────────────────────────

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  phone: <Phone className="h-4 w-4" />,
  "pen-line": <PenLine className="h-4 w-4" />,
  megaphone: <Megaphone className="h-4 w-4" />,
  handshake: <Handshake className="h-4 w-4" />,
  gift: <Gift className="h-4 w-4" />,
  search: <Search className="h-4 w-4" />,
};

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

type ActiveTab = "playbook" | "agenda" | "tasks";

const TABS = [
  { id: "playbook", label: "Playbook", icon: BookOpen },
  { id: "agenda", label: "Agenda", icon: CalendarDays },
  { id: "tasks", label: "Tasks", icon: ListTodo },
];

function getMonthlyDealsMetrics() {
  const now = new Date();
  const month = now.getMonth();
  const year = now.getFullYear();
  const wonThisMonth = deals.filter((d) => {
    if (d.stage !== "closed_won") return false;
    const close = new Date(d.expectedClose);
    return close.getMonth() === month && close.getFullYear() === year;
  });
  return {
    wonCount: wonThisMonth.length,
    wonRevenue: wonThisMonth.reduce((s, d) => s + d.value, 0),
  };
}

export default function ColdOutreachView() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("playbook");
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [goals, setGoals] = useState<MonthlyGoal[]>(monthlyGoals);

  const { wonCount, wonRevenue } = getMonthlyDealsMetrics();
  const goalsWithActuals = useMemo(
    () =>
      goals.map((g) => {
        if (g.id === "mg-1") return { ...g, current: wonCount };
        if (g.id === "mg-2") return { ...g, current: wonRevenue };
        return g;
      }),
    [goals, wonCount, wonRevenue]
  );

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

      {/* Monthly Goals */}
      <MonthlyGoalsCard goals={goalsWithActuals} onChange={setGoals} />

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
        {activeTab === "agenda" && (
          <AgendaTab date={currentDate} />
        )}
        {activeTab === "tasks" && <TasksTab today={currentDate} />}
      </div>
    </div>
  );
}

// ── Monthly Goals Card ──────────────────────────────────────────────────────

function MonthlyGoalsCard({
  goals,
  onChange,
}: {
  goals: MonthlyGoal[];
  onChange: (goals: MonthlyGoal[]) => void;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState(0);

  function startEdit(g: MonthlyGoal) {
    setEditingId(g.id);
    setEditValue(g.unit === "currency" ? g.target : g.target);
  }

  function confirmEdit(g: MonthlyGoal) {
    const val = Math.max(1, editValue);
    onChange(goals.map((goal) => (goal.id === g.id ? { ...goal, target: val } : goal)));
    setEditingId(null);
  }

  function addGoal() {
    onChange([
      ...goals,
      {
        id: `mg-${Date.now()}`,
        title: "New Goal",
        current: 0,
        target: 10,
        unit: "count",
        icon: "handshake",
      },
    ]);
  }

  const now = new Date();
  const monthLabel = now.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  return (
    <div className="mt-6 rounded-2xl border border-border bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-text-secondary/60">
          Monthly Goals
        </p>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1 text-xs font-medium text-text-primary">
            <Calendar className="h-3 w-3 text-accent" />
            {monthLabel}
          </span>
        </div>
      </div>
      <div className="mt-4 space-y-5">
        {goals.map((g) => {
          const pct = Math.min(
            (g.current / Math.max(g.target, 1)) * 100,
            100
          );
          const GoalIcon =
            g.icon === "handshake" ? Handshake : DollarSign;
          const isEditing = editingId === g.id;

          return (
            <div key={g.id}>
              {/* Header row */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <GoalIcon className="h-4 w-4 text-text-secondary" />
                  <span className="text-sm font-medium text-text-primary">
                    {g.title}
                  </span>
                </div>

                {isEditing ? (
                  <div className="flex items-center gap-1.5">
                    {g.unit === "currency" && (
                      <span className="text-sm text-text-secondary">$</span>
                    )}
                    <input
                      type="number"
                      min="1"
                      value={editValue}
                      onChange={(e) => setEditValue(Number(e.target.value))}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") confirmEdit(g);
                        if (e.key === "Escape") setEditingId(null);
                      }}
                      autoFocus
                      className="w-20 rounded-lg border border-accent bg-white px-2 py-1 text-right text-sm font-semibold text-text-primary outline-none ring-2 ring-accent/15"
                    />
                    <button
                      type="button"
                      onClick={() => confirmEdit(g)}
                      className="flex h-7 w-7 items-center justify-center rounded-full text-emerald-500 hover:bg-emerald-50"
                    >
                      <CheckCircle2 className="h-5 w-5" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-semibold text-text-primary">
                      {g.unit === "currency"
                        ? `${g.current} / ${g.target}`
                        : `${g.current} / ${g.target}`}
                    </span>
                    <button
                      type="button"
                      onClick={() => startEdit(g)}
                      className="rounded p-0.5 text-text-secondary/40 transition-colors hover:text-accent"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onChange(goals.filter((x) => x.id !== g.id))}
                      className="rounded p-0.5 text-text-secondary/40 transition-colors hover:text-red-500"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </div>

              {/* Progress visualization */}
              {g.unit === "count" ? (
                <div className="mt-2 flex items-center gap-1.5">
                  {Array.from({ length: g.target }).map((_, i) => (
                    <span
                      key={i}
                      className={`h-2.5 w-2.5 rounded-full ${
                        i < g.current
                          ? "bg-emerald-500"
                          : "bg-gray-200"
                      }`}
                    />
                  ))}
                </div>
              ) : (
                <div className="mt-2">
                  <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                    <div
                      className="h-full rounded-full bg-amber-400 transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <p className="mt-1 text-right text-xs text-text-secondary">
                    {formatCurrency(g.current)} earned
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <button
        type="button"
        onClick={addGoal}
        className="mt-4 flex w-full items-center justify-center gap-1 rounded-xl border border-dashed border-border py-2 text-xs font-medium text-text-secondary hover:border-accent hover:text-accent"
      >
        <Plus className="h-3 w-3" /> Add Goal
      </button>
    </div>
  );
}

// ── Playbook Tab ────────────────────────────────────────────────────────────

function PlaybookTab() {
  const [completions, setCompletions] = useState<Record<string, number>>({});
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [categories, setCategories] = useState<PlaybookCategory[]>(playbookCategories);
  const [playbookReady, setPlaybookReady] = useState(false);
  const [playbookUserId, setPlaybookUserId] = useState<string | null>(null);
  const [editingActivity, setEditingActivity] = useState<string | null>(null);
  const [editFields, setEditFields] = useState({ title: "", points: 0, target: 0, timeEstimate: "" });
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [sectionNameDraft, setSectionNameDraft] = useState("");

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      const loaded = loadPlaybookCategories();
      if (loaded !== null) setCategories(loaded);
      setCompletions(getCompletions());
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
          setCategories(lsCats);
          setCompletions(lsCompletions);
          await upsertUserProspectingPlaybook(
            supabase,
            user.id,
            lsCats,
            lsCompletions
          );
        } else {
          setCategories([]);
          setCompletions({});
        }
      } else {
        const { categories: dbCats, completions: dbComp } = result;
        if (dbCats.length > 0) {
          setCategories(dbCats);
          setCompletions(dbComp);
        } else if (hasLocalData) {
          setCategories(lsCats);
          setCompletions(lsCompletions);
          await upsertUserProspectingPlaybook(
            supabase,
            user.id,
            lsCats,
            lsCompletions
          );
        } else {
          setCategories([]);
          setCompletions(dbComp);
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
          completions
        );
      } else {
        savePlaybookCategories(categories);
        saveCompletions(completions);
      }
    }, 450);
    return () => window.clearTimeout(t);
  }, [categories, completions, playbookReady, playbookUserId]);

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

  function deleteActivity(catId: string, activityId: string) {
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

  function toggleCollapse(catId: string) {
    setCollapsed((prev) => ({ ...prev, [catId]: !prev[catId] }));
  }

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
        {categories.map((cat) => {
          const catEarned = cat.activities.reduce((s, a) => {
            const done = completions[a.id] ?? 0;
            return s + (done >= a.target ? a.points : 0);
          }, 0);
          const catTotal = cat.activities.reduce((s, a) => s + a.points, 0);
          const isOpen = !collapsed[cat.id];

          return (
            <div
              key={cat.id}
              className="rounded-2xl border border-border bg-white shadow-sm"
            >
              {/* Section header */}
              <div className="group/sec flex items-center gap-3 px-5 py-4">
                <button
                  type="button"
                  onClick={() => toggleCollapse(cat.id)}
                  aria-expanded={isOpen}
                  aria-label={isOpen ? "Collapse section" : "Expand section"}
                  className="flex shrink-0 items-center gap-2 rounded-lg py-1 pl-0 pr-2 text-text-secondary transition-colors hover:bg-surface hover:text-text-primary"
                >
                  <span
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-white"
                    style={{ backgroundColor: cat.color }}
                  >
                    {CATEGORY_ICONS[cat.icon] ?? (
                      <Circle className="h-4 w-4" />
                    )}
                  </span>
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
                          if (e.key === "Enter") confirmEditSection();
                          if (e.key === "Escape") cancelEditSection();
                        }}
                        placeholder="Section name"
                        className="min-w-0 flex-1 rounded-lg border border-accent bg-white px-2.5 py-1.5 text-sm font-semibold text-text-primary outline-none ring-2 ring-accent/15"
                      />
                      <button
                        type="button"
                        onClick={confirmEditSection}
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-emerald-500 hover:bg-emerald-50"
                        aria-label="Save section name"
                      >
                        <CheckCircle2 className="h-5 w-5" />
                      </button>
                      <button
                        type="button"
                        onClick={cancelEditSection}
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
                        onClick={() => startEditSection(cat)}
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
                  onClick={() => deleteSection(cat.id)}
                  className="rounded p-1 text-text-secondary/40 transition-colors hover:text-red-500"
                  aria-label="Delete section"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* Activities */}
              {isOpen && (
                <div className="border-t border-border">
                  {cat.activities.map((activity, activityIndex) => (
                    <ActivityRow
                      key={activity.id}
                      activity={activity}
                      listIndex={activityIndex + 1}
                      completed={completions[activity.id] ?? 0}
                      isEditing={editingActivity === activity.id}
                      editFields={editFields}
                      onEditFieldsChange={setEditFields}
                      onStartEdit={() => startEditActivity(activity)}
                      onConfirmEdit={confirmEditActivity}
                      onCancelEdit={() => setEditingActivity(null)}
                      onDelete={() => deleteActivity(cat.id, activity.id)}
                      onIncrement={() =>
                        increment(activity.id, activity.target)
                      }
                    />
                  ))}
                  <div className="px-5 py-3">
                    <button
                      type="button"
                      onClick={() => addActivity(cat.id)}
                      className="flex items-center gap-1 text-xs font-medium text-text-secondary hover:text-accent"
                    >
                      <Plus className="h-3 w-3" /> Add Activity
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
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
}) {
  const isDone = completed >= activity.target;

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
    <div className="group flex items-center gap-3 border-b border-border px-5 py-3 last:border-b-0">
      <span className="w-6 shrink-0 text-center text-[11px] font-bold tabular-nums text-text-secondary/50">
        {listIndex}
      </span>
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
          {activity.points} pts each · {activity.timeEstimate}
        </p>
      </div>
      <div className="flex items-center gap-1.5">
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
        <span className="ml-1 text-xs tabular-nums text-text-secondary">
          {completed}
        </span>
        <button
          type="button"
          onClick={onIncrement}
          disabled={isDone}
          className={`flex h-7 w-7 items-center justify-center rounded-full border text-xs transition-colors ${
            isDone
              ? "border-emerald-300 bg-emerald-50 text-emerald-500"
              : "border-border bg-white text-text-secondary hover:border-accent hover:text-accent"
          }`}
        >
          {isDone ? "✓" : "+"}
        </button>
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

                  {/* Text */}
                  <span
                    className={`flex-1 text-lg ${
                      entry.done
                        ? "text-amber-700/30 line-through"
                        : "text-amber-900/80"
                    }`}
                    style={{ fontFamily: "var(--font-caveat), cursive" }}
                  >
                    {entry.text}
                  </span>

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
