-- Perfil visible en la web pública (hero); texto opcional para especialidad y bio.

alter table public.staff_access
  add column if not exists public_profile boolean not null default true;

alter table public.staff_access
  add column if not exists public_specialty text;

alter table public.staff_access
  add column if not exists public_bio text;

comment on column public.staff_access.public_profile is
  'Si es true e is_active, el miembro puede mostrarse en la web pública (hero).';

comment on column public.staff_access.public_specialty is
  'Especialidad mostrada en la web (opcional; si falta se usa un texto genérico).';

comment on column public.staff_access.public_bio is
  'Biografía breve en la web (opcional).';
