alter table if exists public.clients
  add column if not exists comprobante_pago_url text,
  add column if not exists estado_pago text not null default 'pendiente_validacion';

create index if not exists clients_estado_pago_idx
  on public.clients (estado_pago);
