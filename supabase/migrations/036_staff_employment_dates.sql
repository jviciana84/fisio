alter table public.staff_access
  add column if not exists employment_start_date date,
  add column if not exists employment_end_date date;

update public.staff_access
set employment_start_date = coalesce(employment_start_date, created_at::date)
where employment_start_date is null;

alter table public.staff_access
  alter column employment_start_date set default current_date;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'staff_access_employment_dates_chk'
  ) then
    alter table public.staff_access
      add constraint staff_access_employment_dates_chk
      check (
        employment_end_date is null
        or employment_start_date is null
        or employment_end_date >= employment_start_date
      );
  end if;
end $$;

comment on column public.staff_access.employment_start_date is
  'Fecha de alta en plantilla para cálculo de nómina e impuestos.';

comment on column public.staff_access.employment_end_date is
  'Fecha de baja en plantilla (null si sigue activo).';
