-- Simulador fiscal: tarjeta en caja, deducibilidad de gastos, ajustes de simulación

alter table public.cash_tickets drop constraint if exists cash_tickets_payment_method_check;
alter table public.cash_tickets add constraint cash_tickets_payment_method_check
  check (payment_method in ('cash', 'bizum', 'card'));

alter table public.expenses
  add column if not exists deductibility text not null default 'full'
  check (deductibility in ('full', 'partial', 'none'));

alter table public.expenses
  add column if not exists deductible_percent integer not null default 100
  check (deductible_percent >= 0 and deductible_percent <= 100);

comment on column public.expenses.deductibility is 'Grado de deducibilidad a efectos informativos (simulador).';
comment on column public.expenses.deductible_percent is 'Si partial: % del importe que cuenta como gasto deducible (0-100).';

-- Un único registro de ajustes (id = 1)
create table if not exists public.fiscal_settings (
  id smallint primary key default 1 check (id = 1),
  declare_cash_percent integer not null default 60
    check (declare_cash_percent >= 0 and declare_cash_percent <= 100),
  rent_is_leased boolean not null default false,
  monthly_rent_cents bigint not null default 0 check (monthly_rent_cents >= 0),
  official_liquidity_cents bigint not null default 0,
  sales_include_vat boolean not null default true,
  sales_vat_rate_percent integer not null default 21 check (sales_vat_rate_percent >= 0 and sales_vat_rate_percent <= 21),
  use_vat_on_sales boolean not null default false,
  expense_vat_recoverable_percent integer not null default 100
    check (expense_vat_recoverable_percent >= 0 and expense_vat_recoverable_percent <= 100),
  updated_at timestamptz not null default now()
);

insert into public.fiscal_settings (id) values (1)
on conflict (id) do nothing;

comment on table public.fiscal_settings is 'Ajustes globales del simulador fiscal (un solo registro id=1).';
comment on column public.fiscal_settings.declare_cash_percent is '% del efectivo cobrado que se simula como declarado en factura.';
comment on column public.fiscal_settings.official_liquidity_cents is 'Saldo orientativo en cuenta "oficial" para alertas de liquidez.';
comment on column public.fiscal_settings.use_vat_on_sales is 'Si true, se calcula IVA repercutido según sales_vat_rate_percent (servicios exentos = false).';
