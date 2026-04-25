"use client";

import SignalSearchPanel from "@/components/crm/prospecting/startup-signals/SignalSearchPanel";

export default function LinkedInActivitySignalsTab() {
  return (
    <SignalSearchPanel
      title="LinkedIn Activity"
      description="Monitor LinkedIn profile visitors, notifications, and post engagers when an approved LinkedIn integration is connected."
      channel="linkedin_activity"
      sourceOptions={[{ id: "linkedin_activity", label: "LinkedIn Activity" }]}
      defaultSources={["linkedin_activity"]}
      defaultKeywords={["profile visitor", "post engager", "notification"]}
      emptyText="Connect approved LinkedIn access to monitor profile visitors, notifications, and post engagers."
    />
  );
}
