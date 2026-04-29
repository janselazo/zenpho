"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { updateProductResources } from "@/app/(crm)/actions/projects";
import {
  createPmResource,
  deletePmResource,
  listPmResources,
  updatePmResource,
} from "@/app/(crm)/actions/product-manager";
import type { WorkspaceResource } from "@/lib/crm/project-workspace-types";
import type { PmResourceCategory } from "@/lib/crm/product-manager-types";
import ProjectResourcesView from "@/components/crm/project/ProjectResourcesView";
import ProductTabHeading from "@/components/crm/product/ProductTabHeading";
import { Loader2, Plus, Trash2 } from "lucide-react";

const PM_SECTIONS: { id: PmResourceCategory; label: string }[] = [
  { id: "team", label: "Team" },
  { id: "roles", label: "Roles / permissions" },
  { id: "capacity", label: "Capacity" },
  { id: "files", label: "Project files" },
  { id: "links", label: "Links" },
  { id: "credentials", label: "Credentials" },
  { id: "tech_stack", label: "Tech stack" },
  { id: "environments", label: "Environments" },
  { id: "brand", label: "Brand assets" },
  { id: "meetings", label: "Meeting notes" },
];

type Props = {
  productId: string;
  initialResources: WorkspaceResource[];
};

type PmRow = {
  id: string;
  category: string;
  label: string;
  body: string | null;
  url: string | null;
  is_secret: boolean;
  secret_placeholder: string | null;
};

export default function ProductResourcesTab({
  productId,
  initialResources,
}: Props) {
  const router = useRouter();
  const [resources, setResources] = useState<WorkspaceResource[]>(
    initialResources
  );
  const [pmRows, setPmRows] = useState<PmRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [pmLoading, setPmLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<
    Partial<Record<PmResourceCategory, string>>
  >({});

  useEffect(() => {
    setResources(initialResources);
  }, [initialResources]);

  const loadPm = useCallback(async () => {
    setPmLoading(true);
    const res = await listPmResources(productId);
    setPmLoading(false);
    if (res.error) setError(res.error);
    else
      setPmRows(
        (res.rows as Record<string, unknown>[]).map((r) => ({
          id: String(r.id),
          category: String(r.category),
          label: String(r.label ?? ""),
          body: r.body != null ? String(r.body) : null,
          url: r.url != null ? String(r.url) : null,
          is_secret: Boolean(r.is_secret),
          secret_placeholder:
            r.secret_placeholder != null ? String(r.secret_placeholder) : null,
        }))
      );
  }, [productId]);

  useEffect(() => {
    void loadPm();
  }, [loadPm]);

  async function persist(next: WorkspaceResource[]) {
    setSaving(true);
    setError(null);
    const res = await updateProductResources(productId, next);
    setSaving(false);
    if ("error" in res && res.error) {
      setError(res.error);
      return;
    }
    setResources(next);
    router.refresh();
  }

  async function addPmRow(category: PmResourceCategory) {
    const label = (drafts[category] ?? "").trim();
    if (!label) return;
    const res = await createPmResource(productId, {
      category,
      label,
    });
    if ("error" in res && res.error) setError(res.error);
    else {
      setDrafts((d) => ({ ...d, [category]: "" }));
      await loadPm();
    }
  }

  return (
    <div className="space-y-8">
      <ProductTabHeading
        title="Resources"
        description="Product-wide links and structured runbooks—team, access, files, credentials (masked), and environments."
      />
      {error ? (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      ) : null}

      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-text-primary dark:text-zinc-100">
          Quick links (metadata)
        </h3>
        <div className="flex items-center gap-2 text-sm text-text-secondary">
          <p>Links stored on the product record (legacy JSON).</p>
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          ) : null}
        </div>
        <ProjectResourcesView
          resources={resources}
          onAdd={(label, url, kind) => {
            const id =
              typeof crypto !== "undefined" && crypto.randomUUID
                ? crypto.randomUUID()
                : `res-${Date.now()}`;
            void persist([...resources, { id, label, url, kind }]);
          }}
          onUpdate={(id, label, url, kind) =>
            void persist(
              resources.map((r) =>
                r.id === id ? { ...r, label, url, kind } : r
              )
            )
          }
          onDelete={(id) => void persist(resources.filter((r) => r.id !== id))}
        />
      </section>

      <section className="space-y-6">
        <h3 className="text-sm font-semibold text-text-primary dark:text-zinc-100">
          Structured resources (Supabase)
        </h3>
        {pmLoading ? (
          <Loader2 className="h-5 w-5 animate-spin text-text-secondary" />
        ) : (
          PM_SECTIONS.map((sec) => {
            const rows = pmRows.filter((r) => r.category === sec.id);
            return (
              <div
                key={sec.id}
                className="rounded-xl border border-border bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900/60"
              >
                <h4 className="text-sm font-medium text-text-primary dark:text-zinc-100">
                  {sec.label}
                </h4>
                <div className="mt-2 flex gap-2">
                  <input
                    value={drafts[sec.id] ?? ""}
                    onChange={(e) =>
                      setDrafts((d) => ({ ...d, [sec.id]: e.target.value }))
                    }
                    placeholder="Add label…"
                    className="flex-1 rounded-lg border border-border px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-800"
                  />
                  <button
                    type="button"
                    onClick={() => void addPmRow(sec.id)}
                    className="inline-flex items-center gap-1 rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-white"
                  >
                    <Plus className="h-4 w-4" />
                    Add
                  </button>
                </div>
                <ul className="mt-3 space-y-2 text-sm">
                  {rows.length === 0 ? (
                    <li className="text-text-secondary dark:text-zinc-500">
                      None yet.
                    </li>
                  ) : (
                    rows.map((r) => (
                      <li
                        key={r.id}
                        className="flex flex-col gap-1 rounded-lg border border-border/80 p-2 dark:border-zinc-700"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="font-medium text-text-primary dark:text-zinc-100">
                            {r.label}
                          </span>
                          <button
                            type="button"
                            className="text-text-secondary hover:text-red-600 dark:hover:text-red-400"
                            aria-label="Delete"
                            onClick={() =>
                              void (async () => {
                                const res = await deletePmResource(
                                  productId,
                                  r.id
                                );
                                if ("error" in res && res.error)
                                  setError(res.error);
                                else await loadPm();
                              })()
                            }
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                        {r.is_secret ? (
                          <p className="text-xs text-amber-700 dark:text-amber-400">
                            {r.secret_placeholder || "•••••••• (secret placeholder only)"}
                          </p>
                        ) : null}
                        {r.url ? (
                          <a
                            href={r.url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs text-accent hover:underline"
                          >
                            {r.url}
                          </a>
                        ) : null}
                        <textarea
                          defaultValue={r.body ?? ""}
                          onBlur={(e) =>
                            void (async () => {
                              const v = e.target.value;
                              if (v === (r.body ?? "")) return;
                              const res = await updatePmResource(productId, r.id, {
                                body: v,
                              });
                              if ("error" in res && res.error)
                                setError(res.error);
                              else await loadPm();
                            })()
                          }
                          className="mt-1 min-h-[52px] w-full rounded border border-border bg-transparent px-2 py-1 text-xs dark:border-zinc-600"
                          placeholder="Notes…"
                        />
                      </li>
                    ))
                  )}
                </ul>
              </div>
            );
          })
        )}
      </section>
    </div>
  );
}
