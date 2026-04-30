import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type {
  StoreCategory,
  StoreProduct,
  StoreProductIconKey,
  StoreProductOptions,
  StoreTint,
} from "./types";

type StoreProductRow = {
  id: string;
  slug: string;
  category: string;
  name: string;
  description: string;
  icon_key: string;
  tint: string;
  base_price_cents: number;
  currency: string;
  options: unknown;
  sort_order: number;
};

const ALLOWED_TINTS: StoreTint[] = [
  "blue",
  "violet",
  "green",
  "amber",
  "rose",
  "slate",
  "indigo",
];

const ALLOWED_ICON_KEYS: StoreProductIconKey[] = [
  "CreditCard",
  "FileText",
  "Shirt",
  "Key",
  "Flag",
  "Box",
  "Layers",
];

const ALLOWED_CATEGORIES: StoreCategory[] = [
  "Business Cards",
  "Flyers",
  "T-Shirts",
  "Keychains",
  "Banners",
  "Deck Cards",
  "Other",
];

function normalizeOptions(raw: unknown): StoreProductOptions {
  const value = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const tiersRaw = Array.isArray(value.quantityTiers) ? value.quantityTiers : [];
  const quantityTiers = tiersRaw
    .map((entry) => {
      const obj = entry as Record<string, unknown>;
      const qty = typeof obj.qty === "number" ? obj.qty : Number(obj.qty);
      const priceCents = typeof obj.priceCents === "number" ? obj.priceCents : Number(obj.priceCents);
      if (!Number.isFinite(qty) || !Number.isFinite(priceCents)) return null;
      return { qty, priceCents };
    })
    .filter((entry): entry is { qty: number; priceCents: number } => entry !== null);

  const finishes = Array.isArray(value.finishes)
    ? value.finishes.filter((f): f is string => typeof f === "string")
    : [];

  const fieldsRaw = Array.isArray(value.personalizationFields) ? value.personalizationFields : [];
  const personalizationFields = fieldsRaw
    .map((entry) => {
      const obj = entry as Record<string, unknown>;
      if (typeof obj.key !== "string" || typeof obj.label !== "string") return null;
      const type =
        obj.type === "tel" || obj.type === "email" || obj.type === "url" ? obj.type : "text";
      return {
        key: obj.key,
        label: obj.label,
        type,
        required: Boolean(obj.required),
      };
    })
    .filter((entry) => entry !== null) as StoreProductOptions["personalizationFields"];

  return {
    quantityTiers,
    finishes,
    personalizationFields,
    allowDesignUpload: Boolean(value.allowDesignUpload),
    preview: value.preview === "business-card" ? "business-card" : undefined,
  };
}

function rowToProduct(row: StoreProductRow): StoreProduct {
  const tint = (ALLOWED_TINTS as string[]).includes(row.tint) ? (row.tint as StoreTint) : "blue";
  const iconKey = (ALLOWED_ICON_KEYS as string[]).includes(row.icon_key)
    ? (row.icon_key as StoreProductIconKey)
    : "Box";
  const category = (ALLOWED_CATEGORIES as string[]).includes(row.category)
    ? (row.category as StoreCategory)
    : "Other";
  return {
    id: row.id,
    slug: row.slug,
    category,
    name: row.name,
    description: row.description,
    iconKey,
    tint,
    basePriceCents: row.base_price_cents,
    currency: row.currency,
    options: normalizeOptions(row.options),
    sortOrder: row.sort_order,
  };
}

export async function getActiveProducts(): Promise<StoreProduct[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("store_product")
    .select("id, slug, category, name, description, icon_key, tint, base_price_cents, currency, options, sort_order")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });
  if (error) {
    throw new Error(`Failed to load store products: ${error.message}`);
  }
  return (data ?? []).map((row) => rowToProduct(row as StoreProductRow));
}

export async function getProductBySlug(slug: string): Promise<StoreProduct | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("store_product")
    .select("id, slug, category, name, description, icon_key, tint, base_price_cents, currency, options, sort_order")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();
  if (error) {
    throw new Error(`Failed to load product ${slug}: ${error.message}`);
  }
  if (!data) return null;
  return rowToProduct(data as StoreProductRow);
}

/** Server-only: load products by id list bypassing RLS for re-pricing during checkout. */
export async function getProductsByIds(ids: string[]): Promise<StoreProduct[]> {
  if (ids.length === 0) return [];
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("store_product")
    .select("id, slug, category, name, description, icon_key, tint, base_price_cents, currency, options, sort_order")
    .in("id", ids)
    .eq("is_active", true);
  if (error) {
    throw new Error(`Failed to load products for repricing: ${error.message}`);
  }
  return (data ?? []).map((row) => rowToProduct(row as StoreProductRow));
}
