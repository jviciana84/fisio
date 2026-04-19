-- Asalariado (salario mensual) vs autónomo (tarifas €/h en JSON).

alter table public.staff_access
  add column if not exists compensation_type text not null default 'self_employed';

alter table public.staff_access
  drop constraint if exists staff_access_compensation_type_check;

alter table public.staff_access
  add constraint staff_access_compensation_type_check
  check (compensation_type in ('salaried', 'self_employed'));

alter table public.staff_access
  add column if not exists monthly_salary_cents integer;

comment on column public.staff_access.compensation_type is
  'salaried = nómina (monthly_salary_cents); self_employed = hourly_tariffs €/h.';

comment on column public.staff_access.monthly_salary_cents is
  'Salario bruto mensual en céntimos (solo compensation_type = salaried).';
