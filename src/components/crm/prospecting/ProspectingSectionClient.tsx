"use client";

import { Globe2, MapPin } from "lucide-react";
import {
  getProspectingSection,
  type ProspectingSectionSlug,
} from "@/lib/crm/prospecting-nav";
import ColdOutreachView from "@/components/crm/prospecting/ColdOutreachView";
import ProspectsIntelligenceView from "@/components/crm/prospecting/ProspectsIntelligenceView";
import type { MergedCrmFieldOptions } from "@/lib/crm/field-options";
import NetworkingEventsView from "@/components/crm/prospecting/NetworkingEventsView";
import ComingSoonModule from "@/components/crm/prospecting/ComingSoonModule";
import ProspectingPendingContent from "@/components/crm/prospecting/ProspectingPendingContent";
import ProspectingTabbedShell from "@/components/crm/prospecting/ProspectingTabbedShell";

const NETWORKING_ONLINE_FEATURES = [
  "Virtual summits, webinars, and community-led networking",
  "Saved lists and reminders tied to Playbook",
  "Discover online events and communities from major platforms",
  "Integrations — wiring in a later phase",
];

export default function ProspectingSectionClient({
  slug,
  fieldOptions,
  playbookTab,
}: {
  slug: ProspectingSectionSlug;
  fieldOptions: MergedCrmFieldOptions;
  /** From `?tab=` on `/prospecting/playbook` (e.g. `journal`). */
  playbookTab?: string;
}) {
  const section = getProspectingSection(slug);
  if (!section) return null;

  if (slug === "playbook") {
    return <ColdOutreachView initialSubTab={playbookTab} />;
  }

  if (slug === "prospects") {
    return <ProspectsIntelligenceView fieldOptions={fieldOptions} />;
  }

  if (slug === "networking") {
    return (
      <ProspectingTabbedShell
        title="Networking"
        description={section.description}
        ariaLabel="Networking"
        tabs={[
          {
            id: "offline",
            label: "Offline",
            icon: MapPin,
            body: <NetworkingEventsView embedded />,
          },
          {
            id: "online",
            label: "Online",
            icon: Globe2,
            body: (
              <ProspectingPendingContent
                title="Online networking"
                description="Virtual events, communities, and digital networking — discovery and saved lists will appear here in a later phase."
                features={NETWORKING_ONLINE_FEATURES}
                icon={Globe2}
                titleLevel="tab"
              />
            ),
          },
        ]}
      />
    );
  }

  if (section.soon && section.comingSoonFeatures?.length) {
    return (
      <ComingSoonModule
        title={section.label}
        description={section.description}
        features={section.comingSoonFeatures}
        icon={section.icon}
      />
    );
  }

  return null;
}
