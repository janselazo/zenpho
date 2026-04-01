"use client";

import { useRouter } from "next/navigation";
import NewProjectModal from "@/components/crm/NewProjectModal";
import type { MockProject } from "@/lib/crm/mock-data";
import { createCrmProject } from "@/app/(crm)/actions/projects";
import { crmPayloadFromMock } from "@/lib/crm/map-project-row";
import {
  readStoredProjects,
  writeStoredProjects,
  CRM_SUPABASE_PROJECTS_CHANGED_EVENT,
} from "@/lib/crm/projects-storage";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import type { MergedCrmFieldOptions } from "@/lib/crm/field-options";

export default function CrmNewProjectForClientModal({
  clientId,
  clientName,
  company,
  fieldOptions,
  onClose,
}: {
  clientId: string;
  clientName: string;
  company: string | null;
  fieldOptions?: MergedCrmFieldOptions;
  onClose: () => void;
}) {
  const router = useRouter();
  const titleHint =
    company?.trim() || clientName.trim() || "New project";

  async function handleAdd(project: MockProject) {
    if (isSupabaseConfigured()) {
      const res = await createCrmProject(crmPayloadFromMock(project));
      if ("error" in res) {
        alert(res.error);
        return;
      }
      window.dispatchEvent(new Event(CRM_SUPABASE_PROJECTS_CHANGED_EVENT));
      onClose();
      router.refresh();
      return;
    }
    const prev = readStoredProjects();
    writeStoredProjects([...prev, project]);
    window.dispatchEvent(new Event("crm-projects-changed"));
    onClose();
    router.refresh();
  }

  return (
    <NewProjectModal
      dealPrefill={null}
      lockedClientId={clientId}
      lockedClientTitleHint={titleHint}
      planStageOrder={fieldOptions?.productPlanStageOrder}
      planLabels={fieldOptions?.productPlanLabels}
      onClose={onClose}
      onAdd={handleAdd}
    />
  );
}
