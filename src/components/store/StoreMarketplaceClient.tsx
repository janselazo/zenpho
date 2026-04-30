"use client";

import { useMemo, useState } from "react";
import type { StoreCategory, StoreProduct } from "@/lib/store/types";
import { StoreCategoryPills } from "./StoreCategoryPills";
import { StoreProductCard } from "./StoreProductCard";

export function StoreMarketplaceClient({
  products,
}: {
  products: StoreProduct[];
}) {
  const [active, setActive] = useState<StoreCategory>("All Products");

  const available = useMemo(() => {
    const set = new Set<StoreCategory>();
    for (const p of products) set.add(p.category);
    return set;
  }, [products]);

  const filtered = useMemo(() => {
    if (active === "All Products") return products;
    return products.filter((p) => p.category === active);
  }, [products, active]);

  return (
    <div className="flex flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
      <StoreCategoryPills active={active} onChange={setActive} available={available} />
      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-background p-10 text-center text-sm text-text-secondary">
          No products in this category yet.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((product) => (
            <StoreProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
}
