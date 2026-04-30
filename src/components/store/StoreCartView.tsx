"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, Loader2, Minus, Plus, Trash2 } from "lucide-react";
import { useStoreCart } from "./StoreCartProvider";
import { STORE_PRODUCT_ICONS, STORE_TINT_CLASSES } from "./storeProductIcons";
import { formatStoreMoney } from "@/lib/store/format";
import type { StoreShippingAddress } from "@/lib/store/types";

const EMPTY_SHIPPING: StoreShippingAddress = {
  fullName: "",
  addressLine1: "",
  addressLine2: "",
  city: "",
  state: "",
  zip: "",
  phone: "",
};

export function StoreCartView() {
  const { items, subtotalCents, setBundleCount, remove, hydrated } = useStoreCart();
  const [shipping, setShipping] = useState<StoreShippingAddress>(EMPTY_SHIPPING);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!hydrated) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-text-secondary">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading cart...
      </div>
    );
  }

  const empty = items.length === 0;

  function set<K extends keyof StoreShippingAddress>(key: K, value: StoreShippingAddress[K]) {
    setShipping((prev) => ({ ...prev, [key]: value }));
  }

  async function handleCheckout() {
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/store/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map((i) => ({
            productId: i.productId,
            bundleSize: i.bundleSize,
            bundleCount: i.bundleCount,
            finish: i.finish,
            personalization: i.personalization,
            designImageUrl: i.designImageUrl,
          })),
          shipping,
        }),
      });
      const data = (await res.json()) as { ok: boolean; url?: string; error?: string };
      if (!res.ok || !data.ok || !data.url) {
        throw new Error(data.error ?? "Could not start checkout");
      }
      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Checkout failed");
      setSubmitting(false);
    }
  }

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-4 flex items-center gap-3">
        <Link
          href="/store"
          className="inline-flex items-center gap-1 text-sm font-medium text-text-secondary transition-colors hover:text-text-primary"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Continue Shopping
        </Link>
        <h2 className="text-xl font-semibold text-text-primary">Shopping Cart</h2>
      </div>

      {empty ? (
        <div className="rounded-3xl border border-dashed border-border bg-background p-12 text-center">
          <p className="text-base text-text-primary">Your cart is empty.</p>
          <p className="mt-1 text-sm text-text-secondary">
            Browse the marketplace to add branded materials.
          </p>
          <Link
            href="/store"
            className="mt-5 inline-flex items-center justify-center rounded-full bg-accent px-5 py-2 text-sm font-semibold text-white hover:bg-accent-hover"
          >
            Browse marketplace
          </Link>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
          <div className="space-y-3">
            {items.map((item) => {
              const Icon = STORE_PRODUCT_ICONS[item.iconKey];
              const tint = STORE_TINT_CLASSES[item.tint];
              return (
                <div
                  key={item.lineId}
                  className="flex items-center gap-4 rounded-2xl border border-border bg-background p-4"
                >
                  <div
                    className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-xl ${tint.bg}`}
                  >
                    <Icon className={`h-6 w-6 ${tint.icon}`} aria-hidden />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-text-primary">
                      {item.productName}
                    </p>
                    <p className="text-xs text-text-secondary">
                      {[
                        item.finish,
                        item.bundleSize > 1 ? `qty ${item.bundleSize}` : null,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setBundleCount(item.lineId, Math.max(1, item.bundleCount - 1))}
                      className="rounded-full border border-border p-1 text-text-secondary hover:bg-surface"
                      aria-label="Decrease"
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                    <span className="min-w-[1.5rem] text-center text-sm font-semibold">
                      {item.bundleCount}
                    </span>
                    <button
                      type="button"
                      onClick={() => setBundleCount(item.lineId, item.bundleCount + 1)}
                      className="rounded-full border border-border p-1 text-text-secondary hover:bg-surface"
                      aria-label="Increase"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="w-24 text-right">
                    <p className="text-sm font-bold text-text-primary">
                      {formatStoreMoney(item.lineTotalCents)}
                    </p>
                    {item.bundleCount > 1 ? (
                      <p className="text-[11px] text-text-secondary">
                        {formatStoreMoney(item.unitPriceCents)} each
                      </p>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    onClick={() => remove(item.lineId)}
                    className="rounded-full p-2 text-text-secondary transition-colors hover:bg-rose-50 hover:text-rose-600"
                    aria-label="Remove"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              );
            })}
          </div>

          <div className="flex flex-col gap-4">
            <div className="rounded-2xl border border-border bg-background p-5">
              <h3 className="text-sm font-semibold text-text-primary">Shipping Address</h3>
              <div className="mt-4 grid grid-cols-1 gap-3">
                <Input label="Full Name" value={shipping.fullName} onChange={(v) => set("fullName", v)} />
                <Input
                  label="Street Address"
                  value={shipping.addressLine1}
                  onChange={(v) => set("addressLine1", v)}
                />
                <Input
                  label="Address line 2 (optional)"
                  value={shipping.addressLine2}
                  onChange={(v) => set("addressLine2", v)}
                />
                <div className="grid grid-cols-2 gap-3">
                  <Input label="City" value={shipping.city} onChange={(v) => set("city", v)} />
                  <Input label="State" value={shipping.state} onChange={(v) => set("state", v)} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Input label="ZIP Code" value={shipping.zip} onChange={(v) => set("zip", v)} />
                  <Input
                    label="Phone"
                    value={shipping.phone}
                    onChange={(v) => set("phone", v)}
                    type="tel"
                  />
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-background p-5">
              <h3 className="text-sm font-semibold text-text-primary">Order Summary</h3>
              <ul className="mt-3 space-y-2 text-sm">
                {items.map((item) => (
                  <li key={item.lineId} className="flex justify-between text-text-secondary">
                    <span className="truncate pr-2">
                      {item.productName} × {item.bundleCount}
                    </span>
                    <span className="text-text-primary">
                      {formatStoreMoney(item.lineTotalCents)}
                    </span>
                  </li>
                ))}
              </ul>
              <div className="mt-4 flex items-baseline justify-between border-t border-border pt-4">
                <span className="text-sm font-semibold text-text-primary">Total</span>
                <span className="text-2xl font-bold text-text-primary">
                  {formatStoreMoney(subtotalCents)}
                </span>
              </div>
              <button
                type="button"
                onClick={handleCheckout}
                disabled={submitting}
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-accent px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:bg-text-secondary/40"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Redirecting...
                  </>
                ) : (
                  <>Pay with Stripe</>
                )}
              </button>
              <p className="mt-2 text-center text-[11px] text-text-secondary">
                You&apos;ll be redirected to Stripe for secure payment.
              </p>
              {error ? (
                <p className="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-700">
                  {error}
                </p>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Input({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="block text-xs font-semibold text-text-secondary">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-text-primary outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-accent-soft"
      />
    </label>
  );
}
