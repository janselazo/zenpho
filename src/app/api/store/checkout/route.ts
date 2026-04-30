import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getProductsByIds } from "@/lib/store/catalog";
import { priceForBundle } from "@/lib/store/cart";
import { getStripe } from "@/lib/stripe/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type CartItemPayload = {
  productId: string;
  bundleSize: number;
  bundleCount: number;
  finish: string | null;
  personalization: Record<string, string>;
  designImageUrl: string | null;
};

type ShippingPayload = {
  fullName: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  zip: string;
  phone: string;
};

type CheckoutPayload = {
  items: CartItemPayload[];
  shipping: ShippingPayload;
};

function bad(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

function trimOrEmpty(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function publicAppUrl(req: NextRequest): string {
  const fromEnv = process.env.PUBLIC_APP_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/+$/, "");
  return req.nextUrl.origin;
}

export async function POST(req: NextRequest) {
  let payload: CheckoutPayload;
  try {
    payload = (await req.json()) as CheckoutPayload;
  } catch {
    return bad("Invalid JSON body.");
  }

  if (!payload || !Array.isArray(payload.items) || payload.items.length === 0) {
    return bad("Cart is empty.");
  }
  if (!payload.shipping) {
    return bad("Shipping address is required.");
  }

  const shipping: ShippingPayload = {
    fullName: trimOrEmpty(payload.shipping.fullName),
    addressLine1: trimOrEmpty(payload.shipping.addressLine1),
    addressLine2: trimOrEmpty(payload.shipping.addressLine2 ?? ""),
    city: trimOrEmpty(payload.shipping.city),
    state: trimOrEmpty(payload.shipping.state),
    zip: trimOrEmpty(payload.shipping.zip),
    phone: trimOrEmpty(payload.shipping.phone),
  };

  for (const [field, value] of [
    ["full name", shipping.fullName],
    ["address", shipping.addressLine1],
    ["city", shipping.city],
    ["state", shipping.state],
    ["zip", shipping.zip],
    ["phone", shipping.phone],
  ] as const) {
    if (!value) return bad(`Missing shipping ${field}.`);
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return bad("Sign in to place an order.", 401);

  // Re-price every line from the DB to prevent client tampering.
  const ids = Array.from(new Set(payload.items.map((i) => i.productId).filter(Boolean)));
  const products = await getProductsByIds(ids);
  const byId = new Map(products.map((p) => [p.id, p] as const));

  type Priced = {
    productId: string;
    productSlug: string;
    productName: string;
    finish: string | null;
    bundleSize: number;
    bundleCount: number;
    unitPriceCents: number;
    lineTotalCents: number;
    personalization: Record<string, string>;
    designImageUrl: string | null;
  };

  const priced: Priced[] = [];
  for (const raw of payload.items) {
    const product = byId.get(raw.productId);
    if (!product) return bad("One of the products is no longer available.");
    const bundleCount = Math.max(1, Math.floor(raw.bundleCount || 1));
    const bundleSize = Math.max(1, Math.floor(raw.bundleSize || 1));
    const { unitPriceCents, tier } = priceForBundle(product, bundleSize);
    if (tier.qty !== bundleSize && product.options.quantityTiers.length > 0) {
      return bad(`Selected pack size for ${product.name} is no longer available.`);
    }
    const finish = raw.finish && product.options.finishes.includes(raw.finish) ? raw.finish : null;

    // Validate required personalization fields.
    const personalization: Record<string, string> = {};
    for (const field of product.options.personalizationFields) {
      const value = trimOrEmpty(raw.personalization?.[field.key]);
      if (field.required && !value) {
        return bad(`Missing required field "${field.label}" for ${product.name}.`);
      }
      if (value) personalization[field.key] = value;
    }

    priced.push({
      productId: product.id,
      productSlug: product.slug,
      productName: product.name,
      finish,
      bundleSize,
      bundleCount,
      unitPriceCents,
      lineTotalCents: unitPriceCents * bundleCount,
      personalization,
      designImageUrl: raw.designImageUrl ?? null,
    });
  }

  const subtotalCents = priced.reduce((sum, p) => sum + p.lineTotalCents, 0);
  const shippingCents = 0;
  const taxCents = 0;
  const totalCents = subtotalCents + shippingCents + taxCents;

  const { data: orderInsert, error: orderErr } = await supabase
    .from("store_order")
    .insert({
      user_id: user.id,
      status: "pending",
      subtotal_cents: subtotalCents,
      shipping_cents: shippingCents,
      tax_cents: taxCents,
      total_cents: totalCents,
      currency: "usd",
      shipping_full_name: shipping.fullName,
      shipping_address_line1: shipping.addressLine1,
      shipping_address_line2: shipping.addressLine2 || null,
      shipping_city: shipping.city,
      shipping_state: shipping.state,
      shipping_zip: shipping.zip,
      shipping_phone: shipping.phone,
    })
    .select("id")
    .single();
  if (orderErr || !orderInsert) {
    return bad(`Could not create order: ${orderErr?.message ?? "unknown error"}`, 500);
  }
  const orderId = orderInsert.id;

  const itemRows = priced.map((p) => ({
    order_id: orderId,
    product_id: p.productId,
    product_slug_snapshot: p.productSlug,
    product_name_snapshot: p.productName,
    finish_snapshot: p.finish,
    quantity: p.bundleSize * p.bundleCount,
    unit_price_cents: p.unitPriceCents,
    line_total_cents: p.lineTotalCents,
    personalization: p.personalization,
    design_image_url: p.designImageUrl,
  }));
  const { error: itemErr } = await supabase.from("store_order_item").insert(itemRows);
  if (itemErr) {
    return bad(`Could not create order items: ${itemErr.message}`, 500);
  }

  // Build Stripe Checkout session.
  let stripe;
  try {
    stripe = getStripe();
  } catch (err) {
    return bad((err as Error).message, 500);
  }

  const baseUrl = publicAppUrl(req);
  const lineItems = priced.map((p) => ({
    quantity: p.bundleCount,
    price_data: {
      currency: "usd",
      unit_amount: p.unitPriceCents,
      product_data: {
        name: `${p.productName}${p.bundleSize > 1 ? ` (Pack of ${p.bundleSize})` : ""}`,
        description: [
          p.finish ? `Finish: ${p.finish}` : null,
          ...Object.entries(p.personalization).map(([k, v]) => `${k}: ${v}`),
        ]
          .filter(Boolean)
          .slice(0, 8)
          .join(" · ")
          .slice(0, 500) || undefined,
      },
    },
  }));

  let session;
  try {
    session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: lineItems,
      customer_email: user.email ?? undefined,
      success_url: `${baseUrl}/store/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/store/checkout/cancel?session_id={CHECKOUT_SESSION_ID}`,
      metadata: {
        order_id: orderId,
        user_id: user.id,
      },
      payment_intent_data: {
        metadata: {
          order_id: orderId,
          user_id: user.id,
        },
      },
    });
  } catch (err) {
    return bad(`Stripe error: ${(err as Error).message}`, 500);
  }

  // Persist the session id for the webhook handler.
  await supabase
    .from("store_order")
    .update({
      stripe_session_id: session.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", orderId);

  return NextResponse.json({ ok: true, url: session.url, orderId });
}
