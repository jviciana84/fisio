-- Ruta del avatar en el bucket público `staff-public` (p. ej. `{uuid}.jpg`).

alter table public.staff_access
  add column if not exists public_avatar_path text;

comment on column public.staff_access.public_avatar_path is
  'Clave en Storage bucket staff-public; la web usa la URL pública del objeto.';
