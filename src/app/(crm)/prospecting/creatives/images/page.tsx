import { ImageIcon } from "lucide-react";
import ComingSoonModule from "@/components/crm/prospecting/ComingSoonModule";

export const dynamic = "force-dynamic";

const FEATURES = [
  "Centralized image library with search by campaign, offer, and ICP segment",
  "Brand kits, aspect-ratio presets, and safe zones for Meta, LinkedIn, and display",
  "Reuse and resize creatives across sequences without leaving Prospecting",
];

export default function ContentMarketingImagesPage() {
  return (
    <ComingSoonModule
      title="Images"
      description="Stock uploads, generated visuals, and on-brand templates for ads, social, and outbound—organized for content marketing workflows."
      features={FEATURES}
      icon={ImageIcon}
    />
  );
}
