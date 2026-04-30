import Link from "next/link";
import { XCircle } from "lucide-react";

export default function StoreCheckoutCancelPage() {
  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4 py-10">
      <div className="max-w-lg rounded-3xl border border-border bg-background p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-rose-100 text-rose-700">
          <XCircle className="h-8 w-8" aria-hidden />
        </div>
        <h1 className="text-2xl font-semibold text-text-primary">Checkout cancelled</h1>
        <p className="mt-2 text-sm text-text-secondary">
          Your cart was preserved. You can pick up where you left off whenever
          you&apos;re ready.
        </p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Link
            href="/store/cart"
            className="inline-flex items-center justify-center rounded-full bg-accent px-5 py-2 text-sm font-semibold text-white hover:bg-accent-hover"
          >
            Back to cart
          </Link>
          <Link
            href="/store"
            className="inline-flex items-center justify-center rounded-full border border-border bg-background px-5 py-2 text-sm font-semibold text-text-primary hover:bg-surface"
          >
            Browse marketplace
          </Link>
        </div>
      </div>
    </div>
  );
}
