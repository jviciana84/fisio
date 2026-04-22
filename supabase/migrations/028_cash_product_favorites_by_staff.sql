-- Favoritos de productos por usuario de caja (staff/admin).

create table if not exists public.cash_product_favorites (
  staff_id uuid not null references public.staff_access(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (staff_id, product_id)
);

create index if not exists cash_product_favorites_staff_idx
  on public.cash_product_favorites (staff_id, created_at desc);

create index if not exists cash_product_favorites_product_idx
  on public.cash_product_favorites (product_id);

comment on table public.cash_product_favorites is
  'Productos favoritos por usuario para caja/intranet.';
