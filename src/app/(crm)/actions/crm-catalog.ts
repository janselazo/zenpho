"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

function revalidateCatalogPaths() {
  revalidatePath("/products-services");
  revalidatePath("/proposals");
  revalidatePath("/invoices");
}

export async function createCrmCatalogItem(input: {
  name: string;
  description: string;
  unitPrice: number;
  sku: string | null;
  sortOrder: number;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const name = input.name.trim();
  if (!name) return { error: "Name is required" };

  const unit = Number.isFinite(input.unitPrice)
    ? Math.max(0, input.unitPrice)
    : 0;

  const { data, error } = await supabase
    .from("crm_product_service")
    .insert({
      name,
      description: input.description.trim(),
      unit_price: unit,
      sku: input.sku?.trim() || null,
      sort_order: Number.isFinite(input.sortOrder) ? input.sortOrder : 0,
      is_active: true,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };
  revalidateCatalogPaths();
  return { ok: true, id: data.id as string };
}

export async function updateCrmCatalogItem(
  id: string,
  input: {
    name: string;
    description: string;
    unitPrice: number;
    sku: string | null;
    isActive: boolean;
    sortOrder: number;
  }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const rid = id.trim();
  if (!rid) return { error: "Missing id" };

  const name = input.name.trim();
  if (!name) return { error: "Name is required" };

  const unit = Number.isFinite(input.unitPrice)
    ? Math.max(0, input.unitPrice)
    : 0;

  const { error } = await supabase
    .from("crm_product_service")
    .update({
      name,
      description: input.description.trim(),
      unit_price: unit,
      sku: input.sku?.trim() || null,
      is_active: input.isActive,
      sort_order: Number.isFinite(input.sortOrder) ? input.sortOrder : 0,
      updated_at: new Date().toISOString(),
    })
    .eq("id", rid);

  if (error) return { error: error.message };
  revalidateCatalogPaths();
  return { ok: true };
}

export async function deleteCrmCatalogItem(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const rid = id.trim();
  if (!rid) return { error: "Missing id" };

  const { error } = await supabase
    .from("crm_product_service")
    .delete()
    .eq("id", rid);

  if (error) return { error: error.message };
  revalidateCatalogPaths();
  return { ok: true };
}
