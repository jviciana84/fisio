-- Seguimiento en recepción: sesiones restantes y caducidad del bono activo.

alter table public.clients
  add column if not exists bono_remaining_sessions integer,
  add column if not exists bono_expires_at date;

alter table public.clients
  drop constraint if exists clients_bono_remaining_sessions_check;

alter table public.clients
  add constraint clients_bono_remaining_sessions_check
  check (bono_remaining_sessions is null or bono_remaining_sessions >= 0);

comment on column public.clients.bono_remaining_sessions is
  'Sesiones restantes del bono (null = sin bono registrado o no aplica).';
comment on column public.clients.bono_expires_at is
  'Último día válido del bono (inclusive), o null si no caduca / sin fecha.';
