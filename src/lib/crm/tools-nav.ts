import type { LucideIcon } from "lucide-react";
import { Magnet, Wrench } from "lucide-react";

/**
 * Product-led hub: sidebar links only to Lead Magnets; the Tools hub lives on the
 * "Tools" tab in ProductLedShell (layout for /prospecting/product-led/*).
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
