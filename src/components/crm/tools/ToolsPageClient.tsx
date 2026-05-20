"use client";

import { BadgeCheck, Palette } from "lucide-react";
import ProspectingTabbedShell from "@/components/crm/prospecting/ProspectingTabbedShell";
import RevenueLeakAuditClient from "@/components/revenue-leak-audit/RevenueLeakAuditClient";
import BrandingFunnelGenerator from "@/components/crm/tools/BrandingFunnelGenerator";

export default function ToolsPageClient({
  googleMapsApiKey,
}: {
  googleMapsApiKey: string | null;
}) {
  return (
    <ProspectingTabbedShell
      title="Tools"
      description="Run the client-facing tools Zenpho uses for audits and brand kit generation."
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
          body: <BrandingFunnelGenerator />,
        },
      ]}
    />
  );
}
