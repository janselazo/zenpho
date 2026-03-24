"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, X } from "lucide-react";
import NewProjectModal from "@/components/crm/NewProjectModal";
import { fetchDealPrefillForNewProject } from "@/lib/crm/fetch-deal-prefill-for-new-project";
import type { NewProjectDealPrefill } from "@/lib/crm/new-project-deal-prefill";
import type { MockProject } from "@/lib/crm/mock-data";
import {
  readStoredProjects,
  writeStoredProjects,
} from "@/lib/crm/projects-storage";

export default function CrmNewProjectFromDealModal({
  dealId,
  onClose,
}: {
  dealId: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const [prefill, setPrefill] = useState<NewProjectDealPrefill | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    void fetchDealPrefillForNewProject(dealId).then((p) => {
      if (cancelled) return;
      if (!p) {
        setError("Could not load this deal or its lead.");
        setPrefill(null);
      } else {
        setPrefill(p);
      }
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [dealId]);

  function handleAdd(project: MockProject) {
    const prev = readStoredProjects();
    writeStoredProjects([...prev, project]);
    window.dispatchEvent(new Event("crm-projects-changed"));
    onClose();
    router.refresh();
  }

  if (loading) {
    return (
      <div
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/45 p-4 backdrop-blur-[2px]"
        role="presentation"
      >
        <div className="flex items-center gap-3 rounded-2xl border border-border bg-white px-6 py-4 shadow-xl">
          <Loader2 className="h-5 w-5 animate-spin text-accent" aria-hidden />
          <span className="text-sm text-text-primary">Loading project form…</span>
        </div>
      </div>
    );
  }

  if (error || !prefill) {
    return (
      <div
        className="fixed inset-0 z-[100] flex items-end justify-center bg-black/45 p-4 backdrop-blur-[2px] sm:items-center"
        onClick={onClose}
        onKeyDown={(e) => e.key === "Escape" && onClose()}
        role="presentation"
        tabIndex={-1}
      >
        <div
          role="alertdialog"
          aria-labelledby="deal-project-error-title"
          className="w-full max-w-md rounded-2xl border border-border bg-white p-6 shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-start justify-between gap-3">
            <h2
              id="deal-project-error-title"
              className="text-lg font-semibold text-text-primary"
            >
              Can’t create project
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1 text-text-secondary hover:bg-surface"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <p className="mt-2 text-sm text-text-secondary">
            {error ?? "Something went wrong."}
          </p>
          <button
            type="button"
            onClick={onClose}
            className="mt-6 w-full rounded-xl border border-border bg-white py-2.5 text-sm font-medium text-text-primary hover:bg-surface"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <NewProjectModal
      dealPrefill={prefill}
      onClose={onClose}
      onAdd={handleAdd}
    />
  );
}
