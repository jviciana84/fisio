-- Teléfono y código de empleado único; roles reducidos a staff y admin.

update public.staff_access
set role = 'staff'
where role = 'caja';

alter table public.staff_access drop constraint if exists staff_access_role_check;

alter table public.staff_access
  add constraint staff_access_role_check check (role in ('staff', 'admin'));

alter table public.staff_access
  add column if not exists phone text;

alter table public.staff_access
  add column if not exists employee_code text;

update public.staff_access
set employee_code = 'EMP-' || upper(substr(replace(id::text, '-', ''), 1, 12))
where employee_code is null;

alter table public.staff_access
  alter column employee_code set not null;

create unique index if not exists staff_access_employee_code_uidx
  on public.staff_access (employee_code);

comment on column public.staff_access.phone is 'Teléfono de contacto (opcional).';
comment on column public.staff_access.employee_code is 'Código único de empleado generado por la aplicación.';
