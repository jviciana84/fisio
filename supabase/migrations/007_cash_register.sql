-- Caja: clientes + tickets + lineas de ticket + favoritos de productos.

alter table public.products
  add column if not exists is_favorite boolean not null default false;

create index if not exists products_favorite_idx
  on public.products (is_favorite)
  where is_favorite = true;

create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  client_code text unique,
  full_name text not null,
  email text,
  phone text,
  notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create unique index if not exists clients_email_uidx
  on public.clients (lower(email))
  where email is not null;

create unique index if not exists clients_phone_uidx
  on public.clients (phone)
  where phone is not null;

create index if not exists clients_name_idx
  on public.clients (full_name);

create table if not exists public.cash_tickets (
  id uuid primary key default gen_random_uuid(),
  ticket_number text not null unique,
  client_id uuid references public.clients(id) on delete set null,
  subtotal_cents integer not null check (subtotal_cents >= 0),
  manual_amount_cents integer not null default 0 check (manual_amount_cents >= 0),
  total_cents integer not null check (total_cents >= 0),
  payment_method text not null check (payment_method in ('cash', 'bizum')),
  created_by_staff_id uuid references public.staff_access(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists cash_tickets_created_at_idx
  on public.cash_tickets (created_at desc);

create index if not exists cash_tickets_payment_idx
  on public.cash_tickets (payment_method, created_at desc);

create table if not exists public.cash_ticket_items (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.cash_tickets(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  concept text not null,
  unit_price_cents integer not null check (unit_price_cents >= 0),
  quantity integer not null default 1 check (quantity > 0),
  line_total_cents integer not null check (line_total_cents >= 0),
  created_at timestamptz not null default now()
);

create index if not exists cash_ticket_items_ticket_idx
  on public.cash_ticket_items (ticket_id);

comment on table public.clients is 'Clientes para caja: busqueda por nombre, telefono, email o codigo.';
comment on table public.cash_tickets is 'Cabecera de tickets de caja.';
comment on table public.cash_ticket_items is 'Lineas de cada ticket (productos y conceptos manuales).';
