-- Nombre y apellidos separados para clientes (manteniendo full_name para compatibilidad)

alter table public.clients
  add column if not exists first_name text,
  add column if not exists last_name_1 text,
  add column if not exists last_name_2 text;

-- Backfill básico desde full_name:
-- - first_name: primera palabra
-- - last_name_1: primera palabra del bloque de apellidos
-- - last_name_2: resto del bloque de apellidos
with parsed as (
  select
    id,
    trim(full_name) as full_name_trim,
    trim(regexp_replace(trim(full_name), '^\S+\s*', '')) as surnames
  from public.clients
)
update public.clients c
set
  first_name = nullif(split_part(p.full_name_trim, ' ', 1), ''),
  last_name_1 = nullif(split_part(p.surnames, ' ', 1), ''),
  last_name_2 = nullif(trim(regexp_replace(p.surnames, '^\S+\s*', '')), '')
from parsed p
where c.id = p.id
  and (c.first_name is null or c.last_name_1 is null);

comment on column public.clients.first_name is 'Nombre del cliente';
comment on column public.clients.last_name_1 is 'Primer apellido del cliente';
comment on column public.clients.last_name_2 is 'Segundo apellido del cliente (puede incluir varias palabras)';
