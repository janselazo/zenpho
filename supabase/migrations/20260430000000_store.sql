-- Store / Marketplace: products catalog + customer orders + design uploads.
-- Apply with: `npx supabase link` then `npx supabase db push`,
-- or paste this file in Supabase Dashboard → SQL Editor.

-- ─── Products catalog ───────────────────────────────────────────────────────
create table if not exists public.store_product (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  category text not null,
  name text not null,
  description text not null default '',
  icon_key text not null default 'Box',
  tint text not null default 'blue',
  base_price_cents integer not null check (base_price_cents >= 0),
  currency text not null default 'usd',
  options jsonb not null default '{}'::jsonb,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists store_product_active_sort_idx
  on public.store_product (is_active, sort_order);

alter table public.store_product enable row level security;

-- Anyone (anon + authenticated) can read active products.
drop policy if exists "store_product_public_read" on public.store_product;
create policy "store_product_public_read"
  on public.store_product for select
  using (is_active = true);

grant select on public.store_product to anon, authenticated;

-- ─── Orders ─────────────────────────────────────────────────────────────────
create table if not exists public.store_order (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending', 'paid', 'fulfilled', 'cancelled')),
  stripe_session_id text,
  stripe_payment_intent_id text,
  subtotal_cents integer not null default 0 check (subtotal_cents >= 0),
  shipping_cents integer not null default 0 check (shipping_cents >= 0),
  tax_cents integer not null default 0 check (tax_cents >= 0),
  total_cents integer not null default 0 check (total_cents >= 0),
  currency text not null default 'usd',
  shipping_full_name text,
  shipping_address_line1 text,
  shipping_address_line2 text,
  shipping_city text,
  shipping_state text,
  shipping_zip text,
  shipping_phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists store_order_user_created_idx
  on public.store_order (user_id, created_at desc);

create index if not exists store_order_stripe_session_idx
  on public.store_order (stripe_session_id);

alter table public.store_order enable row level security;

drop policy if exists "store_order_select_own" on public.store_order;
create policy "store_order_select_own"
  on public.store_order for select
  using (auth.uid() = user_id);

drop policy if exists "store_order_insert_own" on public.store_order;
create policy "store_order_insert_own"
  on public.store_order for insert
  with check (auth.uid() = user_id);

-- Users do not directly update or delete orders; payment status is mutated
-- by the Stripe webhook handler with the service role.

grant select, insert on public.store_order to authenticated;

-- ─── Order line items ───────────────────────────────────────────────────────
create table if not exists public.store_order_item (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.store_order (id) on delete cascade,
  product_id uuid references public.store_product (id) on delete set null,
  product_slug_snapshot text not null,
  product_name_snapshot text not null,
  finish_snapshot text,
  quantity integer not null check (quantity > 0),
  unit_price_cents integer not null check (unit_price_cents >= 0),
  line_total_cents integer not null check (line_total_cents >= 0),
  personalization jsonb not null default '{}'::jsonb,
  design_image_url text,
  created_at timestamptz not null default now()
);

create index if not exists store_order_item_order_idx
  on public.store_order_item (order_id);

alter table public.store_order_item enable row level security;

drop policy if exists "store_order_item_select_own" on public.store_order_item;
create policy "store_order_item_select_own"
  on public.store_order_item for select
  using (
    exists (
      select 1
      from public.store_order o
      where o.id = store_order_item.order_id
        and o.user_id = auth.uid()
    )
  );

drop policy if exists "store_order_item_insert_own" on public.store_order_item;
create policy "store_order_item_insert_own"
  on public.store_order_item for insert
  with check (
    exists (
      select 1
      from public.store_order o
      where o.id = store_order_item.order_id
        and o.user_id = auth.uid()
    )
  );

grant select, insert on public.store_order_item to authenticated;

-- ─── Storage bucket for user-uploaded designs ───────────────────────────────
insert into storage.buckets (id, name, public)
  values ('store-uploads', 'store-uploads', true)
  on conflict (id) do nothing;

drop policy if exists "store_uploads_public_read" on storage.objects;
create policy "store_uploads_public_read"
  on storage.objects for select
  using (bucket_id = 'store-uploads');

drop policy if exists "store_uploads_insert_own_folder" on storage.objects;
create policy "store_uploads_insert_own_folder"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'store-uploads'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "store_uploads_update_own_folder" on storage.objects;
create policy "store_uploads_update_own_folder"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'store-uploads'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "store_uploads_delete_own_folder" on storage.objects;
create policy "store_uploads_delete_own_folder"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'store-uploads'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ─── Seed products ──────────────────────────────────────────────────────────
-- Each product carries its quantity tiers, finishes, and personalization
-- fields in `options` so the catalog is fully data-driven.

insert into public.store_product
  (slug, category, name, description, icon_key, tint, base_price_cents, sort_order, options)
values
  (
    'premium-business-cards',
    'Business Cards',
    'Premium Business Cards',
    'High-quality 16pt matte finish business cards with your business branding, name, title, and contact info. Double-sided full color.',
    'CreditCard',
    'blue',
    2999,
    10,
    jsonb_build_object(
      'quantityTiers', jsonb_build_array(
        jsonb_build_object('qty', 250, 'priceCents', 2999),
        jsonb_build_object('qty', 500, 'priceCents', 4999),
        jsonb_build_object('qty', 1000, 'priceCents', 8999),
        jsonb_build_object('qty', 2500, 'priceCents', 17999)
      ),
      'finishes', jsonb_build_array('Matte', 'Glossy', 'Soft Touch'),
      'personalizationFields', jsonb_build_array(
        jsonb_build_object('key', 'name', 'label', 'Your Name', 'type', 'text', 'required', true),
        jsonb_build_object('key', 'title', 'label', 'Title', 'type', 'text', 'required', false),
        jsonb_build_object('key', 'phone', 'label', 'Phone', 'type', 'tel', 'required', false),
        jsonb_build_object('key', 'email', 'label', 'Email', 'type', 'email', 'required', false)
      ),
      'allowDesignUpload', true,
      'preview', 'business-card'
    )
  ),
  (
    'promotional-flyers',
    'Flyers',
    'Promotional Flyers',
    'Full-color 8.5x11 flyers featuring your services, specials, and business branding. Perfect for events and trade shows.',
    'FileText',
    'violet',
    1999,
    20,
    jsonb_build_object(
      'quantityTiers', jsonb_build_array(
        jsonb_build_object('qty', 100, 'priceCents', 1999),
        jsonb_build_object('qty', 250, 'priceCents', 3999),
        jsonb_build_object('qty', 500, 'priceCents', 6999),
        jsonb_build_object('qty', 1000, 'priceCents', 11999)
      ),
      'finishes', jsonb_build_array('Matte', 'Glossy'),
      'personalizationFields', jsonb_build_array(
        jsonb_build_object('key', 'headline', 'label', 'Headline', 'type', 'text', 'required', true),
        jsonb_build_object('key', 'phone', 'label', 'Phone', 'type', 'tel', 'required', false),
        jsonb_build_object('key', 'website', 'label', 'Website', 'type', 'url', 'required', false)
      ),
      'allowDesignUpload', true
    )
  ),
  (
    'branded-tshirts',
    'T-Shirts',
    'Branded T-Shirts',
    'Comfortable cotton blend t-shirts with your business logo and name. Great for staff uniforms and giveaways.',
    'Shirt',
    'green',
    1499,
    30,
    jsonb_build_object(
      'quantityTiers', jsonb_build_array(
        jsonb_build_object('qty', 10, 'priceCents', 1499),
        jsonb_build_object('qty', 25, 'priceCents', 3499),
        jsonb_build_object('qty', 50, 'priceCents', 6499),
        jsonb_build_object('qty', 100, 'priceCents', 11999)
      ),
      'finishes', jsonb_build_array('Black', 'White', 'Navy', 'Charcoal'),
      'personalizationFields', jsonb_build_array(
        jsonb_build_object('key', 'sizeMix', 'label', 'Size mix (e.g. 5 M, 5 L)', 'type', 'text', 'required', true),
        jsonb_build_object('key', 'tagline', 'label', 'Optional tagline', 'type', 'text', 'required', false)
      ),
      'allowDesignUpload', true
    )
  ),
  (
    'custom-keychains',
    'Keychains',
    'Custom Keychains',
    'Metal keychains with your business logo. Perfect as customer gifts or promotional items at events.',
    'Key',
    'amber',
    4999,
    40,
    jsonb_build_object(
      'quantityTiers', jsonb_build_array(
        jsonb_build_object('qty', 50, 'priceCents', 4999),
        jsonb_build_object('qty', 100, 'priceCents', 8999),
        jsonb_build_object('qty', 250, 'priceCents', 18999),
        jsonb_build_object('qty', 500, 'priceCents', 34999)
      ),
      'finishes', jsonb_build_array('Silver', 'Gold', 'Black'),
      'personalizationFields', jsonb_build_array(
        jsonb_build_object('key', 'businessName', 'label', 'Business name', 'type', 'text', 'required', true),
        jsonb_build_object('key', 'tagline', 'label', 'Optional tagline', 'type', 'text', 'required', false)
      ),
      'allowDesignUpload', true
    )
  ),
  (
    'vinyl-banners',
    'Banners',
    'Vinyl Banners',
    'Durable outdoor vinyl banners with vibrant full-color printing. Includes grommets for easy hanging.',
    'Flag',
    'rose',
    3999,
    50,
    jsonb_build_object(
      'quantityTiers', jsonb_build_array(
        jsonb_build_object('qty', 1, 'priceCents', 3999),
        jsonb_build_object('qty', 2, 'priceCents', 6999),
        jsonb_build_object('qty', 5, 'priceCents', 16999)
      ),
      'finishes', jsonb_build_array('3x6 ft', '4x8 ft', '6x10 ft'),
      'personalizationFields', jsonb_build_array(
        jsonb_build_object('key', 'headline', 'label', 'Headline', 'type', 'text', 'required', true),
        jsonb_build_object('key', 'subline', 'label', 'Sub-headline', 'type', 'text', 'required', false),
        jsonb_build_object('key', 'phone', 'label', 'Phone', 'type', 'tel', 'required', false)
      ),
      'allowDesignUpload', true
    )
  ),
  (
    'branded-pens',
    'Other',
    'Branded Pens',
    'Smooth-writing ballpoint pens with your business logo and phone number. Handout these at every customer interaction.',
    'Box',
    'slate',
    3999,
    60,
    jsonb_build_object(
      'quantityTiers', jsonb_build_array(
        jsonb_build_object('qty', 100, 'priceCents', 3999),
        jsonb_build_object('qty', 250, 'priceCents', 7999),
        jsonb_build_object('qty', 500, 'priceCents', 13999),
        jsonb_build_object('qty', 1000, 'priceCents', 24999)
      ),
      'finishes', jsonb_build_array('Black', 'White', 'Blue'),
      'personalizationFields', jsonb_build_array(
        jsonb_build_object('key', 'businessName', 'label', 'Business name', 'type', 'text', 'required', true),
        jsonb_build_object('key', 'phone', 'label', 'Phone', 'type', 'tel', 'required', false)
      ),
      'allowDesignUpload', false
    )
  ),
  (
    'objection-handling-deck-cards',
    'Deck Cards',
    'Objection Handling Deck Cards',
    '50 card deck with proven rebuttals for every common sales objection — price, trade-in, payments, credit, timing, and more. Pocket sized for quick reference on the floor.',
    'Layers',
    'indigo',
    2499,
    70,
    jsonb_build_object(
      'quantityTiers', jsonb_build_array(
        jsonb_build_object('qty', 1, 'priceCents', 2499),
        jsonb_build_object('qty', 3, 'priceCents', 5999),
        jsonb_build_object('qty', 5, 'priceCents', 8999)
      ),
      'finishes', jsonb_build_array('Standard'),
      'personalizationFields', jsonb_build_array(),
      'allowDesignUpload', false
    )
  )
on conflict (slug) do update set
  category = excluded.category,
  name = excluded.name,
  description = excluded.description,
  icon_key = excluded.icon_key,
  tint = excluded.tint,
  base_price_cents = excluded.base_price_cents,
  sort_order = excluded.sort_order,
  options = excluded.options,
  is_active = true,
  updated_at = now();
