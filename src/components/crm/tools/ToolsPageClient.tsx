"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { BadgeCheck, Megaphone, Palette } from "lucide-react";
import ProspectingTabbedShell from "@/components/crm/prospecting/ProspectingTabbedShell";
import RevenueLeakAuditClient from "@/components/revenue-leak-audit/RevenueLeakAuditClient";
import BrandingFunnelGenerator from "@/components/crm/tools/BrandingFunnelGenerator";
import MetaAdIntelModule from "@/components/crm/meta-ad-intel/MetaAdIntelModule";

const TOOL_TAB_IDS = ["revenue-leak-audit", "branding-generation", "meta-ad-intel"] as const;
type ToolTabId = (typeof TOOL_TAB_IDS)[number];

function isToolTabId(value: string | null): value is ToolTabId {
  return TOOL_TAB_IDS.includes(value as ToolTabId);
}

function ToolsPageClientInner({
  googleMapsApiKey,
}: {
  googleMapsApiKey: string | null;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tabFromUrl = searchParams.get("tab");

  const tabs = useMemo(
    () => [
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
      {
        id: "meta-ad-intel",
        label: "Meta Ad Intelligence",
        icon: Megaphone,
        body: (
          <Suspense fallback={<div className="text-sm text-text-secondary">Loading…</div>}>
            <MetaAdIntelModule />
          </Suspense>
        ),
      },
    ],
    [googleMapsApiKey],
  );

  const defaultTabId: ToolTabId = "revenue-leak-audit";
  const [activeTab, setActiveTab] = useState<ToolTabId>(
    isToolTabId(tabFromUrl) ? tabFromUrl : defaultTabId,
  );

  useEffect(() => {
    if (isToolTabId(tabFromUrl)) setActiveTab(tabFromUrl);
  }, [tabFromUrl]);

  const onActiveTabChange = useCallback(
    (tabId: string) => {
      if (!isToolTabId(tabId)) return;
      setActiveTab(tabId);
      const params = new URLSearchParams(searchParams.toString());
      if (tabId === defaultTabId) params.delete("tab");
      else params.set("tab", tabId);
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [defaultTabId, pathname, router, searchParams],
  );

  return (
    <ProspectingTabbedShell
      title="Tools"
      description="Run the client-facing tools Zenpho uses for audits, brand kit generation, and paid media intelligence."
      ariaLabel="Tools"
      tabs={tabs}
      activeTab={activeTab}
      onActiveTabChange={onActiveTabChange}
    />
  );
}

export default function ToolsPageClient({
  googleMapsApiKey,
}: {
  googleMapsApiKey: string | null;
}) {
  return (
    <Suspense fallback={<div className="text-sm text-text-secondary">Loading…</div>}>
      <ToolsPageClientInner googleMapsApiKey={googleMapsApiKey} />
    </Suspense>
  );
}
