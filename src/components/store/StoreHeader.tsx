"use client";

import Link from "next/link";
import { ClipboardList, ShoppingBag, ShoppingCart } from "lucide-react";
import { useStoreCart } from "./StoreCartProvider";

export function StoreHeader({
  title = "Marketplace",
  subtitle = "Order branded promotional materials for your business",
  showCart = true,
  showOrders = true,
}: {
  title?: string;
  subtitle?: string;
  showCart?: boolean;
  showOrders?: boolean;
}) {
  const { itemCount } = useStoreCart();
  return (
    <header className="flex flex-col gap-4 border-b border-border bg-background px-4 py-5 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-surface text-text-primary">
          <ShoppingBag className="h-5 w-5" aria-hidden />
        </div>
        <div>
          <h1 className="text-xl font-semibold leading-tight text-text-primary">{title}</h1>
          <p className="text-sm text-text-secondary">{subtitle}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {showOrders ? (
          <Link
            href="/store/orders"
            className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-4 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-surface"
          >
            <ClipboardList className="h-4 w-4" aria-hidden />
            My Orders
          </Link>
        ) : null}
        {showCart ? (
          <Link
            href="/store/cart"
            className="relative inline-flex items-center gap-2 rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-accent-hover"
          >
            <ShoppingCart className="h-4 w-4" aria-hidden />
            Cart
            {itemCount > 0 ? (
              <span className="absolute -right-1 -top-1 inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-rose-500 px-1.5 text-[10px] font-bold text-white">
                {itemCount}
              </span>
            ) : null}
          </Link>
        ) : null}
      </div>
    </header>
  );
}
