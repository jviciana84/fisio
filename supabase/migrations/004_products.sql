-- Catálogo de productos (admin).

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  product_code text not null,
  price_cents integer not null default 0 check (price_cents >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create unique index if not exists products_product_code_uidx
  on public.products (product_code);

create index if not exists products_active_idx
  on public.products (is_active);

comment on table public.products is 'Productos del centro (material, servicios facturables, etc.).';
comment on column public.products.product_code is 'Código interno de 4 cifras, único.';
comment on column public.products.price_cents is 'Precio en céntimos de euro.';
