"use client";

import SignalSearchPanel from "@/components/crm/prospecting/startup-signals/SignalSearchPanel";

export default function LaunchSignalsTab() {
  return (
    <SignalSearchPanel
      title="Launches"
      description="Watch Product Hunt and TechCrunch for founders launching MVPs, early products, and press-worthy startup moments."
      channel="launches"
      sourceOptions={[
        { id: "product_hunt", label: "Product Hunt" },
        { id: "techcrunch", label: "TechCrunch" },
      ]}
      defaultSources={["product_hunt", "techcrunch"]}
      defaultKeywords={["MVP", "launched", "AI", "SaaS", "startup funding"]}
      emptyText="Search launch signals to catch founders right after they ship or get press."
    />
  );
}
