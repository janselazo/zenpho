export type CrmProductServiceRow = {
  id: string;
  name: string;
  description: string;
  unit_price: number;
  currency: string;
  sku: string | null;
  is_active: boolean;
  sort_order: number;
};
