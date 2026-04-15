-- Seed demo: staff, productos, clientes, gastos y ventas de 6 meses.
-- Seguro de re-ejecutar: upserts y limpieza de datos demo previos.

-- ---------------------------------------------------------------------------
-- 1) STAFF (5)
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
  ('Ana Martín', 'ana.martin@demo.local', '600111001', '1001', 'admin', '9a41ce5e2c85ae6f16e1ec8b63c603f57ef215757f9a033de46a9e4f8b59099e', 'demo-salt', false, null, true, true),
  ('Luis Gómez', 'luis.gomez@demo.local', '600111002', '1002', 'staff', '9a41ce5e2c85ae6f16e1ec8b63c603f57ef215757f9a033de46a9e4f8b59099e', 'demo-salt', false, null, true, true),
  ('Marta Ruiz', 'marta.ruiz@demo.local', '600111003', '1003', 'staff', '9a41ce5e2c85ae6f16e1ec8b63c603f57ef215757f9a033de46a9e4f8b59099e', 'demo-salt', false, null, true, true),
  ('Sergio León', 'sergio.leon@demo.local', '600111004', '1004', 'staff', '9a41ce5e2c85ae6f16e1ec8b63c603f57ef215757f9a033de46a9e4f8b59099e', 'demo-salt', false, null, true, true),
  ('Clara Vidal', 'clara.vidal@demo.local', '600111005', '1005', 'staff', '9a41ce5e2c85ae6f16e1ec8b63c603f57ef215757f9a033de46a9e4f8b59099e', 'demo-salt', false, null, true, true)
on conflict (employee_code) do update
set
  full_name = excluded.full_name,
  email = excluded.email,
  phone = excluded.phone,
  role = excluded.role,
  is_active = true;

-- ---------------------------------------------------------------------------
-- 2) PRODUCTOS (10)
-- ---------------------------------------------------------------------------
insert into public.products (
  name,
  description,
  product_code,
  price_cents,
  is_favorite,
  is_active
)
values
  ('Sesión fisioterapia 30 min', 'Tratamiento individual', '2001', 4500, true, true),
  ('Sesión fisioterapia 60 min', 'Tratamiento completo', '2002', 7000, true, true),
  ('Bono 5 sesiones', 'Pack ahorro', '2003', 31000, true, true),
  ('Bono 10 sesiones', 'Pack intensivo', '2004', 59000, true, true),
  ('Masaje descarga', 'Masaje terapéutico', '2005', 3800, true, true),
  ('Punción seca', 'Técnica avanzada', '2006', 2600, true, true),
  ('Vendaje neuromuscular', 'Aplicación kinesiotape', '2007', 1800, false, true),
  ('Readaptación deportiva', 'Plan personalizado', '2008', 5200, false, true),
  ('Estudio pisada', 'Análisis biomecánico', '2009', 4200, false, true),
  ('Electroterapia', 'Complemento terapéutico', '2010', 2400, false, true)
on conflict (product_code) do update
set
  name = excluded.name,
  description = excluded.description,
  price_cents = excluded.price_cents,
  is_favorite = excluded.is_favorite,
  is_active = true;

-- ---------------------------------------------------------------------------
-- 3) CLIENTES (15)
-- ---------------------------------------------------------------------------
insert into public.clients (
  client_code,
  full_name,
  email,
  phone,
  notes,
  is_active
)
values
  ('C001', 'Javier Torres', 'javier.torres@correo.demo', '611000001', null, true),
  ('C002', 'Patricia Núñez', 'patricia.nunez@correo.demo', '611000002', null, true),
  ('C003', 'David Roca', 'david.roca@correo.demo', '611000003', null, true),
  ('C004', 'Sara Molina', 'sara.molina@correo.demo', '611000004', null, true),
  ('C005', 'Hugo Paredes', 'hugo.paredes@correo.demo', '611000005', null, true),
  ('C006', 'Elena Prieto', 'elena.prieto@correo.demo', '611000006', null, true),
  ('C007', 'Raúl Casas', 'raul.casas@correo.demo', '611000007', null, true),
  ('C008', 'Noelia Pastor', 'noelia.pastor@correo.demo', '611000008', null, true),
  ('C009', 'Iván Segura', 'ivan.segura@correo.demo', '611000009', null, true),
  ('C010', 'Laura Cano', 'laura.cano@correo.demo', '611000010', null, true),
  ('C011', 'Marcos Soler', 'marcos.soler@correo.demo', '611000011', null, true),
  ('C012', 'Andrea Rey', 'andrea.rey@correo.demo', '611000012', null, true),
  ('C013', 'Nerea Sanz', 'nerea.sanz@correo.demo', '611000013', null, true),
  ('C014', 'Óscar Lara', 'oscar.lara@correo.demo', '611000014', null, true),
  ('C015', 'Irene Gil', 'irene.gil@correo.demo', '611000015', null, true)
on conflict (client_code) do update
set
  full_name = excluded.full_name,
  email = excluded.email,
  phone = excluded.phone,
  is_active = true;

-- ---------------------------------------------------------------------------
-- Limpieza previa de demo antiguo
-- ---------------------------------------------------------------------------
delete from public.cash_ticket_items
where ticket_id in (
  select id from public.cash_tickets where ticket_number like 'DEMO-%'
);

delete from public.cash_tickets
where ticket_number like 'DEMO-%';

delete from public.expenses
where notes = '[demo-seed]';

delete from public.staff_work_logs
where notes = '[demo-seed]';

-- ---------------------------------------------------------------------------
-- 4) GASTOS TÍPICOS (6 meses)
-- ---------------------------------------------------------------------------
with months as (
  select (date_trunc('month', current_date) - (n || ' month')::interval)::date as month_start
  from generate_series(5, 0, -1) as n
)
insert into public.expenses (concept, notes, category, amount_cents, expense_date, recurrence)
select
  e.concept,
  '[demo-seed]'::text,
  e.category,
  e.amount_cents,
  (m.month_start + interval '5 day')::date,
  'monthly'
from months m
cross join (
  values
    ('Alquiler local', 'Alquiler', 180000),
    ('Luz', 'Luz', 26000),
    ('Agua', 'Agua', 9000),
    ('Internet y telefonía', 'Internet', 12000),
    ('Software gestión clínica', 'Software', 7900),
    ('Gestoría', 'Servicios', 15000),
    ('Seguro responsabilidad civil', 'Seguros', 11000),
    ('Limpieza', 'Servicios', 13000)
) as e(concept, category, amount_cents);

-- ---------------------------------------------------------------------------
-- 5) HORAS TRABAJADAS (6 meses)
-- ---------------------------------------------------------------------------
with months as (
  select (date_trunc('month', current_date) - (n || ' month')::interval)::date as month_start, n
  from generate_series(5, 0, -1) as n
),
staff_seed as (
  select id, row_number() over (order by employee_code) as rn
  from public.staff_access
  where employee_code in ('1001', '1002', '1003', '1004', '1005')
)
insert into public.staff_work_logs (staff_id, work_date, worked_minutes, notes)
select
  s.id,
  (m.month_start + interval '20 day')::date,
  (7200 + (s.rn * 180) + ((5 - m.n) * 90))::int,
  '[demo-seed]'
from months m
cross join staff_seed s;

-- ---------------------------------------------------------------------------
-- 6) INGRESOS MENSUALES DE VENTAS (6 meses)
-- ---------------------------------------------------------------------------
with months as (
  select (date_trunc('month', current_date) - (n || ' month')::interval)::date as month_start, n
  from generate_series(5, 0, -1) as n
),
prod_seed as (
  select id, product_code, name, price_cents, row_number() over (order by product_code) as rn
  from public.products
  where product_code between '2001' and '2010'
),
staff_seed as (
  select id, row_number() over (order by employee_code) as rn
  from public.staff_access
  where employee_code in ('1001', '1002', '1003', '1004', '1005')
),
client_seed as (
  select id, row_number() over (order by client_code) as rn
  from public.clients
  where client_code like 'C0%'
),
sale_rows as (
  select
    row_number() over (order by m.month_start, g) as sale_no,
    m.month_start,
    m.n,
    g as idx_in_month,
    ((g - 1) % 10) + 1 as prod_rn,
    ((g - 1) % 5) + 1 as staff_rn,
    ((g - 1) % 15) + 1 as client_rn,
    (1 + (g % 3))::int as qty,
    case when (g % 3) = 0 then 'bizum' else 'cash' end as payment_method
  from months m
  cross join generate_series(1, 8) as g
),
prepared_sales as (
  select
    format(
      'DEMO-%s-%s',
      to_char((s.month_start + ((s.idx_in_month - 1) || ' day')::interval)::date, 'YYYYMMDD'),
      lpad(s.sale_no::text, 3, '0')
    ) as ticket_number,
    (s.month_start + ((s.idx_in_month - 1) || ' day')::interval + interval '10 hour') as created_at,
    cl.id as client_id,
    st.id as staff_id,
    p.id as product_id,
    p.name as product_name,
    p.price_cents,
    s.qty,
    (p.price_cents * s.qty)::int as total_cents,
    s.payment_method
  from sale_rows s
  join prod_seed p on p.rn = s.prod_rn
  left join staff_seed st on st.rn = s.staff_rn
  left join client_seed cl on cl.rn = s.client_rn
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
  p.ticket_number,
  p.client_id,
  p.total_cents,
  0,
  p.total_cents,
  p.payment_method,
  p.staff_id,
  p.created_at
from prepared_sales p;

with prepared_sales as (
  select
    format(
      'DEMO-%s-%s',
      to_char((m.month_start + ((g - 1) || ' day')::interval)::date, 'YYYYMMDD'),
      lpad((row_number() over (order by m.month_start, g))::text, 3, '0')
    ) as ticket_number,
    ((g - 1) % 10) + 1 as prod_rn,
    (1 + (g % 3))::int as qty
  from (
    select (date_trunc('month', current_date) - (n || ' month')::interval)::date as month_start
    from generate_series(5, 0, -1) as n
  ) m
  cross join generate_series(1, 8) as g
),
prod_seed as (
  select id, name, price_cents, row_number() over (order by product_code) as rn
  from public.products
  where product_code between '2001' and '2010'
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
  t.id,
  p.id,
  p.name,
  p.price_cents,
  s.qty,
  (p.price_cents * s.qty)::int,
  t.created_at
from prepared_sales s
join public.cash_tickets t on t.ticket_number = s.ticket_number
join prod_seed p on p.rn = s.prod_rn;
