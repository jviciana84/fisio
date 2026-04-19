-- Documentación: tarifas con €/h (índices 0–2) y % sobre venta (índices 3–5).

comment on column public.staff_access.hourly_tariffs is
  'JSON [{label, kind, cents_per_hour, percent_hundredths}] máx. 6: slots 0–2 €/h; slots 3–5 % (percent_hundredths: 2500 = 25,00 %).';
