-- Consumo de sesiones de bono (manual o QR), con auditoría por staff.

create table if not exists public.client_bono_consumptions (
  id uuid primary key default gen_random_uuid(),
  bono_id uuid not null references public.client_bonos(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  consumed_by_staff_id uuid references public.staff_access(id) on delete set null,
  consumed_at timestamptz not null default now(),
  source text not null default 'manual' check (source in ('manual', 'qr')),
  notes text
);

create index if not exists client_bono_consumptions_bono_idx
  on public.client_bono_consumptions (bono_id, consumed_at desc);

create index if not exists client_bono_consumptions_client_idx
  on public.client_bono_consumptions (client_id, consumed_at desc);

comment on table public.client_bono_consumptions is
  'Registro de cada sesión consumida desde un bono.';
