// CRM seed data: empty by default. UI supports adding records; some views still read from here until Supabase-backed.

// ── Types ──────────────────────────────────────────────────────────────────

export type PlanStage = "pipeline" | "planning" | "mvp" | "growth";
export type TaskStatus =
  | "not_started"
  | "action_started"
  | "in_progress"
  | "test_qa"
  | "completed";
/** Kanban / pipeline column order (aligned with `DEFAULT_LEAD_PIPELINE_COLUMNS`). */
export const LEAD_PIPELINE_STAGES = [
  "new",
  "contacted",
  "discoverycall_scheduled",
  "discoverycall_completed",
  "proposal_sent",
  "negotiation",
  "closed_won",
  "closed_lost",
  "nurture",
] as const;

export type LeadPipelineStage = (typeof LEAD_PIPELINE_STAGES)[number];
export type LeadStage = LeadPipelineStage;

export const LEAD_PIPELINE_COLUMN_COLORS: Record<LeadPipelineStage, string> = {
  new: "#ea580c",
  contacted: "#3b82f6",
  discoverycall_scheduled: "#06b6d4",
  discoverycall_completed: "#8b5cf6",
  proposal_sent: "#a855f7",
  negotiation: "#f59e0b",
  closed_won: "#10b981",
  closed_lost: "#ef4444",
  nurture: "#94a3b8",
};

export function parseLeadPipelineStage(
  value: string | null | undefined
): LeadPipelineStage {
  const s = (value ?? "new").trim().toLowerCase();
  if (s === "won") return "closed_won";
  if (s === "lost") return "closed_lost";
  if (s === "qualified") return "discoverycall_completed";
  if (s === "not_qualified") return "closed_lost";
  if ((LEAD_PIPELINE_STAGES as readonly string[]).includes(s)) {
    return s as LeadPipelineStage;
  }
  return "new";
}

export interface MockProject {
  id: string;
  title: string;
  plan: PlanStage;
  teamId: string;
  /** Supabase `client.id` — every project is tied to a client record. */
  clientId: string;
  /** Cached display label from the client row (name / company / email). */
  clientName?: string | null;
  /** Display name for the squad (free text); takes precedence over teamId lookup */
  teamName?: string | null;
  /** Web App, Mobile App, etc. (optional for older seed rows) */
  projectType?: string;
  color: string;
  expectedEndDate: string;
  /** Optional project budget (USD) */
  budget?: number | null;
  /** Client or product site */
  website?: string | null;
  figmaLink?: string;
  lovableLink?: string;
  slackChannel?: string;
  sprintCount: number;
  taskCount: number;
}

export interface MockSprint {
  id: string;
  projectId: string;
  name: string;
  milestone: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
}

export interface MockTask {
  id: string;
  sprintId: string;
  projectId: string;
  title: string;
  status: TaskStatus;
  assigneeId: string | null;
}

/** Workspace access level (separate from job title in `role`) */
export type TeamMemberPermission = "owner" | "admin" | "member";

export const TEAM_MEMBER_PERMISSION_LABELS: Record<
  TeamMemberPermission,
  string
> = {
  owner: "Owner",
  admin: "Admin",
  member: "Member",
};

export const TEAM_MEMBER_PERMISSION_ORDER: TeamMemberPermission[] = [
  "owner",
  "admin",
  "member",
];

export function parseTeamMemberPermission(
  value: unknown
): TeamMemberPermission {
  if (value === "owner" || value === "admin" || value === "member") {
    return value;
  }
  return "member";
}

export interface MockTeamMember {
  id: string;
  name: string;
  email: string;
  role: string;
  /** Legacy project linkage; derived from primary tag when using groups */
  teamId: string;
  /** Groups such as Developers, Designers (multi-assign) */
  tags: string[];
  utilization: number;
  activeProjects: number;
  avatarFallback: string;
  /** City / region; optional — UI can fall back to a demo label when absent */
  location?: string | null;
  /** Owner / Admin / Member */
  permission: TeamMemberPermission;
}

/** Quick-pick labels for the Team tag field (you can still type custom groups) */
export const SUGGESTED_TEAM_TAGS = [
  "Developers",
  "Designers",
  "QA",
  "Product",
  "Marketing",
  "Ops",
] as const;

export interface MockTeam {
  id: string;
  name: string;
  color: string;
}

export interface MockLead {
  id: string;
  name: string;
  email: string;
  company: string;
  stage: LeadStage;
  source: string;
  createdAt: string;
}

// ── Data ───────────────────────────────────────────────────────────────────

export const PLAN_COLORS: Record<PlanStage, string> = {
  pipeline: "#ef4444",
  planning: "#f59e0b",
  mvp: "#3b82f6",
  growth: "#10b981",
};

export const PLAN_LABELS: Record<PlanStage, string> = {
  pipeline: "Backlog",
  planning: "Progress",
  mvp: "Review",
  growth: "Done",
};

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  not_started: "Not Yet Started",
  action_started: "Action Started",
  in_progress: "In Progress",
  test_qa: "Test/QA",
  completed: "Completed",
};

export const TASK_STATUS_COLORS: Record<TaskStatus, string> = {
  not_started: "#6b7280",
  action_started: "#f59e0b",
  in_progress: "#3b82f6",
  test_qa: "#ef4444",
  completed: "#10b981",
};

export const LEAD_STAGE_LABELS: Record<LeadStage, string> = {
  new: "New Lead",
  contacted: "Contacted",
  discoverycall_scheduled: "Appointment Scheduled",
  discoverycall_completed: "Appointment Completed",
  proposal_sent: "Proposal Sent",
  negotiation: "Negotiation",
  closed_won: "Won",
  closed_lost: "Lost",
  nurture: "Nurture",
};

/** Lead "Project type" dropdown (stored as-display on `lead.project_type`) */
export const LEAD_PROJECT_TYPE_OPTIONS = [
  "Web App",
  "Mobile App",
  "Website",
  "Ecommerce Store",
  "Other",
] as const;

export type LeadProjectType = (typeof LEAD_PROJECT_TYPE_OPTIONS)[number];

export const teams: MockTeam[] = [];

export const teamMembers: MockTeamMember[] = [];

/** URL-safe slug for tag-based team ids (`tag-{slug}`), aligned with TeamsView */
export function slugTeamTag(tag: string) {
  const s = tag
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return s || "group";
}

function colorForTeamTagLabel(tag: string) {
  let h = 0;
  for (let i = 0; i < tag.length; i += 1) {
    h = tag.charCodeAt(i) + ((h << 5) - h);
  }
  const hue = Math.abs(h) % 360;
  return `hsl(${hue} 52% 42%)`;
}

const UNASSIGNED_TEAM: MockTeam = {
  id: "team-general",
  name: "Member",
  color: "#94a3b8",
};

/**
 * Options for the New Project / filters team dropdown.
 * Ids match TeamsView tag groups (`tag-{slug}`) so assignments stay consistent.
 */
export function getProjectTeamSelectOptions(): MockTeam[] {
  const fromSuggested: MockTeam[] = SUGGESTED_TEAM_TAGS.map((name) => ({
    id: `tag-${slugTeamTag(name)}`,
    name,
    color: colorForTeamTagLabel(name),
  }));
  return [UNASSIGNED_TEAM, ...fromSuggested];
}

export const projects: MockProject[] = [];

export const sprints: MockSprint[] = [];

export const tasks: MockTask[] = [];

export const leads: MockLead[] = [];

// ── Helpers ────────────────────────────────────────────────────────────────

export function getProjectById(id: string) {
  return projects.find((p) => p.id === id);
}

export function getSprintsForProject(projectId: string) {
  return sprints.filter((s) => s.projectId === projectId);
}

export function getTasksForSprint(sprintId: string) {
  return tasks.filter((t) => t.sprintId === sprintId);
}

export function getTeamById(id: string) {
  const fromSeed = teams.find((t) => t.id === id);
  if (fromSeed) return fromSeed;
  if (id === UNASSIGNED_TEAM.id) return UNASSIGNED_TEAM;
  const fromSuggested = getProjectTeamSelectOptions().find((t) => t.id === id);
  if (fromSuggested) return fromSuggested;
  if (id.startsWith("tag-")) {
    const slug = id.slice(4);
    const name = slug
      .split("-")
      .map((w) => (w ? w.charAt(0).toUpperCase() + w.slice(1) : ""))
      .join(" ")
      .trim();
    const label = name || "Team";
    return { id, name: label, color: colorForTeamTagLabel(label) };
  }
  return undefined;
}

/** Label shown in UI: saved team name, or legacy resolution from teamId */
export function projectTeamDisplayName(p: MockProject): string {
  const n = p.teamName?.trim();
  if (n) return n;
  if (!p.teamId || p.teamId === "team-general") return "Member";
  return getTeamById(p.teamId)?.name ?? "Member";
}

/** Label for the linked CRM client (list + detail). */
export function projectClientDisplayLabel(p: MockProject): string {
  const n = p.clientName?.trim();
  if (n) return n;
  if (p.clientId?.trim()) return "Client (refresh name)";
  return "—";
}

export function getMemberById(id: string) {
  return teamMembers.find((m) => m.id === id);
}

export function getMembersForTeam(teamId: string) {
  return teamMembers.filter((m) => m.teamId === teamId);
}

// ── Deals ──────────────────────────────────────────────────────────────────

/** Stored on `deal.stage`; configurable via CRM pipeline settings (defaults below). */
export type DealStage = string;

export interface MockDeal {
  id: string;
  title: string;
  company: string;
  value: number;
  stage: DealStage;
  contactName: string;
  contactEmail: string;
  createdAt: string;
  expectedClose: string;
  /** Supabase `deal.website` — optional URL for the account */
  website?: string | null;
  /** Set when row comes from Supabase — edits sync to `deal` + linked `lead` */
  leadId?: string;
}

/** Default labels when pipeline config is unavailable. */
export const DEAL_STAGE_LABELS: Record<string, string> = {
  prospect: "Open",
  proposal: "Proposal",
  negotiation: "Negotiation",
  closed_won: "Won",
  closed_lost: "Lost",
};

export const DEAL_STAGE_COLORS: Record<string, string> = {
  prospect: "#6b7280",
  proposal: "#3b82f6",
  negotiation: "#f59e0b",
  closed_won: "#10b981",
  closed_lost: "#ef4444",
};

export const deals: MockDeal[] = [];

// ── Prospecting ────────────────────────────────────────────────────────────

export interface PlaybookActivity {
  id: string;
  title: string;
  points: number;
  target: number;
  timeEstimate: string;
}

export interface PlaybookCategory {
  id: string;
  name: string;
  icon: string;
  color: string;
  activities: PlaybookActivity[];
}

export const playbookCategories: PlaybookCategory[] = [];

export interface MonthlyGoal {
  id: string;
  title: string;
  current: number;
  target: number;
  unit: "count" | "currency";
  icon: string;
}

/** Fixed playbook monthly goals: Clients (won this month) + Revenue (project budgets). */
export const standardMonthlyGoals: MonthlyGoal[] = [
  {
    id: "mg-clients",
    title: "Clients",
    current: 0,
    target: 15,
    unit: "count",
    icon: "users",
  },
  {
    id: "mg-revenue",
    title: "Revenue",
    current: 0,
    target: 8000,
    unit: "currency",
    icon: "dollar",
  },
];

/** @deprecated Use `standardMonthlyGoals` — kept for imports that expect `monthlyGoals`. */
export const monthlyGoals: MonthlyGoal[] = standardMonthlyGoals;

export type ProspectingTaskType = "follow_up" | "call" | "email" | "text" | "appointment" | "other";
export type ProspectingTaskStatus = "pending" | "in_progress" | "completed" | "skipped";

export interface ProspectingTask {
  id: string;
  title: string;
  type: ProspectingTaskType;
  status: ProspectingTaskStatus;
  dueDate: string;
  linkedLead?: string;
}

export const PROSPECTING_TASK_TYPE_LABELS: Record<ProspectingTaskType, string> = {
  follow_up: "Follow Up",
  call: "Call",
  email: "Email",
  text: "Text",
  appointment: "Appointment",
  other: "Other",
};

export const prospectingTasks: ProspectingTask[] = [];
