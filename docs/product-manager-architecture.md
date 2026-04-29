# Product Manager architecture (audit)

## Routing

- **Product shell:** `/products/[productId]` → [`app/(crm)/products/[productId]/page.tsx`](../src/app/(crm)/products/[productId]/page.tsx) loads root `project` row, child rows (`parent_project_id = productId`), product resources from metadata.
- **Query state:** `?tab=` (section), `?project=` (selected child delivery project UUID), `?sprint=` (legacy backlog filter for tasks view).
- **Legacy phase URL:** `/products/[productId]/phases/[phaseId]` redirects to `?project=&tab=…`.

## Previous tab IDs (pre-redesign)

| URL `tab` | Purpose |
|-----------|---------|
| `projects` | Project Features grouped panel (`ProductProjectsGroupedPanel`) |
| `tasks` | Linear task table + local workspace (`ProductTasksLinearTab` / `useProjectWorkspace`) |
| `sprints` | Sprint CRUD in workspace (`ProductSprintsTab`) |
| `milestones` | Child metadata milestones + tasks (`ProductMilestonesTab`) |
| `roadmap` | Timeline (`ProductRoadmapTab`) |
| `issues` | Supabase `issue` rows (`ProductIssuesLinearTab`) |
| `resources` | Root `metadata.productResources` (`ProductResourcesTab`) |

## Data split

- **Postgres:** `project` (product + children), `issue`, product-level metadata JSONB, optional new `project_*` tables from redesign migration.
- **Browser:** `useProjectWorkspace` persists sprints/tasks/scope/etc. in **localStorage** (`project-workspace-storage.ts`), keyed by child project UUID.

## Redesign tab IDs

`overview` | `discovery` | `roadmap` | `backlog` | `sprint-board` | `qa-bugs` | `releases` | `resources` | `settings`

Legacy `tab` values are normalized in the client shell to these IDs.
