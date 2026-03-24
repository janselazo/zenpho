"use client";

import { useRouter } from "next/navigation";
import NewProjectModal from "@/components/crm/NewProjectModal";
import type { MockProject } from "@/lib/crm/mock-data";
import {
  readStoredProjects,
  writeStoredProjects,
} from "@/lib/crm/projects-storage";

export default function CrmNewProjectForClientModal({
  clientId,
  clientName,
  company,
  onClose,
}: {
  clientId: string;
  clientName: string;
  company: string | null;
  onClose: () => void;
}) {
  const router = useRouter();
  const titleHint =
    company?.trim() || clientName.trim() || "New project";

  function handleAdd(project: MockProject) {
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
      onClose={onClose}
      onAdd={handleAdd}
    />
  );
}
