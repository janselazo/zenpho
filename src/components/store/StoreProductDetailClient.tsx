"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { ArrowLeft, ImagePlus, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import type {
  StorePersonalizationField,
  StoreProduct,
  StoreQuantityTier,
} from "@/lib/store/types";
import { formatStoreMoney } from "@/lib/store/format";
import { newCartLineId, priceForBundle } from "@/lib/store/cart";
import { useStoreCart } from "./StoreCartProvider";
import { StoreLivePreview } from "./StoreLivePreview";

export function StoreProductDetailClient({ product }: { product: StoreProduct }) {
  const router = useRouter();
  const { add } = useStoreCart();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const tiers = useMemo(
    () => [...product.options.quantityTiers].sort((a, b) => a.qty - b.qty),
    [product.options.quantityTiers],
  );
  const [tier, setTier] = useState<StoreQuantityTier>(
    () =>
      tiers[0] ?? {
        qty: 1,
        priceCents: product.basePriceCents,
      },
  );
  const [finish, setFinish] = useState<string | null>(
    () => product.options.finishes[0] ?? null,
  );
  const initialPersonalization = useMemo(() => {
    const seed: Record<string, string> = {};
    for (const field of product.options.personalizationFields) seed[field.key] = "";
    return seed;
  }, [product.options.personalizationFields]);
  const [personalization, setPersonalization] = useState(initialPersonalization);
  const [designUrl, setDesignUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);

  const { unitPriceCents } = priceForBundle(product, tier.qty);
  const totalLabel = formatStoreMoney(unitPriceCents);

  const requiredMissing = product.options.personalizationFields.some(
    (f) => f.required && !personalization[f.key]?.trim(),
  );

  function handlePersonalizationChange(key: string, value: string) {
    setPersonalization((prev) => ({ ...prev, [key]: value }));
  }

  async function handleUpload(file: File) {
    setUploadError(null);
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("productSlug", product.slug);
      const res = await fetch("/api/store/upload-design", {
        method: "POST",
        body: fd,
      });
      const data = (await res.json()) as { ok: boolean; url?: string; error?: string };
      if (!res.ok || !data.ok || !data.url) {
        throw new Error(data.error ?? "Upload failed");
      }
      setDesignUrl(data.url);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  function handleAddToCart() {
    setAdding(true);
    const item = {
      lineId: newCartLineId(),
      productId: product.id,
      productSlug: product.slug,
      productName: product.name,
      iconKey: product.iconKey,
      tint: product.tint,
      finish,
      bundleSize: tier.qty,
      bundleCount: 1,
      unitPriceCents,
      lineTotalCents: unitPriceCents,
      personalization,
      designImageUrl: designUrl,
    };
    add(item);
    setAdded(true);
    setTimeout(() => {
      router.push("/store/cart");
    }, 600);
  }

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8">
      <Link
        href="/store"
        className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-text-secondary transition-colors hover:text-text-primary"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Back
      </Link>

      <div className="grid gap-8 lg:grid-cols-2">
        <StoreLivePreview
          product={product}
          personalization={personalization}
          designImageUrl={designUrl}
        />

        <div className="flex flex-col gap-5">
          <div>
            <h2 className="text-2xl font-semibold leading-tight text-text-primary">
              {product.name}
            </h2>
            <p className="mt-1 text-sm leading-6 text-text-secondary">
              {product.description}
            </p>
            <div className="mt-3 flex items-baseline gap-2">
              <p className="text-3xl font-bold text-text-primary">{totalLabel}</p>
              <p className="text-sm text-text-secondary">
                for {tier.qty.toLocaleString()}
                {tier.qty > 1 ? "" : ""}
              </p>
            </div>
          </div>

          {tiers.length > 1 ? (
            <Section label="Quantity">
              <SegmentedGroup>
                {tiers.map((t) => (
                  <SegmentedButton
                    key={t.qty}
                    active={tier.qty === t.qty}
                    onClick={() => setTier(t)}
                  >
                    {t.qty.toLocaleString()}
                  </SegmentedButton>
                ))}
              </SegmentedGroup>
            </Section>
          ) : null}

          {product.options.finishes.length > 1 ? (
            <Section label="Finish">
              <SegmentedGroup>
                {product.options.finishes.map((value) => (
                  <SegmentedButton
                    key={value}
                    active={finish === value}
                    onClick={() => setFinish(value)}
                  >
                    {value}
                  </SegmentedButton>
                ))}
              </SegmentedGroup>
            </Section>
          ) : null}

          {product.options.personalizationFields.length > 0 ? (
            <Section label="Personalization">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {product.options.personalizationFields.map((field) => (
                  <PersonalizationInput
                    key={field.key}
                    field={field}
                    value={personalization[field.key] ?? ""}
                    onChange={(value) => handlePersonalizationChange(field.key, value)}
                  />
                ))}
              </div>
            </Section>
          ) : null}

          {product.options.allowDesignUpload ? (
            <Section label="Upload Design Image">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex w-full flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border bg-surface px-6 py-8 text-sm text-text-secondary transition-colors hover:border-accent hover:bg-accent-soft/30"
              >
                {uploading ? (
                  <Loader2 className="h-6 w-6 animate-spin text-text-secondary" aria-hidden />
                ) : (
                  <ImagePlus className="h-6 w-6 text-text-secondary" aria-hidden />
                )}
                <span className="font-medium">
                  {designUrl ? "Replace uploaded image" : "Click to upload an image"}
                </span>
                <span className="text-xs">PNG, JPG, WebP up to 5 MB</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void handleUpload(file);
                  e.target.value = "";
                }}
              />
              {designUrl ? (
                <p className="mt-2 truncate text-xs text-text-secondary">Uploaded.</p>
              ) : null}
              {uploadError ? (
                <p className="mt-2 text-xs text-rose-600">{uploadError}</p>
              ) : null}
            </Section>
          ) : null}

          <button
            type="button"
            disabled={adding || requiredMissing}
            onClick={handleAddToCart}
            className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-accent px-6 py-3.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:bg-text-secondary/40"
          >
            {added ? "Added! Opening cart..." : `Add to Cart — ${totalLabel}`}
          </button>
          {requiredMissing ? (
            <p className="text-xs text-text-secondary">
              Fill in the required personalization fields to add this to your cart.
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.16em] text-text-secondary">
        {label}
      </p>
      {children}
    </div>
  );
}

function SegmentedGroup({ children }: { children: React.ReactNode }) {
  return (
    <div className="inline-flex flex-wrap gap-1.5 rounded-2xl bg-surface p-1">{children}</div>
  );
}

function SegmentedButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        "rounded-xl px-4 py-2 text-sm font-semibold transition-colors " +
        (active
          ? "bg-text-primary text-background"
          : "bg-transparent text-text-primary hover:bg-background")
      }
    >
      {children}
    </button>
  );
}

function PersonalizationInput({
  field,
  value,
  onChange,
}: {
  field: StorePersonalizationField;
  value: string;
  onChange: (next: string) => void;
}) {
  const inputType = field.type === "tel" ? "tel" : field.type === "email" ? "email" : field.type === "url" ? "url" : "text";
  return (
    <label className="block">
      <span className="block text-xs font-semibold text-text-secondary">
        {field.label}
        {field.required ? <span className="ml-1 text-rose-500">*</span> : null}
      </span>
      <input
        type={inputType}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-text-primary outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-accent-soft"
      />
    </label>
  );
}
