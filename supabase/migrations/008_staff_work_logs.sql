-- Registro de horas trabajadas por staff para métricas de rendimiento.

create table if not exists public.staff_work_logs (
  id uuid primary key default gen_random_uuid(),
  staff_id uuid not null references public.staff_access(id) on delete cascade,
  work_date date not null default current_date,
  worked_minutes integer not null check (worked_minutes >= 0 and worked_minutes <= 1440),
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists staff_work_logs_staff_date_idx
  on public.staff_work_logs (staff_id, work_date desc);

create index if not exists staff_work_logs_date_idx
  on public.staff_work_logs (work_date desc);

comment on table public.staff_work_logs is 'Horas trabajadas por cada usuario staff/admin (minutos diarios).';
