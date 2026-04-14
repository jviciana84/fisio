alter table public.staff_access
  add column if not exists totp_onboarding_complete boolean not null default true;

comment on column public.staff_access.totp_onboarding_complete is
  'Si es false y el usuario es admin con 2FA, debe pasar por /onboarding/totp antes del panel.';
