import type { LucideIcon } from "lucide-react";
import { Magnet, Wrench } from "lucide-react";

/**
 * Product-Led hub tabs (Lead Magnets + Tools). Sidebar shows a single **Product-Led** link;
 * each tool still ships under `/prospecting/product-led/tools/...` when applicable.
 */
export const PRODUCT_LED_HUB = "/prospecting/product-led";

export type ToolsNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

export const toolsNav: ToolsNavItem[] = [
  { href: `${PRODUCT_LED_HUB}/tools`, label: "Tools", icon: Wrench },
  { href: `${PRODUCT_LED_HUB}/lead-magnets`, label: "Lead magnets", icon: Magnet },
];
