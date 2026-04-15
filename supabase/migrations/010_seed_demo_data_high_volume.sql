-- Seed DEMO de alto volumen (re-ejecutable) para pruebas realistas.
-- Incluye: 5 staff, 30 productos, 120 clientes, gastos 6 meses, ventas 6 meses, horas staff.
-- Todos los datos demo se etiquetan con prefijos DEMOH / emails @demo.local.

-- ---------------------------------------------------------------------------
-- Precondiciones (por si faltan migraciones previas en este entorno)
-- ---------------------------------------------------------------------------
alter table public.products
  add column if not exists is_favorite boolean not null default false;

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

create table if not exists public.staff_work_logs (
  id uuid primary key default gen_random_uuid(),
  staff_id uuid not null references public.staff_access(id) on delete cascade,
  work_date date not null default current_date,
  worked_minutes integer not null check (worked_minutes >= 0 and worked_minutes <= 1440),
  notes text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Limpieza demo previa
-- ---------------------------------------------------------------------------
delete from public.cash_ticket_items
where ticket_id in (
  select id from public.cash_tickets where ticket_number like 'DEMOH-%'
);

delete from public.cash_tickets
where ticket_number like 'DEMOH-%';

delete from public.staff_work_logs
where notes = '[demo-high-volume]';

delete from public.expenses
where notes = '[demo-high-volume]';

delete from public.clients
where client_code like 'DH%';

delete from public.products
where product_code between '3001' and '3030';

delete from public.staff_access
where employee_code between '9001' and '9005'
   or email like '%@demo.local';

-- ---------------------------------------------------------------------------
-- 1) STAFF (5)
-- PIN demo: 1234 (hash/salt de demo)
-- ---------------------------------------------------------------------------
insert into public.staff_access (
  full_name,
  email,
  phone,
  employee_code,
  role,
  pin_hash,
  pin_salt,
  requires_2fa,
  totp_secret,
  totp_onboarding_complete,
  is_active
)
values
  ('Ana Martín', 'ana.martin@demo.local', '620100001', '9001', 'admin', '9a41ce5e2c85ae6f16e1ec8b63c603f57ef215757f9a033de46a9e4f8b59099e', 'demo-salt', false, null, true, true),
  ('Luis Gómez', 'luis.gomez@demo.local', '620100002', '9002', 'staff', '9a41ce5e2c85ae6f16e1ec8b63c603f57ef215757f9a033de46a9e4f8b59099e', 'demo-salt', false, null, true, true),
  ('Marta Ruiz', 'marta.ruiz@demo.local', '620100003', '9003', 'staff', '9a41ce5e2c85ae6f16e1ec8b63c603f57ef215757f9a033de46a9e4f8b59099e', 'demo-salt', false, null, true, true),
  ('Sergio León', 'sergio.leon@demo.local', '620100004', '9004', 'staff', '9a41ce5e2c85ae6f16e1ec8b63c603f57ef215757f9a033de46a9e4f8b59099e', 'demo-salt', false, null, true, true),
  ('Clara Vidal', 'clara.vidal@demo.local', '620100005', '9005', 'staff', '9a41ce5e2c85ae6f16e1ec8b63c603f57ef215757f9a033de46a9e4f8b59099e', 'demo-salt', false, null, true, true);

-- ---------------------------------------------------------------------------
-- 2) PRODUCTOS (30)
-- ---------------------------------------------------------------------------
insert into public.products (
  name,
  description,
  product_code,
  price_cents,
  is_favorite,
  is_active
)
select
  format('Servicio demo %s', n),
  format('Producto demo de prueba #%s', n),
  lpad((3000 + n)::text, 4, '0'),
  (1800 + (n * 175)),
  (n <= 6),
  true
from generate_series(1, 30) as n;

-- ---------------------------------------------------------------------------
-- 3) CLIENTES (120)
-- ---------------------------------------------------------------------------
insert into public.clients (
  client_code,
  full_name,
  email,
  phone,
  notes,
  is_active
)
select
  format('DH%03s', n),
  format('Cliente Demo %s', n),
  format('cliente%s@correo.demo', n),
  format('630%06s', n),
  null,
  true
from generate_series(1, 120) as n;

-- ---------------------------------------------------------------------------
-- 4) GASTOS TÍPICOS (6 meses, volumen)
-- 16 conceptos x 6 meses = 96 movimientos
-- ---------------------------------------------------------------------------
with months as (
  select
    (date_trunc('month', current_date) - (n || ' month')::interval)::date as month_start,
    n as month_idx
  from generate_series(5, 0, -1) as n
),
expense_catalog as (
  select *
  from (
    values
      ('Alquiler local', 'Alquiler', 180000),
      ('Luz', 'Luz', 26000),
      ('Agua', 'Agua', 9000),
      ('Internet', 'Internet', 12000),
      ('Telefonía', 'Telefonía', 8500),
      ('Software clínica', 'Software', 7900),
      ('Gestoría', 'Servicios', 15000),
      ('Seguro RC', 'Seguros', 11000),
      ('Limpieza', 'Servicios', 13000),
      ('Material sanitario', 'Material', 22000),
      ('Marketing local', 'Marketing', 10000),
      ('Reparaciones', 'Mantenimiento', 7000),
      ('Suscripción reservas', 'Software', 6200),
      ('Comisiones bancarias', 'Banca', 4200),
      ('Formación profesional', 'Formación', 9800),
      ('Suministros oficina', 'Material', 5600)
  ) as t(concept, category, base_cents)
)
insert into public.expenses (
  concept,
  notes,
  category,
  amount_cents,
  expense_date,
  recurrence
)
select
  e.concept,
  '[demo-high-volume]',
  e.category,
  (e.base_cents + (m.month_idx * 350))::int,
  (m.month_start + ((row_number() over (partition by m.month_start order by e.concept) % 24) || ' day')::interval)::date,
  'monthly'
from months m
cross join expense_catalog e;

-- ---------------------------------------------------------------------------
-- 5) HORAS STAFF (6 meses, días laborables)
-- ---------------------------------------------------------------------------
with days as (
  select d::date as work_date
  from generate_series(
    (date_trunc('month', current_date) - interval '5 month')::date,
    current_date::date,
    interval '1 day'
  ) d
  where extract(isodow from d) between 1 and 5
),
staff_seed as (
  select id, row_number() over (order by employee_code) as rn
  from public.staff_access
  where employee_code between '9001' and '9005'
)
insert into public.staff_work_logs (staff_id, work_date, worked_minutes, notes)
select
  s.id,
  d.work_date,
  (420 + ((extract(day from d.work_date)::int + s.rn * 13) % 181))::int,
  '[demo-high-volume]'
from days d
cross join staff_seed s;

-- ---------------------------------------------------------------------------
-- 6) VENTAS 6 meses (alto volumen)
-- 120 tickets/mes x 6 = 720 tickets
-- ---------------------------------------------------------------------------
with months as (
  select
    (date_trunc('month', current_date) - (n || ' month')::interval)::date as month_start,
    (6 - n) as month_order
  from generate_series(5, 0, -1) as n
),
ticket_seed as (
  select
    m.month_start,
    m.month_order,
    g as in_month_seq,
    row_number() over (order by m.month_start, g) as global_seq,
    format(
      'DEMOH-%s-%s',
      to_char(m.month_start, 'YYYYMM'),
      lpad(g::text, 4, '0')
    ) as ticket_number,
    (m.month_start + ((g - 1) % 28 || ' day')::interval + interval '10 hour' + ((g % 9) || ' minutes')::interval) as created_at,
    ((g - 1) % 5) + 1 as staff_rn,
    ((g - 1) % 120) + 1 as client_rn,
    case when (g % 100) < 38 then 'bizum' else 'cash' end as payment_method
  from months m
  cross join generate_series(1, 120) as g
),
staff_seed as (
  select id, row_number() over (order by employee_code) as rn
  from public.staff_access
  where employee_code between '9001' and '9005'
),
client_seed as (
  select id, row_number() over (order by client_code) as rn
  from public.clients
  where client_code like 'DH%'
),
product_seed as (
  select id, name, price_cents, row_number() over (order by product_code) as rn
  from public.products
  where product_code between '3001' and '3030'
),
lines_raw as (
  -- línea 1 (siempre)
  select
    t.ticket_number,
    t.created_at,
    t.staff_rn,
    t.client_rn,
    t.payment_method,
    (((t.in_month_seq - 1) % 30) + 1) as product_rn,
    (1 + (t.in_month_seq % 2))::int as qty
  from ticket_seed t

  union all

  -- línea 2 (siempre)
  select
    t.ticket_number,
    t.created_at,
    t.staff_rn,
    t.client_rn,
    t.payment_method,
    (((t.in_month_seq + 9) % 30) + 1) as product_rn,
    1 as qty
  from ticket_seed t

  union all

  -- línea 3 (25% de tickets)
  select
    t.ticket_number,
    t.created_at,
    t.staff_rn,
    t.client_rn,
    t.payment_method,
    (((t.in_month_seq + 17) % 30) + 1) as product_rn,
    1 as qty
  from ticket_seed t
  where (t.in_month_seq % 4) = 0
),
lines_priced as (
  select
    l.ticket_number,
    l.created_at,
    l.staff_rn,
    l.client_rn,
    l.payment_method,
    p.id as product_id,
    p.name as concept,
    p.price_cents as unit_price_cents,
    l.qty,
    (p.price_cents * l.qty)::int as line_total_cents
  from lines_raw l
  join product_seed p on p.rn = l.product_rn
),
ticket_totals as (
  select
    l.ticket_number,
    max(l.created_at) as created_at,
    max(l.staff_rn) as staff_rn,
    max(l.client_rn) as client_rn,
    max(l.payment_method) as payment_method,
    sum(l.line_total_cents)::int as total_cents
  from lines_priced l
  group by l.ticket_number
)
insert into public.cash_tickets (
  ticket_number,
  client_id,
  subtotal_cents,
  manual_amount_cents,
  total_cents,
  payment_method,
  created_by_staff_id,
  created_at
)
select
  t.ticket_number,
  c.id as client_id,
  t.total_cents as subtotal_cents,
  0 as manual_amount_cents,
  t.total_cents,
  t.payment_method,
  s.id as created_by_staff_id,
  t.created_at
from ticket_totals t
left join staff_seed s on s.rn = t.staff_rn
left join client_seed c on c.rn = t.client_rn;

with product_seed as (
  select id, name, price_cents, row_number() over (order by product_code) as rn
  from public.products
  where product_code between '3001' and '3030'
),
ticket_seed as (
  select
    m.month_start,
    g as in_month_seq,
    format('DEMOH-%s-%s', to_char(m.month_start, 'YYYYMM'), lpad(g::text, 4, '0')) as ticket_number
  from (
    select (date_trunc('month', current_date) - (n || ' month')::interval)::date as month_start
    from generate_series(5, 0, -1) as n
  ) m
  cross join generate_series(1, 120) as g
),
lines_raw as (
  select
    t.ticket_number,
    (((t.in_month_seq - 1) % 30) + 1) as product_rn,
    (1 + (t.in_month_seq % 2))::int as qty
  from ticket_seed t
  union all
  select
    t.ticket_number,
    (((t.in_month_seq + 9) % 30) + 1) as product_rn,
    1 as qty
  from ticket_seed t
  union all
  select
    t.ticket_number,
    (((t.in_month_seq + 17) % 30) + 1) as product_rn,
    1 as qty
  from ticket_seed t
  where (t.in_month_seq % 4) = 0
)
insert into public.cash_ticket_items (
  ticket_id,
  product_id,
  concept,
  unit_price_cents,
  quantity,
  line_total_cents,
  created_at
)
select
  t.id as ticket_id,
  p.id as product_id,
  p.name as concept,
  p.price_cents as unit_price_cents,
  l.qty,
  (p.price_cents * l.qty)::int as line_total_cents,
  t.created_at
from lines_raw l
join public.cash_tickets t on t.ticket_number = l.ticket_number
join product_seed p on p.rn = l.product_rn;
