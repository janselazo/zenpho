export type StoreCategory =
  | "All Products"
  | "Business Cards"
  | "Flyers"
  | "T-Shirts"
  | "Keychains"
  | "Banners"
  | "Deck Cards"
  | "Other";

export const STORE_CATEGORIES: StoreCategory[] = [
  "All Products",
  "Business Cards",
  "Flyers",
  "T-Shirts",
  "Keychains",
  "Banners",
  "Deck Cards",
  "Other",
];

export type StoreTint =
  | "blue"
  | "violet"
  | "green"
  | "amber"
  | "rose"
  | "slate"
  | "indigo";

export type StoreProductIconKey =
  | "CreditCard"
  | "FileText"
  | "Shirt"
  | "Key"
  | "Flag"
  | "Box"
  | "Layers";

export type StoreQuantityTier = {
  qty: number;
  priceCents: number;
};

export type StorePersonalizationFieldType = "text" | "tel" | "email" | "url";

export type StorePersonalizationField = {
  key: string;
  label: string;
  type: StorePersonalizationFieldType;
  required: boolean;
};

export type StoreProductOptions = {
  quantityTiers: StoreQuantityTier[];
  finishes: string[];
  personalizationFields: StorePersonalizationField[];
  allowDesignUpload: boolean;
  preview?: "business-card";
};

export type StoreProduct = {
  id: string;
  slug: string;
  category: StoreCategory;
  name: string;
  description: string;
  iconKey: StoreProductIconKey;
  tint: StoreTint;
  basePriceCents: number;
  currency: string;
  options: StoreProductOptions;
  sortOrder: number;
};

export type StoreCartItem = {
  /** Stable client-side id so a user can have multiple lines for the same product with different options. */
  lineId: string;
  productId: string;
  productSlug: string;
  productName: string;
  iconKey: StoreProductIconKey;
  tint: StoreTint;
  finish: string | null;
  /** Bundle size from the product tier (e.g. 500 cards per pack). 1 for un-tiered products. */
  bundleSize: number;
  /** Number of bundles in the cart (the +/- buttons in the cart). */
  bundleCount: number;
  /** Bundle price (e.g. $49.99 for one pack of 500). */
  unitPriceCents: number;
  /** bundleCount × unitPriceCents. */
  lineTotalCents: number;
  personalization: Record<string, string>;
  designImageUrl: string | null;
};

export type StoreShippingAddress = {
  fullName: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  zip: string;
  phone: string;
};

export type StoreOrderStatus = "pending" | "paid" | "fulfilled" | "cancelled";

export type StoreOrder = {
  id: string;
  status: StoreOrderStatus;
  subtotalCents: number;
  shippingCents: number;
  taxCents: number;
  totalCents: number;
  currency: string;
  createdAt: string;
  shipping: StoreShippingAddress | null;
  items: StoreOrderItem[];
};

export type StoreOrderItem = {
  id: string;
  productSlug: string;
  productName: string;
  finish: string | null;
  /** Total units delivered (bundleSize × bundleCount). */
  quantity: number;
  unitPriceCents: number;
  lineTotalCents: number;
  personalization: Record<string, string>;
  designImageUrl: string | null;
};
