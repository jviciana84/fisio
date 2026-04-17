-- Citas reservadas desde la web pública (código local + vínculo con Google Calendar)

create table if not exists public.online_bookings (
  id uuid primary key default gen_random_uuid(),
  booking_code text not null,
  starts_at timestamptz not null,
  timezone text not null default 'Europe/Madrid',
  slot_minutes integer not null default 45,
  patient_name text not null,
  patient_email text not null,
  patient_phone text not null,
  patient_address text not null,
  notes text,
  google_event_id text,
  html_link text,
  created_at timestamptz not null default now(),
  constraint online_bookings_booking_code_key unique (booking_code),
  constraint online_bookings_slot_minutes_chk check (slot_minutes > 0 and slot_minutes <= 480)
);

create index if not exists online_bookings_starts_at_idx on public.online_bookings (starts_at desc);
create index if not exists online_bookings_email_idx on public.online_bookings (patient_email);

alter table public.online_bookings enable row level security;

comment on table public.online_bookings is 'Reservas online; inserción solo vía service role (API servidor).';
