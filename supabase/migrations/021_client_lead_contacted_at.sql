-- Seguimiento de leads web (bonos): marcar cuando se ha llamado al interesado.
alter table if exists public.clients
  add column if not exists lead_contacted_at timestamptz;

comment on column public.clients.lead_contacted_at is
  'Fecha en que el equipo marcó el lead como contactado (deja de figurar como pendiente de llamada).';
