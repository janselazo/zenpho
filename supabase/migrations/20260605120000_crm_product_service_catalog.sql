-- Agency CRM catalog for Products & Services (invoice/proposal line pickers).

create table public.crm_product_service (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text not null default '',
  unit_price numeric(12, 2) not null default 0 check (unit_price >= 0),
  currency text not null default 'usd',
  sku text,
  is_active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index crm_product_service_active_sort_idx
  on public.crm_product_service (is_active, sort_order);

alter table public.crm_product_service enable row level security;

create policy "agency_staff_crm_product_service_all"
  on public.crm_product_service for all
  using (public.is_agency_staff())
  with check (public.is_agency_staff());

alter table public.proposal_line_item
  add column if not exists catalog_item_id uuid references public.crm_product_service (id) on delete set null;

create index if not exists proposal_line_item_catalog_item_id_idx
  on public.proposal_line_item (catalog_item_id);

-- Sales proposals (narrative documents); catalog lines reference same catalog table.
create table public.sales_proposal (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references public.client (id) on delete set null,
  title text not null default '',
  status text not null default 'draft'
    check (status in ('draft', 'sent')),
  about_us text not null default '',
  our_story text not null default '',
  services_overview text not null default '',
  closing_notes text not null default '',
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index sales_proposal_client_id_idx on public.sales_proposal (client_id);
create index sales_proposal_updated_at_idx on public.sales_proposal (updated_at desc);

alter table public.sales_proposal enable row level security;

create policy "agency_staff_sales_proposal_all"
  on public.sales_proposal for all
  using (public.is_agency_staff())
  with check (public.is_agency_staff());

create table public.sales_proposal_catalog_line (
  id uuid primary key default gen_random_uuid(),
  sales_proposal_id uuid not null references public.sales_proposal (id) on delete cascade,
  catalog_item_id uuid references public.crm_product_service (id) on delete set null,
  description_snapshot text not null default '',
  unit_price_snapshot numeric(12, 2) not null default 0 check (unit_price_snapshot >= 0),
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index sales_proposal_catalog_line_proposal_idx
  on public.sales_proposal_catalog_line (sales_proposal_id, sort_order);

alter table public.sales_proposal_catalog_line enable row level security;

create policy "agency_staff_sales_proposal_catalog_line_all"
  on public.sales_proposal_catalog_line for all
  using (public.is_agency_staff())
  with check (public.is_agency_staff());
