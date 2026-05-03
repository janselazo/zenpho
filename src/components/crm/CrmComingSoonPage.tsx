"use client";

import type { LucideIcon } from "lucide-react";
import {
  Calculator,
  Gift,
  Handshake,
  MailPlus,
  MessageCircle,
  PieChart,
  Receipt,
  Star,
  TrendingUp,
} from "lucide-react";
import ProspectingPendingContent from "@/components/crm/prospecting/ProspectingPendingContent";
import type { PlaceholderPageCopy } from "@/lib/crm/placeholder-pages";

const ICONS: Record<string, LucideIcon> = {
  calculator: Calculator,
  receipt: Receipt,
  trendingUp: TrendingUp,
  pieChart: PieChart,
  star: Star,
  handshake: Handshake,
  gift: Gift,
  mailPlus: MailPlus,
  messageCircle: MessageCircle,
};

export default function CrmComingSoonPage(props: PlaceholderPageCopy) {
  const Icon = ICONS[props.iconKey] ?? Star;
  return (
    <div className="p-8">
      <ProspectingPendingContent
        title={props.title}
        description={props.description}
        features={props.features}
        icon={Icon}
        titleLevel="page"
      />
    </div>
  );
}
