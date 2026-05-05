import type { CrmProductServiceRow } from "@/lib/crm/crm-catalog-types";

export function catalogListAndEffectivePrice(
  row: Pick<CrmProductServiceRow, "unit_price" | "discounted_price">,
): {
  listPrice: number;
  effectivePrice: number;
  hasDiscount: boolean;
} {
  const list = Math.max(0, Number(row.unit_price) || 0);
  const raw = row.discounted_price;
  const d =
    raw != null && Number.isFinite(Number(raw)) && Number(raw) > 0
      ? Math.max(0, Number(raw))
      : null;
  if (d != null && d < list) {
    return { listPrice: list, effectivePrice: d, hasDiscount: true };
  }
  return { listPrice: list, effectivePrice: list, hasDiscount: false };
}

export function catalogLineHasStrikethroughList(line: {
  unit_price_snapshot: number;
  list_unit_price_snapshot?: number | null;
}): boolean {
  const list = line.list_unit_price_snapshot;
  const eff = line.unit_price_snapshot;
  return (
    list != null &&
    Number.isFinite(list) &&
    list > 0 &&
    eff < list
  );
}
