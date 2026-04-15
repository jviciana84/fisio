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
  payment_method text not null check (payment_method in ('cash', 'bizum')),
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
