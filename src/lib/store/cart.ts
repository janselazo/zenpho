import type {
  StoreCartItem,
  StoreProduct,
  StoreQuantityTier,
} from "./types";

/**
 * Resolve a bundle/tier from a product. Returns the matching tier when the
 * `bundleSize` is one of the configured tiers, otherwise the cheapest tier
 * (or a single-unit fallback for products without tiers).
 */
export function priceForBundle(
  product: StoreProduct,
  bundleSize: number,
): { tier: StoreQuantityTier; unitPriceCents: number } {
  const tiers = [...product.options.quantityTiers].sort((a, b) => a.qty - b.qty);
  if (tiers.length === 0) {
    return {
      tier: { qty: bundleSize, priceCents: product.basePriceCents },
      unitPriceCents: product.basePriceCents,
    };
  }
  const exact = tiers.find((tier) => tier.qty === bundleSize);
  const tier = exact ?? tiers[0];
  return { tier, unitPriceCents: tier.priceCents };
}

export function lineTotalCents(item: StoreCartItem): number {
  return item.unitPriceCents * item.bundleCount;
}

export function cartSubtotalCents(items: StoreCartItem[]): number {
  return items.reduce((sum, item) => sum + item.lineTotalCents, 0);
}

export function cartItemCount(items: StoreCartItem[]): number {
  return items.reduce((sum, item) => sum + item.bundleCount, 0);
}

export function newCartLineId(): string {
  return `line_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}
