"use client";

import { BadgeCheck, Palette } from "lucide-react";
import ProspectingTabbedShell from "@/components/crm/prospecting/ProspectingTabbedShell";
import ProspectsIntelligenceView from "@/components/crm/prospecting/ProspectsIntelligenceView";
import RevenueLeakAuditClient from "@/components/revenue-leak-audit/RevenueLeakAuditClient";
import type { MergedCrmFieldOptions } from "@/lib/crm/field-options";

export default function ToolsPageClient({
  fieldOptions,
  googleMapsApiKey,
}: {
  fieldOptions: MergedCrmFieldOptions;
  googleMapsApiKey: string | null;
}) {
  return (
    <ProspectingTabbedShell
      title="Tools"
      description="Run the client-facing tools Zenpho uses for audits, prospect research, and brand generation."
      ariaLabel="Tools"
      tabs={[
        {
          id: "revenue-leak-audit",
          label: "Revenue Leak Audit",
          icon: BadgeCheck,
          body: <RevenueLeakAuditClient googleMapsApiKey={googleMapsApiKey} />,
        },
        {
          id: "branding-generation",
          label: "Branding Generation",
          icon: Palette,
          body: (
            <ProspectsIntelligenceView
              fieldOptions={fieldOptions}
              toolsMode
            />
          ),
        },
      ]}
    />
  );
}
