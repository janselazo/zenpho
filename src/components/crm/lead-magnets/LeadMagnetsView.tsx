"use client";

import { useMemo, useState } from "react";
import { Bookmark, Lightbulb } from "lucide-react";
import IconTabBar from "@/components/crm/prospecting/IconTabBar";
import LeadMagnetsDiscoverPanel from "@/components/crm/lead-magnets/LeadMagnetsDiscoverPanel";
import LeadMagnetsSavedPanel from "@/components/crm/lead-magnets/LeadMagnetsSavedPanel";

const TAB_DISCOVER = "discover";
const TAB_SAVED = "saved";

export default function LeadMagnetsView() {
  const [active, setActive] = useState(TAB_DISCOVER);
  const [savedRefreshKey, setSavedRefreshKey] = useState(0);

  const bumpSaved = () => setSavedRefreshKey((k) => k + 1);

  const intro = useMemo(
    () =>
      "Pick an industry and optional niche, then generate lead-magnet concepts using live web snippets (Reddit, Google-style results, long-tail queries) plus OpenAI — built for Zenpho’s agency pipeline. Bookmark ideas or add your own; review them in Saved.",
    []
  );

  return (
    <div>
      <h1 className="heading-display text-2xl font-bold text-text-primary dark:text-zinc-100">
        Lead magnets
      </h1>
      <p className="mt-1 max-w-2xl text-sm text-text-secondary dark:text-zinc-400">
        {intro}
      </p>

      <div className="mt-6">
        <IconTabBar
          ariaLabel="Lead magnets sections"
          tabs={[
            { id: TAB_DISCOVER, label: "Discover", icon: Lightbulb },
            { id: TAB_SAVED, label: "Saved", icon: Bookmark },
          ]}
          activeTab={active}
          onTabChange={setActive}
        />
      </div>

      <div
        id={`${TAB_DISCOVER}-panel`}
        role="tabpanel"
        aria-labelledby={`${TAB_DISCOVER}-tab`}
        hidden={active !== TAB_DISCOVER}
        className="mt-6"
      >
        <LeadMagnetsDiscoverPanel onSaved={bumpSaved} />
      </div>

      <div
        id={`${TAB_SAVED}-panel`}
        role="tabpanel"
        aria-labelledby={`${TAB_SAVED}-tab`}
        hidden={active !== TAB_SAVED}
        className="mt-6"
      >
        <LeadMagnetsSavedPanel
          refreshKey={savedRefreshKey}
          active={active === TAB_SAVED}
        />
      </div>
    </div>
  );
}
