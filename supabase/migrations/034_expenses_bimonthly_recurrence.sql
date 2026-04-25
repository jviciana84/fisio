-- Añade periodicidad bimensual a gastos recurrentes
alter table public.expenses
  drop constraint if exists expenses_recurrence_check;

alter table public.expenses
  add constraint expenses_recurrence_check check (
    recurrence in ('none', 'weekly', 'monthly', 'bimonthly', 'quarterly', 'semiannual', 'annual')
  );
