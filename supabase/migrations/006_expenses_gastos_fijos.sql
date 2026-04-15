-- Gastos fijos: categoría libre, sin código; recurrencia del cargo.

alter table public.expenses drop constraint if exists expenses_category_check;

drop index if exists public.expenses_expense_code_uidx;

alter table public.expenses drop column if exists expense_code;

alter table public.expenses
  add column if not exists recurrence text;

update public.expenses
set recurrence = 'monthly'
where recurrence is null;

alter table public.expenses
  alter column recurrence set default 'monthly';

alter table public.expenses
  alter column recurrence set not null;

alter table public.expenses
  drop constraint if exists expenses_recurrence_check;

alter table public.expenses
  add constraint expenses_recurrence_check check (
    recurrence in ('none', 'weekly', 'monthly', 'quarterly', 'semiannual', 'annual')
  );

comment on column public.expenses.category is 'Texto libre (ej. Alquiler, Luz).';
comment on column public.expenses.recurrence is 'Periodicidad del cargo: none, weekly, monthly, etc.';
