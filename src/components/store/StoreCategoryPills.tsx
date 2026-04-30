"use client";

import { STORE_CATEGORIES, type StoreCategory } from "@/lib/store/types";

export function StoreCategoryPills({
  active,
  onChange,
  available,
}: {
  active: StoreCategory;
  onChange: (next: StoreCategory) => void;
  /** Categories that have at least one product (excluding "All Products"). */
  available: Set<StoreCategory>;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {STORE_CATEGORIES.map((category) => {
        const isAll = category === "All Products";
        if (!isAll && !available.has(category)) return null;
        const isActive = category === active;
        return (
          <button
            key={category}
            type="button"
            onClick={() => onChange(category)}
            className={
              "rounded-full px-4 py-1.5 text-sm font-semibold transition-colors " +
              (isActive
                ? "bg-text-primary text-background"
                : "bg-surface text-text-primary hover:bg-surface-light")
            }
          >
            {category}
          </button>
        );
      })}
    </div>
  );
}
