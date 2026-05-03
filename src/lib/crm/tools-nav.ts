import type { LucideIcon } from "lucide-react";
import { Magnet, Wrench } from "lucide-react";

/**
 * Lead magnets and Tools routes; in-app tabs use ProductLedShell (see ProductLedShell).
 */
export const PRODUCT_LED_HUB = "/prospecting/product-led";

export type ToolsNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

export const toolsNav: ToolsNavItem[] = [
  { href: `${PRODUCT_LED_HUB}/lead-magnets`, label: "Lead magnets", icon: Magnet },
  { href: `${PRODUCT_LED_HUB}/tools`, label: "Tools", icon: Wrench },
];
