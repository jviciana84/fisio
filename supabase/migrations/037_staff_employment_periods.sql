create table if not exists public.staff_employment_periods (
  id uuid primary key default gen_random_uuid(),
  staff_id uuid not null references public.staff_access(id) on delete cascade,
  start_date date not null,
  end_date date,
  annual_salary_cents integer,
  created_at timestamptz not null default now(),
  check (end_date is null or end_date >= start_date)
);

create index if not exists staff_employment_periods_staff_start_idx
  on public.staff_employment_periods (staff_id, start_date desc);

create unique index if not exists staff_employment_periods_single_open_idx
  on public.staff_employment_periods (staff_id)
  where end_date is null;

insert into public.staff_employment_periods (staff_id, start_date, end_date, annual_salary_cents)
select
  s.id,
  coalesce(s.employment_start_date, s.created_at::date) as start_date,
  case when s.is_active then null else s.employment_end_date end as end_date,
  s.monthly_salary_cents
from public.staff_access s
where not exists (
  select 1
  from public.staff_employment_periods p
  where p.staff_id = s.id
);

comment on table public.staff_employment_periods is
  'Histórico de tramos de alta/baja por trabajador para cálculo fiscal y de nóminas.';
