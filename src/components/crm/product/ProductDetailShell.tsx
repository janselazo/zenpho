"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import TabBar from "@/components/crm/TabBar";
import {
  PLAN_COLORS,
  PLAN_LABELS,
  projectClientNameParts,
  type MockProject,
} from "@/lib/crm/mock-data";
import { projectTypeBadgeClass } from "@/lib/crm/project-type-badge";
import type { WorkspaceResource } from "@/lib/crm/project-workspace-types";
import type { ChildDeliveryStatusUiConfig } from "@/lib/crm/child-delivery-status-ui";
import { parseCustomProjectStatuses } from "@/lib/crm/custom-project-status";
import { milestonesWithDefaults } from "@/lib/crm/product-project-metadata";
import NewProductProjectModal from "@/components/crm/product/NewProductProjectModal";
import ProductProjectsGroupedPanel from "@/components/crm/product/ProductProjectsGroupedPanel";
import ProductMilestonesTab from "@/components/crm/product/ProductMilestonesTab";
import ProductSprintsTab from "@/components/crm/product/ProductSprintsTab";
import ProductTasksLinearTab from "@/components/crm/product/ProductTasksLinearTab";
import ProductIssuesLinearTab from "@/components/crm/product/ProductIssuesLinearTab";
import ProductOwnerSummaryField from "@/components/crm/product/ProductOwnerSummaryField";
import ProductResourcesTab from "@/components/crm/product/ProductResourcesTab";
import ProductRoadmapTab from "@/components/crm/product/ProductRoadmapTab";

const TABS = [
  { id: "projects", label: "Project" },
  { id: "tasks", label: "Tasks" },
  { id: "sprints", label: "Sprints" },
  { id: "milestones", label: "Milestones" },
  { id: "roadmap", label: "Roadmap" },
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
  childDeliveryStatusUi: ChildDeliveryStatusUiConfig;
  productMetadata: unknown;
  planLabels?: Record<string, string>;
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
  childDeliveryStatusUi,
  productMetadata,
  planLabels = PLAN_LABELS,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [modalOpen, setModalOpen] = useState(false);
  const [newProjectGroupPreset, setNewProjectGroupPreset] = useState<
    string | undefined
  >(undefined);

  const customProjectStatuses = useMemo(
    () => parseCustomProjectStatuses(productMetadata),
    [productMetadata]
  );

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

  const needsProject =
    activeTab === "milestones" ||
    activeTab === "sprints" ||
    activeTab === "tasks" ||
    activeTab === "roadmap" ||
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
              style={{
                backgroundColor:
                  (PLAN_COLORS as Record<string, string>)[product.plan] ??
                  "#6366f1",
              }}
            >
              {planLabels[product.plan] ?? product.plan}
            </span>
          </MetaField>
          {product.projectType ? (
            <MetaField label="Type">
              <span
                className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${projectTypeBadgeClass(product.projectType)}`}
              >
                {product.projectType}
              </span>
            </MetaField>
          ) : null}
          {(() => {
            const { contact, company } = projectClientNameParts(product);
            const clientHref = product.clientId?.trim()
              ? `/leads?section=clients&client=${encodeURIComponent(product.clientId.trim())}`
              : null;
            const clientLinkClass =
              "rounded-sm font-medium text-accent hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-zinc-900";
            const valueClass =
              "font-medium text-text-primary dark:text-zinc-100";
            const show = (v: string | null) => (v?.trim() ? v.trim() : "—");
            return (
              <>
                <MetaField label="Client name">
                  {clientHref ? (
                    <Link href={clientHref} className={clientLinkClass}>
                      {show(contact)}
                    </Link>
                  ) : (
                    <span className={valueClass}>{show(contact)}</span>
                  )}
                </MetaField>
                <MetaField label="Company name">
                  {clientHref ? (
                    <Link href={clientHref} className={clientLinkClass}>
                      {show(company)}
                    </Link>
                  ) : (
                    <span className={valueClass}>{show(company)}</span>
                  )}
                </MetaField>
              </>
            );
          })()}
          <MetaField label="Owner">
            <ProductOwnerSummaryField
              productId={productId}
              teamId={product.teamId}
              pointOfContactMemberId={product.pointOfContactMemberId ?? null}
              pointOfContactName={product.pointOfContactName ?? null}
            />
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
          <div className="grid w-full grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-[5.5rem_16rem_minmax(0,1fr)] sm:items-center">
            <span
              id="product-detail-project-label"
              className="text-sm font-medium text-text-secondary dark:text-zinc-400"
            >
              Project
            </span>
            <select
              aria-labelledby="product-detail-project-label"
              value={selectedProjectId ?? ""}
              onChange={(e) => {
                const v = e.target.value;
                setQuery({ project: v || null, sprint: null });
              }}
              className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-text-primary dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
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
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setNewProjectGroupPreset(undefined);
                  setModalOpen(true);
                }}
                className="text-sm font-medium text-accent hover:underline"
              >
                + New project
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="flex-1 overflow-auto p-8" role="tabpanel">
        {activeTab === "projects" ? (
          <ProductProjectsGroupedPanel
            productId={productId}
            teamId={product.teamId}
            projects={childrenProjects}
            productMetadata={productMetadata}
            childDeliveryStatusUi={childDeliveryStatusUi}
            onOpenProject={(id) =>
              setQuery({ tab: "tasks", project: id })
            }
            onNewProject={(presetGroupId) => {
              setNewProjectGroupPreset(presetGroupId);
              setModalOpen(true);
            }}
            onDeliveryStatusUiSaved={() => router.refresh()}
            onChildDeliveryChanged={() => router.refresh()}
          />
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
              milestones={milestoneList}
              onOpenTasksForSprint={(sprintId) =>
                setQuery({ tab: "tasks", sprint: sprintId })
              }
              onOpenBacklogTasks={() =>
                setQuery({ tab: "tasks", sprint: "backlog" })
              }
            />
          )
        ) : null}

        {activeTab === "roadmap" ? (
          !selectedProjectId ? (
            <p className="text-sm text-text-secondary">
              Add a project first, then pick it above.
            </p>
          ) : (
            <ProductRoadmapTab
              productId={productId}
              projectId={selectedProjectId}
              childrenProjects={childrenProjects}
              planLabelMap={planLabels}
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
        initialProjectsTabGroupId={newProjectGroupPreset}
        childDeliveryStatusUi={childDeliveryStatusUi}
        customProjectStatuses={customProjectStatuses}
        onClose={() => {
          setModalOpen(false);
          setNewProjectGroupPreset(undefined);
        }}
        onCreated={(id) => {
          setModalOpen(false);
          setNewProjectGroupPreset(undefined);
          router.refresh();
          setQuery({ tab: "milestones", project: id });
        }}
      />
    </div>
  );
}
