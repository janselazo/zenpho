-- Finance tracking tables: income sources, income entries, fixed expenses, variable expenses.
-- Replaces spreadsheet-based monthly income/expense tracking.

-- Income sources: each business or revenue stream (job, agency, software product, etc.)
create table public.income_source (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  kind text not null default 'other'
    check (kind in ('job', 'agency', 'software_product', 'freelance', 'other')),
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Monthly income entry per source (one row per source per month)
create table public.income_entry (
  id uuid primary key default gen_random_uuid(),
  income_source_id uuid not null references public.income_source (id) on delete cascade,
  month date not null,
  hours numeric(8, 2) not null default 0,
  revenue numeric(12, 2) not null default 0,
  expenses numeric(12, 2) not null default 0,
  notes text,
  created_at timestamptz not null default now(),
  unique (income_source_id, month)
);

-- Fixed (recurring) monthly expenses
create table public.fixed_expense (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  amount numeric(12, 2) not null default 0,
  due_day int not null default 1 check (due_day >= 1 and due_day <= 31),
  category text,
  is_active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

-- Variable (one-off) expense entries
create table public.variable_expense_entry (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  category text not null,
  amount numeric(12, 2) not null default 0,
  date date not null default current_date,
  description text,
  created_at timestamptz not null default now()
);

-- RLS
alter table public.income_source enable row level security;
alter table public.income_entry enable row level security;
alter table public.fixed_expense enable row level security;
alter table public.variable_expense_entry enable row level security;

create policy "agency_all_income_source"
  on public.income_source for all
  using (public.is_agency_staff())
  with check (public.is_agency_staff());

create policy "agency_all_income_entry"
  on public.income_entry for all
  using (
    exists (
      select 1 from public.income_source s
      where s.id = income_entry.income_source_id
        and public.is_agency_staff()
    )
  )
  with check (
    exists (
      select 1 from public.income_source s
      where s.id = income_entry.income_source_id
        and public.is_agency_staff()
    )
  );

create policy "agency_all_fixed_expense"
  on public.fixed_expense for all
  using (public.is_agency_staff())
  with check (public.is_agency_staff());

create policy "agency_all_variable_expense_entry"
  on public.variable_expense_entry for all
  using (public.is_agency_staff())
  with check (public.is_agency_staff());

-- Sync income entries into transaction table so dashboard charts stay fed.
-- Each income_entry row produces one revenue row and (if expenses > 0) one expense row,
-- keyed by description prefix to allow upsert-style updates.

create or replace function public.sync_income_entry_to_transaction()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    delete from public.transaction
      where category = 'income_entry'
        and description like 'ie:' || old.id::text || ':%';
    return old;
  end if;

  -- Remove old rows for this entry then re-insert
  delete from public.transaction
    where category = 'income_entry'
      and description like 'ie:' || new.id::text || ':%';

  if new.revenue > 0 then
    insert into public.transaction (type, amount, category, description, date)
    values ('revenue', new.revenue, 'income_entry', 'ie:' || new.id::text || ':rev', new.month);
  end if;

  if new.expenses > 0 then
    insert into public.transaction (type, amount, category, description, date)
    values ('expense', new.expenses, 'income_entry', 'ie:' || new.id::text || ':exp', new.month);
  end if;

  return new;
end;
$$;

create trigger trg_sync_income_entry
  after insert or update or delete on public.income_entry
  for each row execute function public.sync_income_entry_to_transaction();

-- Sync variable expense entries into transaction table.
create or replace function public.sync_variable_expense_to_transaction()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    delete from public.transaction
      where category = 'variable_expense'
        and description = 've:' || old.id::text;
    return old;
  end if;

  delete from public.transaction
    where category = 'variable_expense'
      and description = 've:' || new.id::text;

  if new.amount > 0 then
    insert into public.transaction (type, amount, category, description, date)
    values ('expense', new.amount, 'variable_expense', 've:' || new.id::text, new.date);
  end if;

  return new;
end;
$$;

create trigger trg_sync_variable_expense
  after insert or update or delete on public.variable_expense_entry
  for each row execute function public.sync_variable_expense_to_transaction();
