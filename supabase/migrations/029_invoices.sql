create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  invoice_number text not null unique,
  ticket_id uuid unique references public.cash_tickets(id) on delete set null,
  client_id uuid references public.clients(id) on delete set null,
  issue_date date not null default current_date,
  payment_method text not null check (payment_method in ('cash', 'bizum', 'card')),
  subtotal_cents integer not null check (subtotal_cents >= 0),
  total_cents integer not null check (total_cents >= 0),
  notes text,
  created_by_staff_id uuid references public.staff_access(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists invoices_issue_date_idx
  on public.invoices (issue_date desc);

create index if not exists invoices_created_at_idx
  on public.invoices (created_at desc);

create table if not exists public.invoice_items (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  ticket_item_id uuid references public.cash_ticket_items(id) on delete set null,
  concept text not null,
  quantity integer not null default 1 check (quantity > 0),
  unit_price_cents integer not null check (unit_price_cents >= 0),
  line_total_cents integer not null check (line_total_cents >= 0),
  created_at timestamptz not null default now()
);

create index if not exists invoice_items_invoice_idx
  on public.invoice_items (invoice_id);
