"use client";

import type { StoreProduct } from "@/lib/store/types";
import { STORE_PRODUCT_ICONS, STORE_TINT_CLASSES } from "./storeProductIcons";

export function StoreLivePreview({
  product,
  personalization,
  designImageUrl,
}: {
  product: StoreProduct;
  personalization: Record<string, string>;
  designImageUrl: string | null;
}) {
  const Icon = STORE_PRODUCT_ICONS[product.iconKey];
  const tint = STORE_TINT_CLASSES[product.tint];

  if (product.options.preview === "business-card") {
    return (
      <div className="flex h-full min-h-[420px] flex-col items-center justify-center gap-4 rounded-3xl bg-surface p-8">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-text-secondary">
          Live Preview
        </p>
        <div className="relative w-full max-w-[360px] rounded-2xl border border-border bg-background p-6 shadow-sm aspect-[1.75/1]">
          <div className="flex h-full flex-col justify-between">
            <div className="flex items-start gap-3">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-full ${tint.bg}`}
              >
                {designImageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={designImageUrl}
                    alt="Logo"
                    className="h-10 w-10 rounded-full object-cover"
                  />
                ) : (
                  <Icon className={`h-5 w-5 ${tint.icon}`} aria-hidden />
                )}
              </div>
              <div className="flex-1">
                <p className="text-base font-bold leading-tight text-text-primary">
                  {personalization.name?.trim() || "Your Name"}
                </p>
                <p className="text-xs text-text-secondary">
                  {personalization.title?.trim() || "Title"}
                </p>
              </div>
            </div>
            <div className="space-y-1 text-[11px] text-text-secondary">
              {personalization.phone?.trim() ? <p>{personalization.phone}</p> : null}
              {personalization.email?.trim() ? <p>{personalization.email}</p> : null}
              {!personalization.phone?.trim() && !personalization.email?.trim() ? (
                <p>Phone · Email</p>
              ) : null}
            </div>
          </div>
        </div>
        <p className="text-xs text-text-secondary">
          Preview updates as you fill in the form.
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-[420px] flex-col items-center justify-center gap-4 rounded-3xl bg-surface p-8">
      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-text-secondary">
        Live Preview
      </p>
      <div className="relative flex w-full max-w-[420px] items-center justify-center overflow-hidden rounded-2xl border border-border bg-background shadow-sm aspect-square">
        {designImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={designImageUrl}
            alt={`${product.name} design`}
            className="h-full w-full object-contain p-6"
          />
        ) : (
          <div className={`flex h-full w-full items-center justify-center ${tint.bg}`}>
            <Icon className={`h-24 w-24 ${tint.icon}`} aria-hidden />
          </div>
        )}
      </div>
      <p className="text-xs text-text-secondary">
        {designImageUrl
          ? "Your uploaded design preview."
          : "Upload a design or proceed with a stock placeholder."}
      </p>
    </div>
  );
}
