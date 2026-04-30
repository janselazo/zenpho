import {
  Box,
  CreditCard,
  FileText,
  Flag,
  Key,
  Layers,
  Shirt,
  type LucideIcon,
} from "lucide-react";
import type { StoreProductIconKey, StoreTint } from "@/lib/store/types";

export const STORE_PRODUCT_ICONS: Record<StoreProductIconKey, LucideIcon> = {
  CreditCard,
  FileText,
  Shirt,
  Key,
  Flag,
  Box,
  Layers,
};

/** Background + foreground Tailwind classes for the product card hero zone. */
export const STORE_TINT_CLASSES: Record<
  StoreTint,
  { bg: string; ring: string; icon: string }
> = {
  blue: {
    bg: "bg-blue-50 dark:bg-blue-500/10",
    ring: "ring-blue-100 dark:ring-blue-500/20",
    icon: "text-blue-500 dark:text-blue-300",
  },
  violet: {
    bg: "bg-violet-50 dark:bg-violet-500/10",
    ring: "ring-violet-100 dark:ring-violet-500/20",
    icon: "text-violet-500 dark:text-violet-300",
  },
  green: {
    bg: "bg-emerald-50 dark:bg-emerald-500/10",
    ring: "ring-emerald-100 dark:ring-emerald-500/20",
    icon: "text-emerald-500 dark:text-emerald-300",
  },
  amber: {
    bg: "bg-amber-50 dark:bg-amber-500/10",
    ring: "ring-amber-100 dark:ring-amber-500/20",
    icon: "text-amber-500 dark:text-amber-300",
  },
  rose: {
    bg: "bg-rose-50 dark:bg-rose-500/10",
    ring: "ring-rose-100 dark:ring-rose-500/20",
    icon: "text-rose-500 dark:text-rose-300",
  },
  slate: {
    bg: "bg-slate-50 dark:bg-slate-500/10",
    ring: "ring-slate-100 dark:ring-slate-500/20",
    icon: "text-slate-500 dark:text-slate-300",
  },
  indigo: {
    bg: "bg-indigo-50 dark:bg-indigo-500/10",
    ring: "ring-indigo-100 dark:ring-indigo-500/20",
    icon: "text-indigo-500 dark:text-indigo-300",
  },
};
