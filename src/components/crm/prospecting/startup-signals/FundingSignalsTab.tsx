"use client";

import SignalSearchPanel from "@/components/crm/prospecting/startup-signals/SignalSearchPanel";

export default function FundingSignalsTab() {
  return (
    <SignalSearchPanel
      title="Funding"
      description="Monitor fresh funding and new startup listings so you can reach founders right after budget or momentum appears."
      channel="funding"
      sourceOptions={[
        { id: "crunchbase", label: "Crunchbase" },
        { id: "wellfound", label: "Wellfound / AngelList" },
      ]}
      defaultSources={["crunchbase", "wellfound"]}
      defaultKeywords={["seed funding", "raised", "pre-seed", "series a"]}
      emptyText="Search funding signals to find founders with fresh budget and likely development needs."
    />
  );
}
