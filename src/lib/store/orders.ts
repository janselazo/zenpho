import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type {
  StoreOrder,
  StoreOrderItem,
  StoreOrderStatus,
  StoreShippingAddress,
} from "./types";

type OrderRow = {
  id: string;
  status: string;
  subtotal_cents: number;
  shipping_cents: number;
  tax_cents: number;
  total_cents: number;
  currency: string;
  created_at: string;
  shipping_full_name: string | null;
  shipping_address_line1: string | null;
  shipping_address_line2: string | null;
  shipping_city: string | null;
  shipping_state: string | null;
  shipping_zip: string | null;
  shipping_phone: string | null;
};

type OrderItemRow = {
  id: string;
  order_id: string;
  product_slug_snapshot: string;
  product_name_snapshot: string;
  finish_snapshot: string | null;
  quantity: number;
  unit_price_cents: number;
  line_total_cents: number;
  personalization: unknown;
  design_image_url: string | null;
};

const VALID_STATUSES: StoreOrderStatus[] = ["pending", "paid", "fulfilled", "cancelled"];

function rowToOrder(row: OrderRow, items: OrderItemRow[]): StoreOrder {
  const status = (VALID_STATUSES as string[]).includes(row.status)
    ? (row.status as StoreOrderStatus)
    : "pending";
  const shipping: StoreShippingAddress | null = row.shipping_full_name
    ? {
        fullName: row.shipping_full_name ?? "",
        addressLine1: row.shipping_address_line1 ?? "",
        addressLine2: row.shipping_address_line2 ?? "",
        city: row.shipping_city ?? "",
        state: row.shipping_state ?? "",
        zip: row.shipping_zip ?? "",
        phone: row.shipping_phone ?? "",
      }
    : null;
  return {
    id: row.id,
    status,
    subtotalCents: row.subtotal_cents,
    shippingCents: row.shipping_cents,
    taxCents: row.tax_cents,
    totalCents: row.total_cents,
    currency: row.currency,
    createdAt: row.created_at,
    shipping,
    items: items.map(rowToItem),
  };
}

function rowToItem(row: OrderItemRow): StoreOrderItem {
  const personalization =
    row.personalization && typeof row.personalization === "object"
      ? Object.fromEntries(
          Object.entries(row.personalization as Record<string, unknown>).map(([k, v]) => [
            k,
            typeof v === "string" ? v : "",
          ]),
        )
      : {};
  return {
    id: row.id,
    productSlug: row.product_slug_snapshot,
    productName: row.product_name_snapshot,
    finish: row.finish_snapshot,
    quantity: row.quantity,
    unitPriceCents: row.unit_price_cents,
    lineTotalCents: row.line_total_cents,
    personalization,
    designImageUrl: row.design_image_url,
  };
}

export async function listMyOrders(): Promise<StoreOrder[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: orderRows, error } = await supabase
    .from("store_order")
    .select(
      "id, status, subtotal_cents, shipping_cents, tax_cents, total_cents, currency, created_at, shipping_full_name, shipping_address_line1, shipping_address_line2, shipping_city, shipping_state, shipping_zip, shipping_phone",
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });
  if (error) {
    throw new Error(`Failed to load orders: ${error.message}`);
  }
  const orders = (orderRows ?? []) as OrderRow[];
  if (orders.length === 0) return [];

  const ids = orders.map((o) => o.id);
  const { data: itemRows, error: itemErr } = await supabase
    .from("store_order_item")
    .select(
      "id, order_id, product_slug_snapshot, product_name_snapshot, finish_snapshot, quantity, unit_price_cents, line_total_cents, personalization, design_image_url",
    )
    .in("order_id", ids);
  if (itemErr) {
    throw new Error(`Failed to load order items: ${itemErr.message}`);
  }
  const itemsByOrder = new Map<string, OrderItemRow[]>();
  for (const item of (itemRows ?? []) as OrderItemRow[]) {
    const arr = itemsByOrder.get(item.order_id) ?? [];
    arr.push(item);
    itemsByOrder.set(item.order_id, arr);
  }

  return orders.map((row) => rowToOrder(row, itemsByOrder.get(row.id) ?? []));
}

/** Webhook-only: bypass RLS to mark an order paid. */
export async function markOrderPaidByStripeSession(
  stripeSessionId: string,
  paymentIntentId: string | null,
): Promise<{ orderId: string | null }> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("store_order")
    .update({
      status: "paid",
      stripe_payment_intent_id: paymentIntentId,
      updated_at: new Date().toISOString(),
    })
    .eq("stripe_session_id", stripeSessionId)
    .select("id")
    .maybeSingle();
  if (error) {
    throw new Error(`Failed to mark order paid: ${error.message}`);
  }
  return { orderId: data?.id ?? null };
}
