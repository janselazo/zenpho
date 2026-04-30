import Link from "next/link";
import type { StoreProduct } from "@/lib/store/types";
import { STORE_PRODUCT_ICONS, STORE_TINT_CLASSES } from "./storeProductIcons";
import { formatStoreMoney } from "@/lib/store/format";

export function StoreProductCard({ product }: { product: StoreProduct }) {
  const Icon = STORE_PRODUCT_ICONS[product.iconKey];
  const tint = STORE_TINT_CLASSES[product.tint];
  const minPrice =
    product.options.quantityTiers.length > 0
      ? Math.min(...product.options.quantityTiers.map((t) => t.priceCents))
      : product.basePriceCents;

  return (
    <Link
      href={`/store/${product.slug}`}
      className="group flex flex-col overflow-hidden rounded-3xl border border-border bg-background transition-shadow hover:shadow-md"
    >
      <div
        className={`flex h-40 items-center justify-center ring-1 ring-inset ${tint.bg} ${tint.ring}`}
      >
        <Icon className={`h-14 w-14 ${tint.icon}`} aria-hidden />
      </div>
      <div className="flex flex-1 flex-col gap-2 p-5">
        <h3 className="text-base font-semibold text-text-primary">{product.name}</h3>
        <p className="line-clamp-2 text-sm text-text-secondary">{product.description}</p>
        <div className="mt-auto flex items-end justify-between gap-3 pt-2">
          <p className="text-sm font-semibold text-text-primary">
            From {formatStoreMoney(minPrice)}
          </p>
          <span className="rounded-full bg-surface px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-text-secondary">
            {product.category}
          </span>
        </div>
      </div>
    </Link>
  );
}
