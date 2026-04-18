-- Datos ficticios para clínica de fisioterapia (re-ejecutable).
-- Incluye: clientes, gastos realistas, tickets con ~60% efectivo / ~25% Bizum / ~15% tarjeta.
-- Limpia solo filas etiquetadas (FS% / FISIOSEED- / [fisio-seed-demo]).

-- ---------------------------------------------------------------------------
-- 0) Productos mínimos si el catálogo está vacío
-- ---------------------------------------------------------------------------
insert into public.products (name, description, product_code, price_cents, is_favorite, is_active)
select v.name, v.description, v.product_code, v.price_cents, false, true
from (
  values
    ('Sesión individual 45 min', 'Seed demo', 'FS9001', 4800),
    ('Sesión extendida 60 min', 'Seed demo', 'FS9002', 6500),
    ('Bono 5 sesiones', 'Seed demo', 'FS9003', 32000),
    ('Masaje terapéutico', 'Seed demo', 'FS9004', 4200),
    ('Punción seca', 'Seed demo', 'FS9005', 2800)
) as v(name, description, product_code, price_cents)
where not exists (select 1 from public.products limit 1);

-- ---------------------------------------------------------------------------
-- 1) Limpieza de seed previo (mismo prefijo)
-- ---------------------------------------------------------------------------
delete from public.cash_ticket_items
where ticket_id in (select id from public.cash_tickets where ticket_number like 'FISIOSEED-%');

delete from public.cash_tickets where ticket_number like 'FISIOSEED-%';

delete from public.staff_work_logs where notes = '[fisio-seed-demo]';

delete from public.expenses where notes = '[fisio-seed-demo]';

delete from public.clients where client_code like 'FS%';

-- Staff extra de demo (9011–9017): quitar antes de volver a insertar
delete from public.staff_access where employee_code between '9011' and '9017';

-- ---------------------------------------------------------------------------
-- 2) Staff ficticio adicional (7) — mismo PIN demo que otros seeds (hash demo-salt)
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
  ('Nuria Costa', 'nuria.costa@fisio-seed.demo', '620200011', '9011', 'staff', '9a41ce5e2c85ae6f16e1ec8b63c603f57ef215757f9a033de46a9e4f8b59099e', 'demo-salt', false, null, true, true),
  ('Iván Prieto', 'ivan.prieto@fisio-seed.demo', '620200012', '9012', 'staff', '9a41ce5e2c85ae6f16e1ec8b63c603f57ef215757f9a033de46a9e4f8b59099e', 'demo-salt', false, null, true, true),
  ('Elena Soto', 'elena.soto@fisio-seed.demo', '620200013', '9013', 'staff', '9a41ce5e2c85ae6f16e1ec8b63c603f57ef215757f9a033de46a9e4f8b59099e', 'demo-salt', false, null, true, true),
  ('Marc Ferrer', 'marc.ferrer@fisio-seed.demo', '620200014', '9014', 'staff', '9a41ce5e2c85ae6f16e1ec8b63c603f57ef215757f9a033de46a9e4f8b59099e', 'demo-salt', false, null, true, true),
  ('Laia Vila', 'laia.vila@fisio-seed.demo', '620200015', '9015', 'staff', '9a41ce5e2c85ae6f16e1ec8b63c603f57ef215757f9a033de46a9e4f8b59099e', 'demo-salt', false, null, true, true),
  ('Oriol Mas', 'oriol.mas@fisio-seed.demo', '620200016', '9016', 'staff', '9a41ce5e2c85ae6f16e1ec8b63c603f57ef215757f9a033de46a9e4f8b59099e', 'demo-salt', false, null, true, true),
  ('Cristina Soler', 'cristina.soler@fisio-seed.demo', '620200017', '9017', 'staff', '9a41ce5e2c85ae6f16e1ec8b63c603f57ef215757f9a033de46a9e4f8b59099e', 'demo-salt', false, null, true, true);

-- ---------------------------------------------------------------------------
-- 3) Clientes ficticios (80)
-- ---------------------------------------------------------------------------
insert into public.clients (client_code, full_name, email, phone, notes, is_active)
select
  format('FS%03s', n),
  format('Paciente demo %s', n),
  format('paciente.fs%s@demo-clinica.local', n),
  format('699%06s', 700000 + n),
  '[fisio-seed-demo]',
  true
from generate_series(1, 80) as n;

-- ---------------------------------------------------------------------------
-- 4) Gastos típicos de clínica (6 meses, recurrentes + algunos puntuales)
-- ---------------------------------------------------------------------------
with months as (
  select
    (date_trunc('month', current_date) - (n || ' month')::interval)::date as month_start,
    n as month_idx
  from generate_series(5, 0, -1) as n
),
catalog as (
  select *
  from (
    values
      ('Alquiler local', 'Alquiler', 185000, 'monthly'::text, 'full'::text, 100),
      ('IBI y tasas municipales', 'Impuestos', 48000, 'quarterly', 'full', 100),
      ('Luz', 'Suministros', 28500, 'monthly', 'partial', 55),
      ('Agua', 'Suministros', 7800, 'monthly', 'partial', 55),
      ('Gas natural', 'Suministros', 11200, 'monthly', 'partial', 50),
      ('Internet fibra', 'Suministros', 11500, 'monthly', 'partial', 70),
      ('Telefonía móvil clínica', 'Telefonía', 6200, 'monthly', 'partial', 80),
      ('Cuota autónomos Seg. Social', 'Cuota autónomo', 320000, 'monthly', 'full', 100),
      ('Gestoría y laboral', 'Servicios', 16500, 'monthly', 'full', 100),
      ('Seguro responsabilidad civil', 'Seguros', 12800, 'monthly', 'full', 100),
      ('Seguro local', 'Seguros', 9400, 'monthly', 'full', 100),
      ('Limpieza semanal', 'Servicios', 14200, 'monthly', 'full', 100),
      ('Material sanitario y desechable', 'Material', 24500, 'monthly', 'full', 100),
      ('Lencería y toallas', 'Material', 6800, 'monthly', 'full', 100),
      ('Software agenda y historias clínicas', 'Software', 8900, 'monthly', 'full', 100),
      ('Material oficina', 'Material', 5200, 'monthly', 'partial', 40),
      ('Publicidad online local', 'Marketing', 15000, 'monthly', 'full', 100),
      ('Formación continuada', 'Formación', 18900, 'monthly', 'full', 100),
      ('Mantenimiento aparatos', 'Mantenimiento', 7600, 'monthly', 'full', 100),
      ('Comisiones TPV y banco', 'Banca', 5100, 'monthly', 'none', 0),
      ('Tasa de basuras', 'Tasas', 14500, 'semiannual', 'full', 100)
  ) as t(concept, category, base_cents, recurrence, deductibility, deductible_percent)
)
insert into public.expenses (
  concept,
  notes,
  category,
  amount_cents,
  expense_date,
  recurrence,
  deductibility,
  deductible_percent
)
select
  c.concept || ' · ' || to_char(m.month_start, 'TMMon YY'),
  '[fisio-seed-demo]',
  c.category,
  (c.base_cents + (m.month_idx * 175))::int,
  (m.month_start + ((abs(hashtext(c.concept || m.month_start::text)) % 20) || ' days')::interval)::date,
  c.recurrence,
  c.deductibility,
  c.deductible_percent
from months m
cross join catalog c;

-- Gastos puntuales (recurrence none) en meses recientes
insert into public.expenses (
  concept,
  notes,
  category,
  amount_cents,
  expense_date,
  recurrence,
  deductibility,
  deductible_percent
)
values
  (
    'Reparación camilla eléctrica',
    '[fisio-seed-demo]',
    'Mantenimiento',
    42000,
    (current_date - interval '45 days')::date,
    'none',
    'full',
    100
  ),
  (
    'Curso punción seca avanzada',
    '[fisio-seed-demo]',
    'Formación',
    28500,
    (current_date - interval '110 days')::date,
    'none',
    'full',
    100
  ),
  (
    'Compra esterilizador UV',
    '[fisio-seed-demo]',
    'Material',
    15600,
    (current_date - interval '20 days')::date,
    'none',
    'full',
    100
  );

-- ---------------------------------------------------------------------------
-- 5) Horas staff (días laborables últimos 3 meses, ligero)
-- ---------------------------------------------------------------------------
with days as (
  select d::date as work_date
  from generate_series(
    (current_date - interval '90 days')::date,
    current_date::date,
    interval '1 day'
  ) as d
  where extract(isodow from d) between 1 and 5
),
staff_ids as (
  select id, row_number() over (order by employee_code) as rn
  from public.staff_access
  where is_active = true
)
insert into public.staff_work_logs (staff_id, work_date, worked_minutes, notes)
select
  s.id,
  dy.work_date,
  (360 + ((extract(day from dy.work_date)::int + s.rn * 11) % 120))::int,
  '[fisio-seed-demo]'
from days dy
cross join staff_ids s
where exists (select 1 from staff_ids limit 1);

-- ---------------------------------------------------------------------------
-- 6) Tickets de caja: ~60% efectivo, ~25% Bizum, ~15% tarjeta (g % 100)
--    48 tickets/mes x 6 meses = 288 tickets. Requiere ≥1 staff activo y ≥1 producto.
-- ---------------------------------------------------------------------------
create temp table _fisio_seed_lines on commit drop as
with
months as (
  select
    (date_trunc('month', current_date) - (n || ' month')::interval)::date as month_start,
    n as month_idx
  from generate_series(5, 0, -1) as n
),
product_seed as (
  select
    id,
    name,
    price_cents,
    row_number() over (order by product_code) as rn
  from public.products
  where is_active = true
),
client_seed as (
  select id, row_number() over (order by client_code) as rn
  from public.clients
  where client_code like 'FS%'
),
staff_seed as (
  select id, row_number() over (order by employee_code) as rn
  from public.staff_access
  where is_active = true
),
dims as (
  select
    (select count(*)::int from client_seed) as n_clients,
    (select count(*)::int from staff_seed) as n_staff,
    (select count(*)::int from product_seed) as n_products
),
ticket_seed as (
  select
    m.month_start,
    m.month_idx,
    g as in_month_seq,
    format(
      'FISIOSEED-%s-%s',
      to_char(m.month_start, 'YYYYMM'),
      lpad(g::text, 4, '0')
    ) as ticket_number,
    (
      m.month_start
      + ((g - 1) % 26 || ' days')::interval
      + interval '9 hours 30 minutes'
      + ((g * 17) % 180 || ' minutes')::interval
    )::timestamptz as created_at,
    case
      when (g % 100) < 60 then 'cash'
      when (g % 100) < 85 then 'bizum'
      else 'card'
    end as payment_method,
    case
      when d.n_clients < 1 then 1
      else 1 + ((g + m.month_idx * 13 - 1) % d.n_clients)
    end::int as client_rn,
    case
      when d.n_staff < 1 then 1
      else 1 + ((g + m.month_idx * 7 - 1) % d.n_staff)
    end::int as staff_rn,
    case
      when d.n_products < 1 then 1
      else 1 + ((g * 11 + m.month_idx * 5 - 1) % d.n_products)
    end::int as product_rn,
    case when (g % 5) = 0 then 2 else 1 end as qty
  from months m
  cross join generate_series(1, 48) as g
  cross join dims d
)
select
  t.ticket_number,
  t.created_at,
  t.payment_method,
  c.id as client_id,
  s.id as staff_id,
  p.id as product_id,
  p.name as concept,
  p.price_cents as unit_price_cents,
  t.qty,
  (p.price_cents * t.qty)::int as line_total_cents
from ticket_seed t
join client_seed c on c.rn = t.client_rn
join staff_seed s on s.rn = t.staff_rn
join product_seed p on p.rn = t.product_rn
where exists (select 1 from product_seed limit 1)
  and exists (select 1 from client_seed limit 1)
  and exists (select 1 from staff_seed limit 1);

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
  l.ticket_number,
  (min(l.client_id::text))::uuid,
  sum(l.line_total_cents)::int,
  0,
  sum(l.line_total_cents)::int,
  max(l.payment_method),
  (min(l.staff_id::text))::uuid,
  max(l.created_at)
from _fisio_seed_lines l
group by l.ticket_number;

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
  ct.id,
  l.product_id,
  l.concept,
  l.unit_price_cents,
  l.qty,
  l.line_total_cents,
  l.created_at
from _fisio_seed_lines l
join public.cash_tickets ct on ct.ticket_number = l.ticket_number;
