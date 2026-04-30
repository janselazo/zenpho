"use client";

import Link from "next/link";
import { useEffect } from "react";
import { CheckCircle2 } from "lucide-react";
import { useStoreCart } from "@/components/store/StoreCartProvider";

export default function StoreCheckoutSuccessPage() {
  const { clear, hydrated } = useStoreCart();

  useEffect(() => {
    if (hydrated) clear();
  }, [hydrated, clear]);

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4 py-10">
      <div className="max-w-lg rounded-3xl border border-border bg-background p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
          <CheckCircle2 className="h-8 w-8" aria-hidden />
        </div>
        <h1 className="text-2xl font-semibold text-text-primary">Payment received</h1>
        <p className="mt-2 text-sm text-text-secondary">
          Thanks for your order. Stripe will email a receipt shortly. We&apos;ll start
          production as soon as the design files are reviewed.
        </p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Link
            href="/store/orders"
            className="inline-flex items-center justify-center rounded-full bg-accent px-5 py-2 text-sm font-semibold text-white hover:bg-accent-hover"
          >
            View my orders
          </Link>
          <Link
            href="/store"
            className="inline-flex items-center justify-center rounded-full border border-border bg-background px-5 py-2 text-sm font-semibold text-text-primary hover:bg-surface"
          >
            Keep shopping
          </Link>
        </div>
      </div>
    </div>
  );
}
