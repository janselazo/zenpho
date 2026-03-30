"use client";

import { use } from "react";
import { ProjectDetailClient } from "@/components/crm/project/ProjectDetailClient";

export default function PhaseWorkspacePage({
  params,
}: {
  params: Promise<{ productId: string; phaseId: string }>;
}) {
  const { productId, phaseId } = use(params);
  return <ProjectDetailClient productId={productId} phaseId={phaseId} />;
}
