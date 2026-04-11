import type { LucideIcon } from "lucide-react";
import { Wrench } from "lucide-react";

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
  { href: "/tools", label: "Live", icon: Wrench },
];
