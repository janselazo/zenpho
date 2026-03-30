"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { updateProductResources } from "@/app/(crm)/actions/projects";
import type { WorkspaceResource } from "@/lib/crm/project-workspace-types";
import ProjectResourcesView from "@/components/crm/project/ProjectResourcesView";
import { Loader2 } from "lucide-react";

type Props = {
  productId: string;
  initialResources: WorkspaceResource[];
};

export default function ProductResourcesTab({
  productId,
  initialResources,
}: Props) {
  const router = useRouter();
  const [resources, setResources] = useState<WorkspaceResource[]>(
    initialResources
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setResources(initialResources);
  }, [initialResources]);

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

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <p className="text-sm text-text-secondary dark:text-zinc-500">
          Links and files for this product (shared across all projects).
        </p>
        {saving ? (
          <Loader2 className="h-4 w-4 animate-spin text-text-secondary" aria-hidden />
        ) : null}
      </div>
      {error ? (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      ) : null}
      <ProjectResourcesView
        resources={resources}
        onAdd={(label, url, kind) => {
          const id =
            typeof crypto !== "undefined" && crypto.randomUUID
              ? crypto.randomUUID()
              : `res-${Date.now()}`;
          void persist([
            ...resources,
            { id, label, url, kind },
          ]);
        }}
        onDelete={(id) => void persist(resources.filter((r) => r.id !== id))}
      />
    </div>
  );
}
