-- Una sola fila: integración Google Calendar para reservas (token cifrado en app).
create table if not exists public.google_calendar_integration (
  id uuid primary key default gen_random_uuid(),
  refresh_token_encrypted text not null,
  calendar_id text not null default 'primary',
  connected_email text,
  slot_minutes integer not null default 45 check (slot_minutes >= 15 and slot_minutes <= 180),
  day_start_local text not null default '09:00',
  day_end_local text not null default '18:00',
  timezone text not null default 'Europe/Madrid',
  updated_at timestamptz not null default now()
);

comment on table public.google_calendar_integration is 'OAuth Google Calendar: refresh token cifrado; horario de oferta de citas.';
