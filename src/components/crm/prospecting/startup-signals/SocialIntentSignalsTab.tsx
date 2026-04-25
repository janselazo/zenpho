"use client";

import SignalSearchPanel from "@/components/crm/prospecting/startup-signals/SignalSearchPanel";

export default function SocialIntentSignalsTab() {
  return (
    <SignalSearchPanel
      title="Social Intent"
      description="Search founder conversations across LinkedIn public search, X, Facebook Groups, Reddit, and Indie Hackers for people asking for developers, agencies, MVP help, or rebuild advice."
      channel="social_intent"
      sourceOptions={[
        { id: "linkedin_public", label: "LinkedIn public" },
        { id: "x_twitter", label: "X / Twitter" },
        { id: "facebook_groups", label: "Facebook Groups" },
        { id: "reddit", label: "Reddit" },
        { id: "indie_hackers", label: "Indie Hackers" },
      ]}
      defaultSources={["linkedin_public", "x_twitter", "reddit", "indie_hackers"]}
      defaultKeywords={[
        "looking for developer",
        "need an agency",
        "MVP",
        "technical cofounder",
        "no-code",
      ]}
      emptyText="Search social intent to find founders asking for development help at the moment they need it."
    />
  );
}
