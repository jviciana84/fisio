-- =============================================================================
-- Instalación inicial en Supabase (proyecto vacío o sin estas tablas)
-- =============================================================================
-- Cómo aplicar:
--   1. Supabase Dashboard → SQL Editor → New query
--   2. Pegar todo este archivo y ejecutar (Run).
--
-- Equivale al estado final de schema.sql + índice de email.
-- Si ya tenías tablas antiguas (p. ej. expenses con expense_code), usa en su lugar
-- las migraciones numeradas en supabase/migrations/ en orden.
--
-- Nota: gen_random_uuid() viene en PostgreSQL 15 (Supabase); no hace falta pgcrypto.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Personal: login por PIN, 2FA TOTP, códigos de usuario (4 cifras en employee_code)
-- ---------------------------------------------------------------------------
create table if not exists public.staff_access (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text,
  phone text,
  employee_code text,
  role text not null check (role in ('staff', 'admin')),
  pin_hash text not null,
  pin_salt text not null,
  requires_2fa boolean not null default false,
  totp_secret text,
  totp_onboarding_complete boolean not null default true,
  is_active boolean not null default true,
  public_profile boolean not null default true,
  public_specialty text,
  public_bio text,
  public_avatar_path text,
  hourly_tariffs jsonb not null default '[]'::jsonb,
  compensation_type text not null default 'self_employed' check (compensation_type in ('salaried', 'self_employed')),
  monthly_salary_cents integer,
  created_at timestamptz not null default now()
);

-- Si la tabla ya existía con un esquema anterior, completar columnas faltantes.
alter table public.staff_access add column if not exists email text;
alter table public.staff_access add column if not exists phone text;
alter table public.staff_access add column if not exists employee_code text;
alter table public.staff_access add column if not exists requires_2fa boolean not null default false;
alter table public.staff_access add column if not exists totp_secret text;
alter table public.staff_access add column if not exists totp_onboarding_complete boolean not null default true;
alter table public.staff_access add column if not exists is_active boolean not null default true;
alter table public.staff_access add column if not exists public_profile boolean not null default true;
alter table public.staff_access add column if not exists public_specialty text;
alter table public.staff_access add column if not exists public_bio text;
alter table public.staff_access add column if not exists public_avatar_path text;
alter table public.staff_access add column if not exists hourly_tariffs jsonb not null default '[]'::jsonb;
alter table public.staff_access add column if not exists compensation_type text not null default 'self_employed';
alter table public.staff_access add column if not exists monthly_salary_cents integer;

create unique index if not exists staff_access_employee_code_uidx
  on public.staff_access (employee_code)
  where employee_code is not null;

create unique index if not exists staff_access_email_uidx
  on public.staff_access (lower(email))
  where email is not null;

create index if not exists idx_staff_access_active
  on public.staff_access (is_active);

comment on table public.staff_access is 'Usuarios del panel: PIN, roles staff/admin, TOTP opcional.';

-- ---------------------------------------------------------------------------
-- Catálogo de productos (admin)
-- ---------------------------------------------------------------------------
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  product_code text not null,
  price_cents integer not null default 0 check (price_cents >= 0),
  is_favorite boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.products add column if not exists description text;
alter table public.products add column if not exists product_code text;
alter table public.products add column if not exists price_cents integer not null default 0;
alter table public.products add column if not exists is_favorite boolean not null default false;
alter table public.products add column if not exists is_active boolean not null default true;
alter table public.products add column if not exists created_at timestamptz not null default now();

create unique index if not exists products_product_code_uidx
  on public.products (product_code);

create index if not exists products_active_idx
  on public.products (is_active);

create index if not exists products_favorite_idx
  on public.products (is_favorite)
  where is_favorite = true;

comment on table public.products is 'Productos del centro; precio en céntimos.';
comment on column public.products.product_code is 'Código interno de 4 cifras, único.';

-- ---------------------------------------------------------------------------
-- Gastos fijos (admin): categoría libre, sin código de gasto, recurrencia
-- ---------------------------------------------------------------------------
create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  concept text not null,
  notes text,
  category text not null default 'General',
  amount_cents integer not null check (amount_cents > 0),
  expense_date date not null default (current_date),
  recurrence text not null default 'monthly'
    check (recurrence in ('none', 'weekly', 'monthly', 'bimonthly', 'quarterly', 'semiannual', 'annual')),
  deductibility text not null default 'full'
    check (deductibility in ('full', 'partial', 'none')),
  deductible_percent integer not null default 100
    check (deductible_percent >= 0 and deductible_percent <= 100),
  created_at timestamptz not null default now()
);

-- Compatibilidad con versiones anteriores de expenses.
alter table public.expenses add column if not exists notes text;
alter table public.expenses add column if not exists category text not null default 'General';
alter table public.expenses add column if not exists amount_cents integer;
alter table public.expenses add column if not exists expense_date date not null default (current_date);
alter table public.expenses add column if not exists recurrence text;
alter table public.expenses add column if not exists created_at timestamptz not null default now();

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
    recurrence in ('none', 'weekly', 'monthly', 'bimonthly', 'quarterly', 'semiannual', 'annual')
  );

alter table public.expenses
  drop constraint if exists expenses_category_check;

drop index if exists public.expenses_expense_code_uidx;
alter table public.expenses drop column if exists expense_code;

create index if not exists expenses_date_idx
  on public.expenses (expense_date desc);

create index if not exists expenses_category_idx
  on public.expenses (category);

comment on table public.expenses is 'Gastos / cargos para cuadre; importe en céntimos.';
comment on column public.expenses.category is 'Texto libre (ej. Alquiler, Luz).';
comment on column public.expenses.recurrence is 'Periodicidad: none, weekly, monthly, quarterly, semiannual, annual.';

-- ---------------------------------------------------------------------------
-- Caja: clientes, tickets y lineas
-- ---------------------------------------------------------------------------
create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  client_code text unique,
  full_name text not null,
  first_name text,
  last_name_1 text,
  last_name_2 text,
  email text,
  phone text,
  notes text,
  address_street text,
  address_number text,
  address_postal_code text,
  address_city text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create unique index if not exists clients_email_uidx
  on public.clients (lower(email))
  where email is not null;

create unique index if not exists clients_phone_uidx
  on public.clients (phone)
  where phone is not null;

create index if not exists clients_name_idx
  on public.clients (full_name);

create table if not exists public.cash_tickets (
  id uuid primary key default gen_random_uuid(),
  ticket_number text not null unique,
  client_id uuid references public.clients(id) on delete set null,
  subtotal_cents integer not null check (subtotal_cents >= 0),
  manual_amount_cents integer not null default 0 check (manual_amount_cents >= 0),
  total_cents integer not null check (total_cents >= 0),
  payment_method text not null check (payment_method in ('cash', 'bizum', 'card')),
  created_by_staff_id uuid references public.staff_access(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists cash_tickets_created_at_idx
  on public.cash_tickets (created_at desc);

create index if not exists cash_tickets_payment_idx
  on public.cash_tickets (payment_method, created_at desc);

create table if not exists public.cash_ticket_items (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.cash_tickets(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  concept text not null,
  unit_price_cents integer not null check (unit_price_cents >= 0),
  quantity integer not null default 1 check (quantity > 0),
  line_total_cents integer not null check (line_total_cents >= 0),
  created_at timestamptz not null default now()
);

create index if not exists cash_ticket_items_ticket_idx
  on public.cash_ticket_items (ticket_id);

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
  employee_irpf_retention_percent numeric(5,2) not null default 15
    check (employee_irpf_retention_percent >= 0 and employee_irpf_retention_percent <= 60),
  employee_social_security_percent numeric(5,2) not null default 6.35
    check (employee_social_security_percent >= 0 and employee_social_security_percent <= 30),
  employer_social_security_percent numeric(5,2) not null default 31.40
    check (employer_social_security_percent >= 0 and employer_social_security_percent <= 60),
  updated_at timestamptz not null default now()
);

insert into public.fiscal_settings (id) values (1)
on conflict (id) do nothing;
