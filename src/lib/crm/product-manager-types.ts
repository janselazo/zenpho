/** Types for Product Manager persistent module (Supabase). */

export type DiscoverySectionKey =
  | "requirements"
  | "goals"
  | "target_users"
  | "competitor_research"
  | "personas"
  | "scope_notes"
  | "mvp_definition"
  | "out_of_scope"
  | "decisions"
  | string;

export type ProjectRoadmapPhaseSlug =
  | "discovery"
  | "design"
  | "development"
  | "qa_uat"
  | "launch"
  | "post_launch"
  | string;

export type WorkItemType =
  | "feature"
  | "user_story"
  | "task"
  | "bug"
  | "improvement"
  | "client_request";

export type WorkItemPriority = "low" | "medium" | "high" | "urgent";

export type SprintBoardStatus =
  | "ready"
  | "in_progress"
  | "code_review"
  | "qa"
  | "client_review"
  | "done"
  | "blocked";

export type WorkItemScopeLabel =
  | "in_scope"
  | "out_of_scope"
  | "post_mvp"
  | "change_request";

export type PmResourceCategory =
  | "team"
  | "roles"
  | "capacity"
  | "files"
  | "links"
  | "credentials"
  | "tech_stack"
  | "environments"
  | "brand"
  | "meetings";

export type BugIssueStatus =
  | "new"
  | "confirmed"
  | "in_progress"
  | "ready_for_qa"
  | "fixed"
  | "rejected"
  | "reopened";

export const BUG_ISSUE_STATUS_SET = new Set<string>([
  "new",
  "confirmed",
  "in_progress",
  "ready_for_qa",
  "fixed",
  "rejected",
  "reopened",
]);

export const DEFAULT_ROADMAP_PHASES: {
  phase_slug: string;
  title: string;
  sort_order: number;
}[] = [
  { phase_slug: "discovery", title: "Phase 1: Discovery", sort_order: 0 },
  { phase_slug: "design", title: "Phase 2: UX/UI Design", sort_order: 1 },
  { phase_slug: "development", title: "Phase 3: MVP Development", sort_order: 2 },
  { phase_slug: "qa_uat", title: "Phase 4: QA & UAT", sort_order: 3 },
  { phase_slug: "launch", title: "Phase 5: Launch", sort_order: 4 },
  { phase_slug: "post_launch", title: "Phase 6: Post-launch improvements", sort_order: 5 },
];

/** Default Sprint Board columns (task_board domain). */
export const SPRINT_BOARD_COLUMNS: { slug: SprintBoardStatus; label: string }[] = [
  { slug: "ready", label: "Ready" },
  { slug: "in_progress", label: "In Progress" },
  { slug: "code_review", label: "Code Review" },
  { slug: "qa", label: "QA" },
  { slug: "client_review", label: "Client Review" },
  { slug: "done", label: "Done" },
  { slug: "blocked", label: "Blocked" },
];

export const BUG_STATUS_GROUPS: {
  id: string;
  label: string;
  statuses: BugIssueStatus[];
}[] = [
  { id: "triage", label: "Triage", statuses: ["new", "confirmed", "reopened"] },
  { id: "active", label: "Active", statuses: ["in_progress", "ready_for_qa"] },
  { id: "done", label: "Done", statuses: ["fixed", "rejected"] },
];

export const BUG_STATUS_LABELS: Record<BugIssueStatus, string> = {
  new: "New",
  confirmed: "Confirmed",
  in_progress: "In progress",
  ready_for_qa: "Ready for QA",
  fixed: "Fixed",
  rejected: "Rejected",
  reopened: "Reopened",
};

export const DISCOVERY_SECTION_PRESETS: {
  section_key: DiscoverySectionKey;
  title: string;
  sort_order: number;
}[] = [
  { section_key: "requirements", title: "Client requirements", sort_order: 0 },
  { section_key: "goals", title: "Product goals", sort_order: 1 },
  { section_key: "target_users", title: "Target users", sort_order: 2 },
  { section_key: "competitor_research", title: "Competitor research", sort_order: 3 },
  { section_key: "personas", title: "User personas", sort_order: 4 },
  { section_key: "scope_notes", title: "Scope notes", sort_order: 5 },
  { section_key: "mvp_definition", title: "MVP definition", sort_order: 6 },
  { section_key: "out_of_scope", title: "Out of scope", sort_order: 7 },
  { section_key: "decisions", title: "Important decisions", sort_order: 8 },
];
