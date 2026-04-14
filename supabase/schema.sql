create table if not exists public.staff_access (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text,
  role text not null check (role in ('staff', 'caja', 'admin')),
  pin_hash text not null,
  pin_salt text not null,
  requires_2fa boolean not null default false,
  totp_secret text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists idx_staff_access_active
  on public.staff_access (is_active);
