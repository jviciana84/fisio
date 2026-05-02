-- Productos de tipo bono para activar lógica en caja.
-- Si se cobra un bono, se suman sesiones al cliente y caduca al año de la compra.

alter table public.products
  add column if not exists product_kind text not null default 'service';

alter table public.products
  drop constraint if exists products_product_kind_check;

alter table public.products
  add constraint products_product_kind_check
  check (product_kind in ('service', 'bono'));

alter table public.products
  add column if not exists bono_sessions integer;

alter table public.products
  drop constraint if exists products_bono_sessions_check;

alter table public.products
  add constraint products_bono_sessions_check
  check (bono_sessions is null or bono_sessions > 0);

comment on column public.products.product_kind is
  'Tipo funcional de producto en caja: service o bono.';
comment on column public.products.bono_sessions is
  'Número de sesiones que añade al cliente cuando product_kind = bono.';
