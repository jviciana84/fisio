-- Origen del registro del cliente (web vs clínica). Base para fichas y analítica futura.

alter table public.clients
  add column if not exists origen_cliente text;

alter table public.clients
  drop constraint if exists clients_origen_cliente_check;

alter table public.clients
  add constraint clients_origen_cliente_check
  check (origen_cliente is null or origen_cliente in ('internet', 'fisico'));

comment on column public.clients.origen_cliente is
  'internet: contacto o alta desde web (bonos, reservas, formularios). fisico: recepción / clínica. NULL: legacy o sin clasificar.';

create index if not exists clients_origen_cliente_idx
  on public.clients (origen_cliente)
  where origen_cliente is not null;
