"use client";

import { useCallback, useEffect, useState } from "react";
import {
  listDiscoverySections,
  listRoadmapPhases,
} from "@/app/(crm)/actions/product-manager";
import type { ChildDeliveryStatusUiConfig } from "@/lib/crm/child-delivery-status-ui";
import ProductProjectsGroupedPanel from "@/components/crm/product/ProductProjectsGroupedPanel";
import ProductTabHeading from "@/components/crm/product/ProductTabHeading";
import { Loader2 } from "lucide-react";

type ProductChildRow = {
  id: string;
  title: string;
  plan_stage: string | null;
  metadata: unknown;
  target_date?: string | null;
};

type Props = {
  productId: string;
  teamId: string;
  childrenProjects: ProductChildRow[];
  productMetadata: unknown;
  childDeliveryStatusUi: ChildDeliveryStatusUiConfig;
  /** Optional: from server to skip an extra round-trip (see product page). */
  roadmapPhaseCount?: number;
  discoverySectionCount?: number;
  /** When server could not load counts; client may still retry. */
  countsLoadingError?: string | null;
  onOpenProject: (childId: string) => void;
  onNewProject: (presetGroupId?: string) => void;
  onDeliveryStatusUiSaved: () => void;
  onChildDeliveryChanged?: () => void;
};

export default function ProductOverviewTab({
  productId,
  teamId,
  childrenProjects,
  productMetadata,
  childDeliveryStatusUi,
  roadmapPhaseCount: ssrRoadmap,
  discoverySectionCount: ssrDiscovery,
  countsLoadingError: ssrCountsError,
  onOpenProject,
  onNewProject,
  onDeliveryStatusUiSaved,
  onChildDeliveryChanged,
}: Props) {
  const [loading, setLoading] = useState(
    !(typeof ssrRoadmap === "number" && typeof ssrDiscovery === "number")
  );
  const [roadmapCount, setRoadmapCount] = useState<number | null>(
    typeof ssrRoadmap === "number" ? ssrRoadmap : null
  );
  const [discoveryCount, setDiscoveryCount] = useState<number | null>(
    typeof ssrDiscovery === "number" ? ssrDiscovery : null
  );
  const [err, setErr] = useState<string | null>(ssrCountsError ?? null);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    const [r, d] = await Promise.all([
      listRoadmapPhases(productId),
      listDiscoverySections(productId),
    ]);
    if (r.error) setErr(r.error);
    if (d.error && !r.error) setErr(d.error);
    setRoadmapCount(r.rows?.length ?? 0);
    setDiscoveryCount(d.rows?.length ?? 0);
    setLoading(false);
  }, [productId]);

  useEffect(() => {
    if (typeof ssrRoadmap === "number" && typeof ssrDiscovery === "number") {
      setRoadmapCount(ssrRoadmap);
      setDiscoveryCount(ssrDiscovery);
      setErr(ssrCountsError ?? null);
      setLoading(false);
      return;
    }
    void load();
  }, [productId, ssrRoadmap, ssrDiscovery, ssrCountsError, load]);

  const showSpin =
    loading &&
    (roadmapCount === null || discoveryCount === null) &&
    (typeof ssrRoadmap !== "number" || typeof ssrDiscovery !== "number");

  return (
    <div className="space-y-8">
      <ProductTabHeading
        title="Overview"
        description="Delivery health for this product: roadmap shape, discovery coverage, and every child project grouped by status."
      />
      {err ? (
        <p className="text-sm text-amber-700 dark:text-amber-400" role="status">
          {err}
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-xl border border-border bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900/50">
          <p className="text-xs font-medium uppercase tracking-wide text-text-secondary dark:text-zinc-500">
            Child projects
          </p>
          <p className="mt-2 text-2xl font-semibold text-text-primary dark:text-zinc-100">
            {childrenProjects.length}
          </p>
          <p className="mt-1 text-xs text-text-secondary dark:text-zinc-500">
            Active delivery streams under this product.
          </p>
        </div>
        <div className="rounded-xl border border-border bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900/50">
          <p className="text-xs font-medium uppercase tracking-wide text-text-secondary dark:text-zinc-500">
            Roadmap phases
          </p>
          <p className="mt-2 flex items-center gap-2 text-2xl font-semibold text-text-primary dark:text-zinc-100">
            {showSpin && roadmapCount === null ? (
              <Loader2 className="h-6 w-6 animate-spin text-text-secondary" />
            ) : (
              (roadmapCount ?? "—")
            )}
          </p>
          <p className="mt-1 text-xs text-text-secondary dark:text-zinc-500">
            Client-facing phases (Discovery → Launch).{" "}
            <span className="text-text-primary/80 dark:text-zinc-400">
              Agency KPIs (budget burn, workload) — TODO when finance hooks land.
            </span>
          </p>
        </div>
        <div className="rounded-xl border border-border bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900/50">
          <p className="text-xs font-medium uppercase tracking-wide text-text-secondary dark:text-zinc-500">
            Discovery sections
          </p>
          <p className="mt-2 flex items-center gap-2 text-2xl font-semibold text-text-primary dark:text-zinc-100">
            {showSpin && discoveryCount === null ? (
              <Loader2 className="h-6 w-6 animate-spin text-text-secondary" />
            ) : (
              (discoveryCount ?? "—")
            )}
          </p>
          <p className="mt-1 text-xs text-text-secondary dark:text-zinc-500">
            Requirements, goals, personas, and scope notes.
          </p>
        </div>
      </div>

      <ProductProjectsGroupedPanel
        productId={productId}
        teamId={teamId}
        projects={childrenProjects}
        productMetadata={productMetadata}
        childDeliveryStatusUi={childDeliveryStatusUi}
        onOpenProject={onOpenProject}
        onNewProject={onNewProject}
        onDeliveryStatusUiSaved={onDeliveryStatusUiSaved}
        onChildDeliveryChanged={onChildDeliveryChanged}
        showColumnEditor={false}
        hideHeaderNewProjectButton
      />
      <p className="text-xs text-text-secondary dark:text-zinc-500">
        Edit delivery column names & colors in{" "}
        <span className="font-medium text-text-primary dark:text-zinc-300">
          Settings
        </span>
        .
      </p>
    </div>
  );
}
