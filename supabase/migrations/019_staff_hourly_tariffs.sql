-- Hasta 6 tarifas por hora (ej. fisioterapia vs acupuntura), JSON en staff_access.

alter table public.staff_access
  add column if not exists hourly_tariffs jsonb not null default '[]'::jsonb;

comment on column public.staff_access.hourly_tariffs is
  'Array JSON: [{ "label": "1h fisioterapia", "cents_per_hour": 4800 }, ...] máx. 6 elementos.';
