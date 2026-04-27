-- Tipo de IVA del gasto (sobre importe TTC registrado): 0 sin IVA (ej. cuota RETA), 4, 10 o 21.
alter table public.expenses
  add column if not exists vat_rate_percent integer not null default 21
    check (vat_rate_percent in (0, 4, 10, 21));

comment on column public.expenses.vat_rate_percent is
  'Porcentaje de IVA incluido en el importe (0=sin IVA, 4, 10, 21).';
