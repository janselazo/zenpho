"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import TabBar from "@/components/crm/TabBar";
import {
  PLAN_COLORS,
  PLAN_LABELS,
  projectClientDisplayLabel,
  projectTeamDisplayName,
  type MockProject,
} from "@/lib/crm/mock-data";
import type { WorkspaceResource } from "@/lib/crm/project-workspace-types";
import type { ChildDeliveryStatus } from "@/lib/crm/product-project-metadata";
import { milestonesWithDefaults } from "@/lib/crm/product-project-metadata";
import NewProductProjectModal from "@/components/crm/product/NewProductProjectModal";
import ProductProjectsGroupedPanel from "@/components/crm/product/ProductProjectsGroupedPanel";
import ProductMilestonesTab from "@/components/crm/product/ProductMilestonesTab";
import ProductSprintsTab from "@/components/crm/product/ProductSprintsTab";
import ProductTasksLinearTab from "@/components/crm/product/ProductTasksLinearTab";
import ProductIssuesLinearTab from "@/components/crm/product/ProductIssuesLinearTab";
import ProductResourcesTab from "@/components/crm/product/ProductResourcesTab";

const TABS = [
  { id: "projects", label: "Projects" },
  { id: "milestones", label: "Milestones" },
  { id: "sprints", label: "Sprints" },
  { id: "tasks", label: "Tasks" },
  { id: "issues", label: "Issues" },
  { id: "resources", label: "Resources" },
] as const;

export type ProductChildRow = {
  id: string;
  title: string;
  plan_stage: string | null;
  metadata: unknown;
  target_date?: string | null;
};

type Props = {
  productId: string;
  product: MockProject;
  childrenProjects: ProductChildRow[];
  initialProductResources: WorkspaceResource[];
};

function MetaField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-text-secondary dark:text-zinc-500">{label}</span>
      {children}
    </div>
  );
}

export default function ProductDetailShell({
  productId,
  product,
  childrenProjects,
  initialProductResources,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [modalOpen, setModalOpen] = useState(false);
  const [newProjectStatusPreset, setNewProjectStatusPreset] = useState<
    ChildDeliveryStatus | undefined
  >(undefined);

  const tabParam = searchParams.get("tab");
  const activeTab = TABS.some((t) => t.id === tabParam)
    ? (tabParam as (typeof TABS)[number]["id"])
    : "projects";

  const projectParam = searchParams.get("project");
  const childIds = useMemo(
    () => new Set(childrenProjects.map((c) => c.id)),
    [childrenProjects]
  );

  const selectedProjectId = useMemo(() => {
    if (projectParam && childIds.has(projectParam)) return projectParam;
    return childrenProjects[0]?.id ?? null;
  }, [projectParam, childIds, childrenProjects]);

  const setQuery = useCallback(
    (next: { tab?: string; project?: string | null; sprint?: string | null }) => {
      const p = new URLSearchParams(searchParams.toString());
      if (next.tab !== undefined) {
        p.set("tab", next.tab);
        if (next.tab !== "tasks") p.delete("sprint");
      }
      if (next.project !== undefined) {
        if (next.project === null) p.delete("project");
        else p.set("project", next.project);
      }
      if (next.sprint !== undefined) {
        if (next.sprint === null || next.sprint === "") p.delete("sprint");
        else p.set("sprint", next.sprint);
      }
      const q = p.toString();
      router.replace(q ? `${pathname}?${q}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams]
  );

  useEffect(() => {
    if (
      projectParam &&
      !childIds.has(projectParam) &&
      childrenProjects.length > 0
    ) {
      setQuery({ project: childrenProjects[0].id, sprint: null });
    }
  }, [projectParam, childIds, childrenProjects, setQuery]);

  const sprintParam = searchParams.get("sprint");

  const selectedChild = useMemo(
    () => childrenProjects.find((c) => c.id === selectedProjectId) ?? null,
    [childrenProjects, selectedProjectId]
  );

  const milestoneList = useMemo(
    () => milestonesWithDefaults(selectedChild?.metadata),
    [selectedChild?.metadata]
  );

  const teamLabel = projectTeamDisplayName(product);

  const needsProject =
    activeTab === "milestones" ||
    activeTab === "sprints" ||
    activeTab === "tasks" ||
    activeTab === "issues";

  return (
    <div className="flex flex-col">
      <div className="border-b border-border bg-white px-8 py-3 text-sm text-text-secondary dark:border-zinc-700 dark:bg-zinc-900">
        <Link href="/products" className="hover:text-accent">
          Products
        </Link>
        <span className="mx-2">›</span>
        <span className="font-medium text-text-primary dark:text-zinc-100">
          {product.title}
        </span>
      </div>

      <div className="border-b border-border bg-white px-8 py-5 dark:border-zinc-700 dark:bg-zinc-900">
        <div className="flex items-center gap-3">
          <span
            className="h-4 w-4 rounded-full"
            style={{ backgroundColor: product.color }}
            aria-hidden
          />
          <h1 className="heading-display text-xl font-bold text-text-primary dark:text-zinc-100">
            {product.title}
          </h1>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
          <MetaField label="Plan">
            <span
              className="rounded-full px-2.5 py-0.5 text-xs font-medium text-white"
              style={{ backgroundColor: PLAN_COLORS[product.plan] }}
            >
              {PLAN_LABELS[product.plan]}
            </span>
          </MetaField>
          {product.projectType ? (
            <MetaField label="Type">
              <span className="font-medium text-text-primary dark:text-zinc-100">
                {product.projectType}
              </span>
            </MetaField>
          ) : null}
          <MetaField label="Client">
            <span className="font-medium text-text-primary dark:text-zinc-100">
              {projectClientDisplayLabel(product)}
            </span>
          </MetaField>
          <MetaField label="Team name">
            <span className="font-medium text-text-primary dark:text-zinc-100">
              {teamLabel}
            </span>
          </MetaField>
          <MetaField label="Expected end date">
            <span className="font-medium text-text-primary dark:text-zinc-100">
              {product.expectedEndDate}
            </span>
          </MetaField>
        </div>
      </div>

      <div className="border-b border-border bg-white px-8 dark:border-zinc-700 dark:bg-zinc-900">
        <TabBar
          tabs={[...TABS]}
          activeTab={activeTab}
          onTabChange={(id) => setQuery({ tab: id })}
          ariaLabel="Product sections"
        />
      </div>

      {needsProject ? (
        <div className="border-b border-border bg-surface/40 px-8 py-3 dark:border-zinc-800 dark:bg-zinc-900/80">
          <label className="flex flex-wrap items-center gap-2 text-sm">
            <span className="font-medium text-text-secondary dark:text-zinc-400">
              Project
            </span>
            <select
              value={selectedProjectId ?? ""}
              onChange={(e) => {
                const v = e.target.value;
                setQuery({ project: v || null, sprint: null });
              }}
              className="min-w-[200px] rounded-lg border border-border bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-800"
            >
              {childrenProjects.length === 0 ? (
                <option value="">No projects yet</option>
              ) : (
                childrenProjects.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))
              )}
            </select>
            <button
              type="button"
              onClick={() => {
                setNewProjectStatusPreset(undefined);
                setModalOpen(true);
              }}
              className="text-sm font-medium text-accent hover:underline"
            >
              + New project
            </button>
          </label>
        </div>
      ) : null}

      <div className="flex-1 overflow-auto p-8" role="tabpanel">
        {activeTab === "projects" ? (
          <div className="space-y-6">
            <section className="max-w-lg rounded-2xl border border-border bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900/60">
              <h2 className="text-sm font-semibold text-text-primary dark:text-zinc-100">
                Details
              </h2>
              <dl className="mt-4 space-y-2 text-sm">
                <div>
                  <dt className="text-text-secondary dark:text-zinc-500">
                    Target
                  </dt>
                  <dd className="font-medium text-text-primary dark:text-zinc-100">
                    {product.expectedEndDate === "TBD"
                      ? "TBD"
                      : product.expectedEndDate}
                  </dd>
                </div>
                {product.budget != null ? (
                  <div>
                    <dt className="text-text-secondary dark:text-zinc-500">
                      Budget
                    </dt>
                    <dd className="font-medium text-text-primary dark:text-zinc-100">
                      {new Intl.NumberFormat("en-US", {
                        style: "currency",
                        currency: "USD",
                        maximumFractionDigits: 0,
                      }).format(product.budget)}
                    </dd>
                  </div>
                ) : null}
                {product.website ? (
                  <div>
                    <dt className="text-text-secondary dark:text-zinc-500">
                      Website
                    </dt>
                    <dd>
                      <a
                        href={
                          product.website.startsWith("http")
                            ? product.website
                            : `https://${product.website}`
                        }
                        className="font-medium text-accent hover:underline"
                        target="_blank"
                        rel="noreferrer"
                      >
                        {product.website}
                      </a>
                    </dd>
                  </div>
                ) : null}
              </dl>
            </section>

            <ProductProjectsGroupedPanel
              teamId={product.teamId}
              projects={childrenProjects}
              onOpenProject={(id) =>
                setQuery({ tab: "tasks", project: id })
              }
              onNewProject={(preset) => {
                setNewProjectStatusPreset(preset);
                setModalOpen(true);
              }}
            />
          </div>
        ) : null}

        {activeTab === "milestones" ? (
          !selectedProjectId ? (
            <p className="text-sm text-text-secondary">
              Add a project first, then pick it above.
            </p>
          ) : (
            <ProductMilestonesTab
              productId={productId}
              childProjectId={selectedProjectId}
              initialMilestones={milestoneList}
            />
          )
        ) : null}

        {activeTab === "sprints" ? (
          !selectedProjectId ? (
            <p className="text-sm text-text-secondary">
              Add a project first, then pick it above.
            </p>
          ) : (
            <ProductSprintsTab
              projectId={selectedProjectId}
              milestoneLabels={milestoneList.map((m) => m.title)}
              onOpenTasksForSprint={(sprintId) =>
                setQuery({ tab: "tasks", sprint: sprintId })
              }
              onOpenBacklogTasks={() =>
                setQuery({ tab: "tasks", sprint: "backlog" })
              }
            />
          )
        ) : null}

        {activeTab === "tasks" ? (
          !selectedProjectId ? (
            <p className="text-sm text-text-secondary">
              Add a project first, then pick it above.
            </p>
          ) : (
            <ProductTasksLinearTab
              projectId={selectedProjectId}
              teamId={product.teamId}
              milestones={milestoneList}
              childProjects={childrenProjects.map((c) => ({
                id: c.id,
                title: c.title,
              }))}
              onCreatedOnProject={(id) => setQuery({ project: id })}
              sprintParam={sprintParam}
              onSprintFilterChange={(v) =>
                setQuery({ sprint: v === "all" ? null : v })
              }
            />
          )
        ) : null}

        {activeTab === "issues" ? (
          !selectedProjectId ? (
            <p className="text-sm text-text-secondary">
              Add a project first, then pick it above.
            </p>
          ) : (
            <ProductIssuesLinearTab projectId={selectedProjectId} />
          )
        ) : null}

        {activeTab === "resources" ? (
          <ProductResourcesTab
            productId={productId}
            initialResources={initialProductResources}
          />
        ) : null}
      </div>

      <NewProductProjectModal
        productId={productId}
        teamId={product.teamId}
        open={modalOpen}
        initialDeliveryStatus={newProjectStatusPreset}
        onClose={() => {
          setModalOpen(false);
          setNewProjectStatusPreset(undefined);
        }}
        onCreated={(id) => {
          setModalOpen(false);
          setNewProjectStatusPreset(undefined);
          router.refresh();
          setQuery({ tab: "milestones", project: id });
        }}
      />
    </div>
  );
}
