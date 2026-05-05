import { createClient } from "@/lib/supabase/server";
import type { CrmProductServiceRow } from "@/lib/crm/crm-catalog-types";

function mapRow(raw: Record<string, unknown>): CrmProductServiceRow {
  return {
    id: raw.id as string,
    name: String(raw.name ?? "").trim() || "Unnamed",
    description: String(raw.description ?? ""),
    unit_price: Number(raw.unit_price) || 0,
    currency: String(raw.currency ?? "usd").trim() || "usd",
    sku: raw.sku != null ? String(raw.sku).trim() || null : null,
    is_active: Boolean(raw.is_active),
    sort_order: Number(raw.sort_order) || 0,
  };
}

/** Active catalog rows for invoice/proposal pickers (ordered). */
export async function fetchActiveCrmCatalog(): Promise<CrmProductServiceRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("crm_product_service")
    .select(
      "id, name, description, unit_price, currency, sku, is_active, sort_order"
    )
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  if (error || !data) return [];
  return data.map((r) => mapRow(r as Record<string, unknown>));
}

/** Full list for Services admin (includes inactive). */
export async function fetchAllCrmCatalog(): Promise<CrmProductServiceRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("crm_product_service")
    .select(
      "id, name, description, unit_price, currency, sku, is_active, sort_order"
    )
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  if (error || !data) return [];
  return data.map((r) => mapRow(r as Record<string, unknown>));
}
