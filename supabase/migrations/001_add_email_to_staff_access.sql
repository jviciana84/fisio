-- Si la tabla ya existía sin email, ejecuta esto en el SQL Editor de Supabase.

alter table public.staff_access
  add column if not exists email text;

create unique index if not exists staff_access_email_uidx
  on public.staff_access (lower(email))
  where email is not null;
