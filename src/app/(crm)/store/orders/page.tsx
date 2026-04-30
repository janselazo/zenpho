import Link from "next/link";
import { listMyOrders } from "@/lib/store/orders";
import { StoreHeader } from "@/components/store/StoreHeader";
import { formatStoreMoney } from "@/lib/store/format";

export const dynamic = "force-dynamic";

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-amber-100 text-amber-900",
  paid: "bg-emerald-100 text-emerald-900",
  fulfilled: "bg-blue-100 text-blue-900",
  cancelled: "bg-rose-100 text-rose-900",
};

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

export default async function StoreOrdersPage() {
  const orders = await listMyOrders();
  return (
    <div className="flex flex-col">
      <StoreHeader title="My Orders" subtitle="Your branded materials orders" showOrders={false} />
      <div className="px-4 py-6 sm:px-6 lg:px-8">
        {orders.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-border bg-background p-12 text-center">
            <p className="text-base text-text-primary">You haven&apos;t placed any orders yet.</p>
            <p className="mt-1 text-sm text-text-secondary">
              When you place your first order it will appear here.
            </p>
            <Link
              href="/store"
              className="mt-5 inline-flex items-center justify-center rounded-full bg-accent px-5 py-2 text-sm font-semibold text-white hover:bg-accent-hover"
            >
              Browse marketplace
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <article
                key={order.id}
                className="overflow-hidden rounded-2xl border border-border bg-background"
              >
                <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-surface/40 px-5 py-3">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-text-secondary">
                      Order #{order.id.slice(0, 8)}
                    </p>
                    <p className="text-sm text-text-primary">{formatDate(order.createdAt)}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className={`rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wide ${
                        STATUS_STYLES[order.status] ?? "bg-surface text-text-secondary"
                      }`}
                    >
                      {order.status}
                    </span>
                    <span className="text-sm font-bold text-text-primary">
                      {formatStoreMoney(order.totalCents)}
                    </span>
                  </div>
                </header>
                <ul className="divide-y divide-border">
                  {order.items.map((item) => (
                    <li
                      key={item.id}
                      className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 text-sm"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-text-primary">
                          {item.productName}
                        </p>
                        <p className="text-xs text-text-secondary">
                          {[
                            item.finish,
                            item.quantity > 1 ? `${item.quantity.toLocaleString()} units` : null,
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                        </p>
                      </div>
                      <p className="text-text-primary">
                        {formatStoreMoney(item.lineTotalCents)}
                      </p>
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
