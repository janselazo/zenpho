"use client";

import type { LucideIcon } from "lucide-react";
import ProspectingPendingContent from "@/components/crm/prospecting/ProspectingPendingContent";

interface ComingSoonModuleProps {
  title: string;
  description: string;
  features: string[];
  icon: LucideIcon;
}

export default function ComingSoonModule({
  title,
  description,
  features,
  icon,
}: ComingSoonModuleProps) {
  return (
    <ProspectingPendingContent
      title={title}
      description={description}
      features={features}
      icon={icon}
      titleLevel="page"
    />
  );
}
