-- Consentimiento informado (RGPD): registro con fecha para trazabilidad ante requisitorios.

alter table public.clients
  add column if not exists rgpd_consent_at timestamptz,
  add column if not exists rgpd_consent_version text;

comment on column public.clients.rgpd_consent_at is
  'Momento en que la persona firmó / quedó registrado el consentimiento informado (protección de datos). NULL = pendiente de registrar en clínica.';

comment on column public.clients.rgpd_consent_version is
  'Referencia del texto de privacidad aceptado (p. ej. v2025-04), para acreditar qué versión se informó.';

create index if not exists clients_rgpd_pending_idx
  on public.clients (created_at desc)
  where is_active = true and rgpd_consent_at is null;
