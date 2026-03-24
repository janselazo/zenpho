"use client";

import { use, useCallback, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import {
  getMemberById,
  projectClientDisplayLabel,
  projectTeamDisplayName,
  PLAN_COLORS,
  PLAN_LABELS,
  TASK_STATUS_LABELS,
  TASK_STATUS_COLORS,
  type TaskStatus,
  type MockProject,
} from "@/lib/crm/mock-data";
import { getMergedProjectById } from "@/lib/crm/projects-storage";
import { useProjectWorkspace } from "@/lib/crm/use-project-workspace";
import { formatISODate } from "@/lib/crm/project-date-utils";
import KanbanBoard, { type KanbanColumn } from "@/components/crm/KanbanBoard";
import TabBar, { type Tab } from "@/components/crm/TabBar";
import ProjectBacklogView from "@/components/crm/project/ProjectBacklogView";
import ProjectRequestsView from "@/components/crm/project/ProjectRequestsView";
import ProjectScopeView from "@/components/crm/project/ProjectScopeView";
import ProjectMeetingsView from "@/components/crm/project/ProjectMeetingsView";
import ProjectResourcesView from "@/components/crm/project/ProjectResourcesView";
import ProjectGanttView from "@/components/crm/project/ProjectGanttView";
import ProjectMilestonesView from "@/components/crm/project/ProjectMilestonesView";
import ProjectTasksView, {
  type TaskCreateIntent,
} from "@/components/crm/project/ProjectTasksView";
import CrmPopoverDateField from "@/components/crm/CrmPopoverDateField";
import { Loader2, Pencil, Trash2 } from "lucide-react";
import type {
  WorkspaceSprint,
  WorkspaceTask,
} from "@/lib/crm/project-workspace-types";

const tabs: Tab[] = [
  { id: "sprint-board", label: "Sprint Board" },
  { id: "tasks", label: "Tasks" },
  { id: "backlog", label: "Backlog" },
  { id: "requests", label: "Requests" },
  { id: "milestones", label: "Milestones" },
  { id: "gantt", label: "Gantt" },
  { id: "scope", label: "Scope" },
  { id: "meetings", label: "Meetings" },
  { id: "resources", label: "Resources" },
];

const statusOrder: TaskStatus[] = [
  "not_started",
  "action_started",
  "in_progress",
  "test_qa",
  "completed",
];

type Props = { params: Promise<{ id: string }> };

export default function ProjectDetailPage({ params }: Props) {
  const { id } = use(params);
  const [project, setProject] = useState<MockProject | null | undefined>(
    undefined
  );
  const [activeTab, setActiveTab] = useState("sprint-board");
  const [sprintModalOpen, setSprintModalOpen] = useState(false);
  const [editingSprintId, setEditingSprintId] = useState<string | null>(null);
  const [sprintName, setSprintName] = useState("");
  const [sprintMilestone, setSprintMilestone] = useState("Milestone 1");
  const [sprintStart, setSprintStart] = useState(() =>
    formatISODate(new Date())
  );
  const [sprintEnd, setSprintEnd] = useState(() => formatISODate(new Date()));
  const [sprintDeleteId, setSprintDeleteId] = useState<string | null>(null);
  const [taskCreateIntent, setTaskCreateIntent] =
    useState<TaskCreateIntent>(null);

  const onConsumedTaskCreateIntent = useCallback(
    () => setTaskCreateIntent(null),
    []
  );

  const {
    workspace,
    hydrated,
    addSprint,
    updateSprint,
    deleteSprint,
    setCurrentSprint,
    addTask,
    updateTask,
    deleteTask,
    addTaskComment,
    addSubtask,
    updateSubtask,
    removeSubtask,
    addTaskAttachment,
    removeTaskAttachment,
    addRequest,
    updateRequestStatus,
    addScopeSection,
    addScopeLine,
    addMeeting,
    addResource,
    deleteResource,
  } = useProjectWorkspace(id);

  useEffect(() => {
    const load = () => setProject(getMergedProjectById(id) ?? null);
    load();
    window.addEventListener("crm-projects-changed", load);
    window.addEventListener("storage", load);
    return () => {
      window.removeEventListener("crm-projects-changed", load);
      window.removeEventListener("storage", load);
    };
  }, [id]);

  if (project === undefined) {
    return (
      <div className="p-8">
        <p className="text-sm text-text-secondary">Loading…</p>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="p-8">
        <p className="text-text-secondary">Project not found.</p>
        <Link href="/projects" className="mt-2 text-sm text-accent hover:underline">
          ← Back to projects
        </Link>
      </div>
    );
  }

  const teamLabel = projectTeamDisplayName(project);
  const sprints = workspace.sprints;
  const currentSprint = sprints.find((s) => s.isCurrent) ?? sprints[0];
  const sprintsInMilestone = currentSprint
    ? sprints.filter((s) => s.milestone === currentSprint.milestone).length
    : 0;

  const sprintDateTriggerClass =
    "mt-1 w-full rounded-lg border border-border px-3 py-2 dark:border-zinc-600 dark:bg-zinc-800 relative flex min-h-[2.625rem] items-center text-left";

  function resetSprintFormDefaults() {
    setSprintName("");
    setSprintMilestone("Milestone 1");
    const today = formatISODate(new Date());
    setSprintStart(today);
    setSprintEnd(today);
  }

  function openCreateSprintModal() {
    setEditingSprintId(null);
    resetSprintFormDefaults();
    setSprintModalOpen(true);
  }

  function openEditSprintModal(s: WorkspaceSprint) {
    setEditingSprintId(s.id);
    setSprintName(s.name);
    setSprintMilestone(s.milestone);
    setSprintStart(s.startDate);
    setSprintEnd(s.endDate);
    setSprintModalOpen(true);
  }

  function closeSprintModal() {
    setSprintModalOpen(false);
    setEditingSprintId(null);
    resetSprintFormDefaults();
  }

  function submitSprintModal(e: FormEvent) {
    e.preventDefault();
    if (!sprintName.trim()) return;
    const name = sprintName.trim();
    const milestone = sprintMilestone.trim() || "Milestone";
    if (editingSprintId) {
      updateSprint(editingSprintId, {
        name,
        milestone,
        startDate: sprintStart,
        endDate: sprintEnd,
      });
    } else {
      addSprint({
        name,
        milestone,
        startDate: sprintStart,
        endDate: sprintEnd,
        isCurrent: false,
      });
    }
    closeSprintModal();
  }

  function handleDeleteSprint(s: WorkspaceSprint) {
    const taskCount = workspace.tasks.filter((t) => t.sprintId === s.id).length;
    const label = s.name?.trim() || "this sprint";
    const backlogNote =
      taskCount > 0
        ? ` ${taskCount} task${taskCount === 1 ? "" : "s"} will move to the backlog.`
        : "";
    if (
      !confirm(
        `Delete sprint “${label}”?${backlogNote} This cannot be undone.`
      )
    ) {
      return;
    }
    setSprintDeleteId(s.id);
    try {
      deleteSprint(s.id);
    } finally {
      setSprintDeleteId(null);
    }
  }

  let panelContent: React.ReactNode = null;

  if (!hydrated) {
    panelContent = (
      <p className="text-sm text-text-secondary">Loading workspace…</p>
    );
  } else if (activeTab === "sprint-board") {
    panelContent =
      currentSprint ? (
        <SprintBoard
          sprint={currentSprint}
          sprintTasks={workspace.tasks.filter(
            (t) => t.sprintId === currentSprint.id
          )}
          sprints={sprints}
          sprintsInMilestone={sprintsInMilestone}
          onSetCurrentSprint={setCurrentSprint}
          onOpenCreateSprint={openCreateSprintModal}
          onEditSprint={openEditSprintModal}
          onDeleteSprint={handleDeleteSprint}
          sprintDeleteId={sprintDeleteId}
          onAddTask={(status) => {
            setActiveTab("tasks");
            setTaskCreateIntent({
              status,
              sprintId: currentSprint.id,
            });
          }}
          onMoveTask={(taskId, _from, to) => {
            updateTask(taskId, { status: to as TaskStatus });
          }}
        />
      ) : (
        <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-border bg-white py-16 dark:border-zinc-700 dark:bg-zinc-900">
          <p className="text-sm text-text-secondary">
            No sprints yet. Create one to use the sprint board.
          </p>
          <button
            type="button"
            onClick={openCreateSprintModal}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white"
          >
            Create sprint
          </button>
        </div>
      );
  } else if (activeTab === "tasks") {
    panelContent = (
      <ProjectTasksView
        tasks={workspace.tasks}
        sprints={sprints}
        onAddTask={addTask}
        onUpdateTask={updateTask}
        onDeleteTask={deleteTask}
        onAddTaskComment={addTaskComment}
        onAddSubtask={addSubtask}
        onUpdateSubtask={updateSubtask}
        onRemoveSubtask={removeSubtask}
        onAddAttachment={addTaskAttachment}
        onRemoveAttachment={removeTaskAttachment}
        createIntent={taskCreateIntent}
        onConsumedCreateIntent={onConsumedTaskCreateIntent}
      />
    );
  } else if (activeTab === "backlog") {
    panelContent = (
      <ProjectBacklogView
        tasks={workspace.tasks}
        sprints={sprints}
        onAddTask={(input) => addTask({ ...input, sprintId: input.sprintId })}
        onUpdateTask={updateTask}
      />
    );
  } else if (activeTab === "requests") {
    panelContent = (
      <ProjectRequestsView
        requests={workspace.requests}
        onAdd={addRequest}
        onUpdateStatus={updateRequestStatus}
      />
    );
  } else if (activeTab === "milestones") {
    panelContent = (
      <ProjectMilestonesView
        tasks={workspace.tasks}
        onGoToGantt={() => setActiveTab("gantt")}
      />
    );
  } else if (activeTab === "gantt") {
    panelContent = (
      <ProjectGanttView
        tasks={workspace.tasks}
        onAddTask={(title, status) =>
          addTask({ title, status, sprintId: null })
        }
      />
    );
  } else if (activeTab === "scope") {
    panelContent = (
      <ProjectScopeView
        sections={workspace.scopeSections}
        onAddSection={addScopeSection}
        onAddLine={addScopeLine}
      />
    );
  } else if (activeTab === "meetings") {
    panelContent = (
      <ProjectMeetingsView meetings={workspace.meetings} onAdd={addMeeting} />
    );
  } else if (activeTab === "resources") {
    panelContent = (
      <ProjectResourcesView
        resources={workspace.resources}
        onAdd={addResource}
        onDelete={deleteResource}
      />
    );
  }

  return (
    <div className="flex flex-col">
      <div className="border-b border-border bg-white px-8 py-3 text-sm text-text-secondary dark:border-zinc-700 dark:bg-zinc-900">
        <Link href="/projects" className="hover:text-accent">
          Projects
        </Link>
        <span className="mx-2">›</span>
        <span className="font-medium text-text-primary dark:text-zinc-100">
          {project.title}
        </span>
      </div>

      <div className="border-b border-border bg-white px-8 py-5 dark:border-zinc-700 dark:bg-zinc-900">
        <div className="flex items-center gap-3">
          <span
            className="h-4 w-4 rounded-full"
            style={{ backgroundColor: project.color }}
          />
          <h1 className="heading-display text-xl font-bold text-text-primary dark:text-zinc-100">
            {project.title}
          </h1>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
          <MetaField label="Plan">
            <span
              className="rounded-full px-2.5 py-0.5 text-xs font-medium text-white"
              style={{ backgroundColor: PLAN_COLORS[project.plan] }}
            >
              {PLAN_LABELS[project.plan]}
            </span>
          </MetaField>
          {project.projectType ? (
            <MetaField label="Type">
              <span className="font-medium text-text-primary dark:text-zinc-100">
                {project.projectType}
              </span>
            </MetaField>
          ) : null}
          <MetaField label="Client">
            <span className="font-medium text-text-primary dark:text-zinc-100">
              {project.clientId?.trim()
                ? projectClientDisplayLabel(project)
                : "—"}
            </span>
          </MetaField>
          <MetaField label="Team name">
            <span className="font-medium text-text-primary dark:text-zinc-100">
              {teamLabel}
            </span>
          </MetaField>
          <MetaField label="Expected End Date">
            <span className="font-medium text-text-primary dark:text-zinc-100">
              {project.expectedEndDate}
            </span>
          </MetaField>
          {project.budget != null && project.budget > 0 ? (
            <MetaField label="Budget">
              <span className="font-medium text-text-primary dark:text-zinc-100">
                {new Intl.NumberFormat("en-US", {
                  style: "currency",
                  currency: "USD",
                  maximumFractionDigits: 0,
                }).format(project.budget)}
              </span>
            </MetaField>
          ) : null}
          {project.website ? (
            <MetaField label="Website">
              <a
                href={
                  /^https?:\/\//i.test(project.website)
                    ? project.website
                    : `https://${project.website}`
                }
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-accent hover:underline"
              >
                {project.website.replace(/^https?:\/\//i, "")}
              </a>
            </MetaField>
          ) : null}
          {project.figmaLink && (
            <MetaField label="Figma Link">
              <span className="text-accent">Add</span>
            </MetaField>
          )}
          {project.lovableLink && (
            <MetaField label="Lovable Link">
              <span className="text-accent">Add</span>
            </MetaField>
          )}
          {project.slackChannel && (
            <MetaField label="Slack Channel">
              <span className="text-accent">Open ↗</span>
            </MetaField>
          )}
        </div>
      </div>

      <div className="bg-white px-8 dark:bg-zinc-900">
        <TabBar tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />
      </div>

      <div
        className="flex-1 overflow-auto p-8"
        role="tabpanel"
        id={`${activeTab}-panel`}
        aria-labelledby={`${activeTab}-tab`}
      >
        {panelContent}
      </div>

      {sprintModalOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="presentation"
          onClick={closeSprintModal}
        >
          <form
            className="w-full max-w-md rounded-2xl border border-border bg-white p-6 shadow-xl dark:border-zinc-700 dark:bg-zinc-900"
            onClick={(e) => e.stopPropagation()}
            onSubmit={submitSprintModal}
          >
            <h3 className="text-lg font-bold text-text-primary dark:text-zinc-100">
              {editingSprintId ? "Edit sprint" : "Create sprint"}
            </h3>
            <div className="mt-4 space-y-3">
              <label className="block text-sm text-text-secondary">
                Name
                <input
                  required
                  value={sprintName}
                  onChange={(e) => setSprintName(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-border px-3 py-2 dark:border-zinc-600 dark:bg-zinc-800"
                  placeholder="Sprint 1"
                />
              </label>
              <label className="block text-sm text-text-secondary">
                Milestone
                <input
                  value={sprintMilestone}
                  onChange={(e) => setSprintMilestone(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-border px-3 py-2 dark:border-zinc-600 dark:bg-zinc-800"
                />
              </label>
              <div>
                <label
                  htmlFor="sprint-start-date"
                  className="block text-sm text-text-secondary"
                >
                  Start date
                </label>
                <CrmPopoverDateField
                  id="sprint-start-date"
                  value={sprintStart}
                  onChange={setSprintStart}
                  displayFormat="numeric"
                  triggerClassName={sprintDateTriggerClass}
                />
              </div>
              <div>
                <label
                  htmlFor="sprint-end-date"
                  className="block text-sm text-text-secondary"
                >
                  End date
                </label>
                <CrmPopoverDateField
                  id="sprint-end-date"
                  value={sprintEnd}
                  onChange={setSprintEnd}
                  displayFormat="numeric"
                  triggerClassName={sprintDateTriggerClass}
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={closeSprintModal}
                className="rounded-lg border border-border px-4 py-2 text-sm dark:border-zinc-600"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white"
              >
                {editingSprintId ? "Save changes" : "Create"}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}

function SprintBoard({
  sprint,
  sprintTasks,
  sprints,
  sprintsInMilestone,
  onSetCurrentSprint,
  onOpenCreateSprint,
  onEditSprint,
  onDeleteSprint,
  sprintDeleteId,
  onAddTask,
  onMoveTask,
}: {
  sprint: WorkspaceSprint;
  sprintTasks: WorkspaceTask[];
  sprints: WorkspaceSprint[];
  sprintsInMilestone: number;
  onSetCurrentSprint: (id: string) => void;
  onOpenCreateSprint: () => void;
  onEditSprint: (s: WorkspaceSprint) => void;
  onDeleteSprint: (s: WorkspaceSprint) => void;
  sprintDeleteId: string | null;
  onAddTask: (status: TaskStatus) => void;
  onMoveTask: (
    taskId: string,
    fromColumnId: string,
    toColumnId: string
  ) => void;
}) {
  const columns: KanbanColumn<WorkspaceTask>[] = statusOrder.map((status) => ({
    id: status,
    label: TASK_STATUS_LABELS[status],
    color: TASK_STATUS_COLORS[status],
    items: sprintTasks.filter((t) => t.status === status),
  }));

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
        <h2 className="text-lg font-bold text-text-primary dark:text-zinc-100">
          Sprint Board
        </h2>
        <MetaField label="Sprint">
          <div className="flex flex-wrap items-center gap-1">
            {sprints.length > 1 ? (
              <select
                value={sprint.id}
                onChange={(e) => onSetCurrentSprint(e.target.value)}
                className="rounded-lg border border-border bg-white px-2 py-1 text-sm font-medium dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
              >
                {sprints.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            ) : (
              <span className="font-medium text-text-primary dark:text-zinc-100">
                {sprint.name}
              </span>
            )}
            <button
              type="button"
              onClick={() => onEditSprint(sprint)}
              title="Edit sprint"
              className="inline-flex items-center justify-center rounded-lg border border-border p-1.5 text-zinc-600 transition-colors hover:bg-surface dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
              aria-label={`Edit ${sprint.name}`}
            >
              <Pencil className="h-4 w-4 shrink-0" aria-hidden />
            </button>
            <button
              type="button"
              disabled={sprintDeleteId === sprint.id}
              title="Delete sprint"
              className="inline-flex items-center justify-center rounded-lg border border-border p-1.5 text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50 dark:border-zinc-600 dark:text-red-400 dark:hover:bg-red-950/40"
              aria-label={`Delete ${sprint.name}`}
              aria-busy={sprintDeleteId === sprint.id}
              onClick={() => onDeleteSprint(sprint)}
            >
              {sprintDeleteId === sprint.id ? (
                <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
              ) : (
                <Trash2 className="h-4 w-4 shrink-0" aria-hidden />
              )}
            </button>
          </div>
        </MetaField>
        <MetaField label="Expected End Date">
          <span className="font-medium text-text-primary dark:text-zinc-100">
            {sprint.endDate}
          </span>
        </MetaField>
        <MetaField label="Milestone">
          <span className="font-medium text-text-primary dark:text-zinc-100">
            {sprint.milestone} ›
          </span>
        </MetaField>
        <MetaField label="Sprints in Milestone">
          <span className="font-medium text-text-primary dark:text-zinc-100">
            {sprintsInMilestone}
          </span>
        </MetaField>
      </div>

      <div className="flex flex-wrap items-center gap-3 text-sm">
        <button
          type="button"
          onClick={onOpenCreateSprint}
          className="rounded-lg bg-accent px-3 py-1.5 font-medium text-white hover:opacity-90"
        >
          Create sprint
        </button>
        <button
          type="button"
          className="rounded-lg border border-border px-3 py-1.5 text-text-secondary hover:bg-surface dark:border-zinc-600 dark:hover:bg-zinc-800"
        >
          Filter
        </button>
        <button
          type="button"
          className="rounded-lg border border-border px-3 py-1.5 text-text-secondary hover:bg-surface dark:border-zinc-600 dark:hover:bg-zinc-800"
        >
          Complete Sprint
        </button>
      </div>

      <div className="mt-4">
        <KanbanBoard
          columns={columns}
          renderCard={(task) => <TaskCard task={task} />}
          onAddNew={(columnId) => onAddTask(columnId as TaskStatus)}
          onMove={(itemId, from, to) => onMoveTask(itemId, from, to)}
        />
      </div>
    </div>
  );
}

function TaskCard({ task }: { task: WorkspaceTask }) {
  const primary = task.assigneeIds?.[0] ?? task.assigneeId;
  const assignee = primary ? getMemberById(primary) : null;
  return (
    <div className="rounded-xl border border-border bg-white p-3 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
      <p className="text-sm font-medium text-text-primary dark:text-zinc-100">
        {task.title}
      </p>
      {assignee && (
        <div className="mt-2 flex items-center gap-1.5">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-accent/10 text-[10px] font-bold text-accent">
            {assignee.avatarFallback}
          </span>
          <span className="text-xs text-text-secondary">{assignee.name}</span>
        </div>
      )}
    </div>
  );
}

function MetaField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-text-secondary">{label}</span>
      {children}
    </div>
  );
}
