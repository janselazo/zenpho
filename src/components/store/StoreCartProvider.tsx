"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { cartItemCount, cartSubtotalCents, lineTotalCents } from "@/lib/store/cart";
import type { StoreCartItem } from "@/lib/store/types";

const STORAGE_KEY = "zenpho.storeCart.v1";

type StoreCartContextValue = {
  items: StoreCartItem[];
  itemCount: number;
  subtotalCents: number;
  hydrated: boolean;
  add: (item: StoreCartItem) => void;
  setBundleCount: (lineId: string, bundleCount: number) => void;
  remove: (lineId: string) => void;
  clear: () => void;
};

const StoreCartContext = createContext<StoreCartContextValue | null>(null);

function readStorage(): StoreCartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is StoreCartItem => {
      if (!item || typeof item !== "object") return false;
      const o = item as Record<string, unknown>;
      return (
        typeof o.lineId === "string" &&
        typeof o.productId === "string" &&
        typeof o.productSlug === "string" &&
        typeof o.unitPriceCents === "number" &&
        typeof o.bundleSize === "number" &&
        typeof o.bundleCount === "number"
      );
    });
  } catch {
    return [];
  }
}

function writeStorage(items: StoreCartItem[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // ignore
  }
}

export function StoreCartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<StoreCartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setItems(readStorage());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    writeStorage(items);
  }, [items, hydrated]);

  const add = useCallback((item: StoreCartItem) => {
    setItems((prev) => [...prev, { ...item, lineTotalCents: lineTotalCents(item) }]);
  }, []);

  const setBundleCount = useCallback((lineId: string, bundleCount: number) => {
    setItems((prev) =>
      prev
        .map((item) => {
          if (item.lineId !== lineId) return item;
          const safe = Math.max(1, Math.floor(bundleCount));
          const next: StoreCartItem = {
            ...item,
            bundleCount: safe,
          };
          next.lineTotalCents = lineTotalCents(next);
          return next;
        })
        .filter(Boolean as unknown as (i: StoreCartItem) => boolean),
    );
  }, []);

  const remove = useCallback((lineId: string) => {
    setItems((prev) => prev.filter((item) => item.lineId !== lineId));
  }, []);

  const clear = useCallback(() => {
    setItems([]);
  }, []);

  const value = useMemo<StoreCartContextValue>(
    () => ({
      items,
      itemCount: cartItemCount(items),
      subtotalCents: cartSubtotalCents(items),
      hydrated,
      add,
      setBundleCount,
      remove,
      clear,
    }),
    [items, hydrated, add, setBundleCount, remove, clear],
  );

  return <StoreCartContext.Provider value={value}>{children}</StoreCartContext.Provider>;
}

export function useStoreCart(): StoreCartContextValue {
  const ctx = useContext(StoreCartContext);
  if (!ctx) {
    throw new Error("useStoreCart must be used within <StoreCartProvider>.");
  }
  return ctx;
}
