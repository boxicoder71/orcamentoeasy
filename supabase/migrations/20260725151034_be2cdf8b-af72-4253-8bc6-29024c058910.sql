
-- companies
create table if not exists public.companies (
  user_id uuid primary key references auth.users(id) on delete cascade,
  logo text default '',
  name text default '',
  document text default '',
  phone text default '',
  email text default '',
  website text default '',
  address text default '',
  pix text default '',
  bank text default '',
  theme_color text default '#0A192F',
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.companies to authenticated;
grant all on public.companies to service_role;
alter table public.companies enable row level security;
create policy "companies_select_own" on public.companies for select to authenticated using (auth.uid() = user_id);
create policy "companies_insert_own" on public.companies for insert to authenticated with check (auth.uid() = user_id);
create policy "companies_update_own" on public.companies for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "companies_delete_own" on public.companies for delete to authenticated using (auth.uid() = user_id);

-- clients
create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null default '',
  document text default '',
  email text default '',
  phone text default '',
  address text default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.clients to authenticated;
grant all on public.clients to service_role;
alter table public.clients enable row level security;
create policy "clients_select_own" on public.clients for select to authenticated using (auth.uid() = user_id);
create policy "clients_insert_own" on public.clients for insert to authenticated with check (auth.uid() = user_id);
create policy "clients_update_own" on public.clients for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "clients_delete_own" on public.clients for delete to authenticated using (auth.uid() = user_id);
create index if not exists clients_user_id_idx on public.clients (user_id, updated_at desc);

-- quotes
create table if not exists public.quotes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  number text not null,
  issue_date date not null,
  validity_days integer not null default 15,
  client jsonb not null default '{}'::jsonb,
  items jsonb not null default '[]'::jsonb,
  general_discount numeric not null default 0,
  general_discount_mode text not null default 'valor',
  shipping numeric not null default 0,
  payment_methods text default '',
  delivery_term text default '',
  notes text default '',
  status text not null default 'rascunho',
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.quotes to authenticated;
grant all on public.quotes to service_role;
alter table public.quotes enable row level security;
create policy "quotes_select_own" on public.quotes for select to authenticated using (auth.uid() = user_id);
create policy "quotes_insert_own" on public.quotes for insert to authenticated with check (auth.uid() = user_id);
create policy "quotes_update_own" on public.quotes for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "quotes_delete_own" on public.quotes for delete to authenticated using (auth.uid() = user_id);
create index if not exists quotes_user_id_updated_at_idx on public.quotes (user_id, updated_at desc);

-- updated_at trigger
create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end; $$;

create trigger companies_set_updated_at before update on public.companies for each row execute function public.set_updated_at();
create trigger clients_set_updated_at before update on public.clients for each row execute function public.set_updated_at();
create trigger quotes_set_updated_at before update on public.quotes for each row execute function public.set_updated_at();
