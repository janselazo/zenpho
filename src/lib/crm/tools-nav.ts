import type { LucideIcon } from "lucide-react";
import { Magnet, Wrench } from "lucide-react";

/**
 * CRM sidebar entries under **Tools**. Each public free tool (calculator, checker, etc.)
 * should add a row here and a matching route under `/tools/...` when shipped.
 */
export type ToolsNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

export const toolsNav: ToolsNavItem[] = [
  { href: "/tools", label: "Tools", icon: Wrench },
  { href: "/lead-magnets", label: "Lead magnets", icon: Magnet },
];
