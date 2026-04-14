import { Video } from "lucide-react";
import ComingSoonModule from "@/components/crm/prospecting/ComingSoonModule";

export const dynamic = "force-dynamic";

const FEATURES = [
  "Templates for short-form (Reels, Shorts) and long-form explainers",
  "Captions, aspect ratios, and safe zones per platform in one place",
  "Versioning and approvals before anything ships to campaigns or Playbook",
];

export default function ContentMarketingVideosPage() {
  return (
    <ComingSoonModule
      title="Videos"
      description="Plan and store video creatives for content marketing—hooks, bumpers, and exports tuned for each channel."
      features={FEATURES}
      icon={Video}
    />
  );
}
