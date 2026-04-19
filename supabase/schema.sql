create table if not exists public.staff_access (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text,
  phone text,
  employee_code text, -- código usuario: 4 cifras (0000–9999), único
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
  created_at timestamptz not null default now()
);

create unique index if not exists staff_access_employee_code_uidx
  on public.staff_access (employee_code)
  where employee_code is not null;

create index if not exists idx_staff_access_active
  on public.staff_access (is_active);

create unique index if not exists staff_access_email_uidx
  on public.staff_access (lower(email))
  where email is not null;

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

create unique index if not exists products_product_code_uidx
  on public.products (product_code);

create index if not exists products_active_idx
  on public.products (is_active);

create index if not exists products_favorite_idx
  on public.products (is_favorite)
  where is_favorite = true;

create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  concept text not null,
  notes text,
  category text not null default 'General',
  amount_cents integer not null check (amount_cents > 0),
  expense_date date not null default (current_date),
  recurrence text not null default 'monthly'
    check (recurrence in ('none', 'weekly', 'monthly', 'quarterly', 'semiannual', 'annual')),
  deductibility text not null default 'full'
    check (deductibility in ('full', 'partial', 'none')),
  deductible_percent integer not null default 100
    check (deductible_percent >= 0 and deductible_percent <= 100),
  created_at timestamptz not null default now()
);

create index if not exists expenses_date_idx
  on public.expenses (expense_date desc);

create index if not exists expenses_category_idx
  on public.expenses (category);

create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  client_code text unique,
  full_name text not null,
  email text,
  phone text,
  notes text,
  comprobante_pago_url text,
  estado_pago text not null default 'pendiente_validacion',
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

create index if not exists clients_estado_pago_idx
  on public.clients (estado_pago);

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

create table if not exists public.google_calendar_integration (
  id uuid primary key default gen_random_uuid(),
  refresh_token_encrypted text not null,
  calendar_id text not null default 'primary',
  connected_email text,
  slot_minutes integer not null default 45 check (slot_minutes >= 15 and slot_minutes <= 180),
  day_start_local text not null default '09:00',
  day_end_local text not null default '18:00',
  timezone text not null default 'Europe/Madrid',
  updated_at timestamptz not null default now()
);

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
