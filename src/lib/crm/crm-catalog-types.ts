export type CrmProductServiceRow = {
  id: string;
  name: string;
  description: string;
  unit_price: number;
  /** Promotional price; when below `unit_price`, proposals show list price struck through. */
  discounted_price: number | null;
  currency: string;
  sku: string | null;
  is_active: boolean;
  sort_order: number;
};
