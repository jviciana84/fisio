-- Gastos registrados por admin (control ingresos/gastos, impuestos).

create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  concept text not null,
  notes text,
  category text not null default 'otro'
    check (category in ('material', 'servicios', 'impuestos', 'personal', 'otro')),
  expense_code text not null,
  amount_cents integer not null check (amount_cents > 0),
  expense_date date not null default (current_date),
  created_at timestamptz not null default now()
);

create unique index if not exists expenses_expense_code_uidx
  on public.expenses (expense_code);

create index if not exists expenses_date_idx
  on public.expenses (expense_date desc);

create index if not exists expenses_category_idx
  on public.expenses (category);

comment on table public.expenses is 'Gastos del negocio para cuadre y fiscalidad.';
comment on column public.expenses.amount_cents is 'Importe del gasto en céntimos (siempre > 0).';
comment on column public.expenses.expense_code is 'Código interno de 4 cifras, único.';
