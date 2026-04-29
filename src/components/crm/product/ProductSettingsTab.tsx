"use client";

import { useCallback, useEffect, useState } from "react";
import {
  createWorkflowStatus,
  deleteWorkflowStatus,
  importWorkspaceFromBrowser,
  listWorkflowStatuses,
  migrateChildMilestonesToReleases,
  migrateProductResourcesToPmTable,
} from "@/app/(crm)/actions/product-manager";
import ProductProjectsGroupedPanel from "@/components/crm/product/ProductProjectsGroupedPanel";
import ProductTabHeading from "@/components/crm/product/ProductTabHeading";
import type { ChildDeliveryStatusUiConfig } from "@/lib/crm/child-delivery-status-ui";
import { readProjectWorkspace } from "@/lib/crm/project-workspace-storage";
import { Loader2 } from "lucide-react";

type ProductChildRow = {
  id: string;
  title: string;
  plan_stage: string | null;
  metadata: unknown;
  target_date?: string | null;
};

export default function ProductSettingsTab({
  productId,
  teamId,
  selectedChildId,
  childrenProjects,
  productMetadata,
  childDeliveryStatusUi,
  onNewProject,
  onDeliveryStatusUiSaved,
}: {
  productId: string;
  teamId: string;
  selectedChildId: string | null;
  childrenProjects: ProductChildRow[];
  productMetadata: unknown;
  childDeliveryStatusUi: ChildDeliveryStatusUiConfig;
  onNewProject: (preset?: string) => void;
  onDeliveryStatusUiSaved: () => void;
}) {
  const [wf, setWf] = useState<Record<string, unknown>[]>([]);
  const [wfLoading, setWfLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [slug, setSlug] = useState("");
  const [label, setLabel] = useState("");

  const loadWf = useCallback(async () => {
    if (!selectedChildId) {
      setWf([]);
      return;
    }
    setWfLoading(true);
    const res = await listWorkflowStatuses(
      productId,
      selectedChildId,
      "task_board"
    );
    setWfLoading(false);
    if (res.error) setErr(res.error);
    else setWf(res.rows);
  }, [productId, selectedChildId]);

  useEffect(() => {
    void loadWf();
  }, [loadWf]);

  async function runMigrateMilestones() {
    if (!selectedChildId) return;
    setBusy("milestones");
    setErr(null);
    setMsg(null);
    const res = await migrateChildMilestonesToReleases(
      productId,
      selectedChildId
    );
    setBusy(null);
    if ("error" in res) {
      setErr(res.error);
    } else {
      setMsg(`Created ${res.created} release(s) from metadata milestones.`);
    }
  }

  async function runMigrateResources() {
    setBusy("resources");
    setErr(null);
    setMsg(null);
    const res = await migrateProductResourcesToPmTable(productId);
    setBusy(null);
    if ("error" in res) {
      setErr(res.error);
    } else {
      setMsg(`Imported ${res.created} structured resource row(s).`);
    }
  }

  async function runImportWorkspace() {
    if (!selectedChildId) return;
    setBusy("import");
    setErr(null);
    setMsg(null);
    const w = readProjectWorkspace(selectedChildId);
    const res = await importWorkspaceFromBrowser(productId, selectedChildId, {
      sprints: w.sprints.map((s) => ({
        id: s.id,
        name: s.name,
        milestone: s.milestone,
        startDate: s.startDate,
        endDate: s.endDate,
        isCurrent: s.isCurrent,
      })),
      tasks: w.tasks.map((t) => ({
        id: t.id,
        title: t.title,
        status: t.status,
        sprintId: t.sprintId,
        description: t.description,
        priority: t.priority ?? undefined,
        estimateHours: t.estimateHours ?? undefined,
        assigneeId: t.assigneeId ?? undefined,
        endDate: t.endDate,
        productMilestoneId: t.productMilestoneId ?? undefined,
      })),
    });
    setBusy(null);
    if ("error" in res) {
      setErr(res.error);
    } else {
      setMsg(
        `Imported ${res.imported.sprints} sprint(s) and ${res.imported.tasks} task(s).`
      );
    }
  }

  async function addWf(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedChildId) return;
    const s = slug.trim().toLowerCase().replace(/\s+/g, "_");
    const l = label.trim();
    if (!s || !l) return;
    setBusy("wf");
    const res = await createWorkflowStatus(productId, selectedChildId, {
      domain: "task_board",
      slug: s,
      label: l,
    });
    setBusy(null);
    if ("error" in res && res.error) setErr(res.error);
    else {
      setSlug("");
      setLabel("");
      await loadWf();
    }
  }

  return (
    <div className="space-y-10">
      <ProductTabHeading
        title="Settings"
        description="Delivery column customization, data migration, and optional workflow overrides for this product."
      />

      {msg ? (
        <p className="text-sm text-emerald-700 dark:text-emerald-400">{msg}</p>
      ) : null}
      {err ? (
        <p className="text-sm text-red-600 dark:text-red-400">{err}</p>
      ) : null}

      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-text-primary dark:text-zinc-100">
          Project status columns
        </h3>
        <p className="text-xs text-text-secondary dark:text-zinc-500">
          Edit labels, colors, and custom statuses for the overview board.
        </p>
        <ProductProjectsGroupedPanel
          productId={productId}
          teamId={teamId}
          projects={childrenProjects}
          productMetadata={productMetadata}
          childDeliveryStatusUi={childDeliveryStatusUi}
          onOpenProject={() => {}}
          onNewProject={onNewProject}
          onDeliveryStatusUiSaved={onDeliveryStatusUiSaved}
          toolbarOnly
          showColumnEditor
          hideHeaderNewProjectButton
        />
      </section>

      <section className="space-y-3 rounded-xl border border-border bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900/60">
        <h3 className="text-sm font-semibold text-text-primary dark:text-zinc-100">
          Data migration
        </h3>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={!selectedChildId || busy === "milestones"}
            onClick={() => void runMigrateMilestones()}
            className="rounded-lg border border-border px-3 py-2 text-sm font-medium dark:border-zinc-600 disabled:opacity-50"
          >
            {busy === "milestones" ? (
              <Loader2 className="inline h-4 w-4 animate-spin" />
            ) : null}{" "}
            Milestones → releases
          </button>
          <button
            type="button"
            disabled={busy === "resources"}
            onClick={() => void runMigrateResources()}
            className="rounded-lg border border-border px-3 py-2 text-sm font-medium dark:border-zinc-600 disabled:opacity-50"
          >
            Product links → PM resources
          </button>
          <button
            type="button"
            disabled={!selectedChildId || busy === "import"}
            onClick={() => void runImportWorkspace()}
            className="rounded-lg border border-border px-3 py-2 text-sm font-medium dark:border-zinc-600 disabled:opacity-50"
          >
            Import browser workspace
          </button>
        </div>
      </section>

      <section className="space-y-3 rounded-xl border border-border bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900/60">
        <h3 className="text-sm font-semibold text-text-primary dark:text-zinc-100">
          Task board column overrides (optional)
        </h3>
        {!selectedChildId ? (
          <p className="text-sm text-text-secondary">Select a project above.</p>
        ) : wfLoading ? (
          <Loader2 className="h-5 w-5 animate-spin text-text-secondary" />
        ) : (
          <ul className="space-y-2 text-sm">
            {wf.length === 0 ? (
              <li className="text-text-secondary dark:text-zinc-500">
                No overrides yet.
              </li>
            ) : (
              wf.map((r) => (
                <li
                  key={String(r.id)}
                  className="flex items-center justify-between gap-2"
                >
                  <span>
                    <span className="font-mono text-xs text-text-secondary">
                      {String(r.slug)}
                    </span>{" "}
                    — {String(r.label)}
                  </span>
                  <button
                    type="button"
                    className="text-xs text-red-600 hover:underline dark:text-red-400"
                    onClick={() =>
                      void (async () => {
                        const res = await deleteWorkflowStatus(
                          productId,
                          String(r.id)
                        );
                        if ("error" in res && res.error) setErr(res.error);
                        else await loadWf();
                      })()
                    }
                  >
                    Remove
                  </button>
                </li>
              ))
            )}
          </ul>
        )}
        <form onSubmit={addWf} className="flex flex-wrap items-end gap-2">
          <input
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="slug"
            className="rounded-lg border border-border px-2 py-1 text-sm dark:border-zinc-600 dark:bg-zinc-800"
          />
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Label"
            className="rounded-lg border border-border px-2 py-1 text-sm dark:border-zinc-600 dark:bg-zinc-800"
          />
          <button
            type="submit"
            disabled={!selectedChildId || busy === "wf"}
            className="rounded-lg bg-accent px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-50"
          >
            Add override
          </button>
        </form>
      </section>
    </div>
  );
}
