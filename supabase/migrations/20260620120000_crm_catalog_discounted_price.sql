-- Optional promotional unit price on catalog items; proposal lines snapshot list + effective price.

alter table public.crm_product_service
  add column if not exists discounted_price numeric(12, 2) null
    check (discounted_price is null or discounted_price >= 0);

comment on column public.crm_product_service.discounted_price is
  'Promotional unit price. When set below unit_price, proposals show unit_price struck through.';

alter table public.sales_proposal_catalog_line
  add column if not exists list_unit_price_snapshot numeric(12, 2) null
    check (list_unit_price_snapshot is null or list_unit_price_snapshot >= 0);

comment on column public.sales_proposal_catalog_line.list_unit_price_snapshot is
  'Original list price when unit_price_snapshot is discounted; null when no strike-through.';
