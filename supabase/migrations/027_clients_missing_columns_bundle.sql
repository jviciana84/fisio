-- Columnas de public.clients usadas por la intranet / APIs (bonos, leads, RGPD, caja).
-- Idempotente: puedes ejecutarlo en el SQL Editor de Supabase o como migración; repetir es seguro.

alter table if exists public.clients
  add column if not exists comprobante_pago_url text,
  add column if not exists estado_pago text not null default 'pendiente_validacion',
  add column if not exists lead_contacted_at timestamptz,
  add column if not exists rgpd_consent_at timestamptz,
  add column if not exists rgpd_consent_version text,
  add column if not exists bono_web_signature_png text,
  add column if not exists origen_cliente text,
  add column if not exists bono_remaining_sessions integer,
  add column if not exists bono_expires_at date;

alter table public.clients
  drop constraint if exists clients_origen_cliente_check;

alter table public.clients
  add constraint clients_origen_cliente_check
  check (origen_cliente is null or origen_cliente in ('internet', 'fisico'));

alter table public.clients
  drop constraint if exists clients_bono_remaining_sessions_check;

alter table public.clients
  add constraint clients_bono_remaining_sessions_check
  check (bono_remaining_sessions is null or bono_remaining_sessions >= 0);

create index if not exists clients_estado_pago_idx
  on public.clients (estado_pago);

create index if not exists clients_origen_cliente_idx
  on public.clients (origen_cliente)
  where origen_cliente is not null;

create index if not exists clients_rgpd_pending_idx
  on public.clients (created_at desc)
  where is_active = true and rgpd_consent_at is null;

comment on column public.clients.estado_pago is
  'Flujo CRM / caja: pendiente_validacion, pendiente_contacto, validado, pagado, etc.';
comment on column public.clients.lead_contacted_at is
  'Fecha en que el equipo marcó el lead como contactado (deja de figurar como pendiente de llamada).';
comment on column public.clients.rgpd_consent_at is
  'Momento en que quedó registrado el consentimiento informado en clínica; NULL = pendiente.';
comment on column public.clients.rgpd_consent_version is
  'Referencia del texto de privacidad aceptado (p. ej. v2025-04).';
comment on column public.clients.bono_web_signature_png is
  'Firma manuscrita en web al solicitar bono (data URL PNG o base64).';
comment on column public.clients.origen_cliente is
  'internet: web; fisico: clínica; NULL: sin clasificar.';
comment on column public.clients.bono_remaining_sessions is
  'Sesiones restantes del bono (null = sin bono / no aplica).';
comment on column public.clients.bono_expires_at is
  'Último día válido del bono (inclusive), o null.';
