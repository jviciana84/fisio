-- Snapshots del simulador fiscal por trimestre (decisión + números congelados en el momento de guardar).

create table if not exists public.fiscal_quarter_snapshots (
  id uuid primary key default gen_random_uuid(),
  calendar_year integer not null check (calendar_year >= 2000 and calendar_year <= 2100),
  quarter smallint not null check (quarter >= 1 and quarter <= 4),
  quarter_label text,
  declare_cash_percent integer not null default 60
    check (declare_cash_percent >= 0 and declare_cash_percent <= 100),
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (calendar_year, quarter)
);

create index if not exists fiscal_quarter_snapshots_year_q_idx
  on public.fiscal_quarter_snapshots (calendar_year desc, quarter desc);

comment on table public.fiscal_quarter_snapshots is
  'Copia inmutable (JSON) del simulador fiscal por trimestre natural, para consulta histórica.';
