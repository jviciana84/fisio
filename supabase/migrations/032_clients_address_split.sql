-- Dirección de cliente en campos separados (además del campo address legado)

alter table public.clients
  add column if not exists address_street text,
  add column if not exists address_number text,
  add column if not exists address_postal_code text,
  add column if not exists address_city text;

comment on column public.clients.address_street is 'Dirección de cliente: calle';
comment on column public.clients.address_number is 'Dirección de cliente: número / piso / puerta';
comment on column public.clients.address_postal_code is 'Dirección de cliente: código postal';
comment on column public.clients.address_city is 'Dirección de cliente: población';
