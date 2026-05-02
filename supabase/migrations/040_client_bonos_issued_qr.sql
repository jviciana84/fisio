-- Bonos emitidos en caja con código único + QR.

create table if not exists public.client_bonos (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  ticket_id uuid references public.cash_tickets(id) on delete set null,
  product_id uuid references public.products(id) on delete set null,
  product_name text not null,
  unique_code text not null unique,
  qr_payload text not null,
  qr_data_url text,
  sessions_total integer not null check (sessions_total > 0),
  sessions_remaining integer not null check (sessions_remaining >= 0),
  purchased_at timestamptz not null default now(),
  expires_at date not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists client_bonos_client_idx
  on public.client_bonos (client_id, purchased_at desc);

create index if not exists client_bonos_active_idx
  on public.client_bonos (is_active, expires_at, sessions_remaining);

comment on table public.client_bonos is
  'Bonos emitidos en caja para control de sesiones, caducidad y QR.';
