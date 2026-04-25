-- Ajustes de simulación para nóminas: porcentajes configurables

alter table public.fiscal_settings
  add column if not exists employee_irpf_retention_percent numeric(5,2) not null default 15
  check (employee_irpf_retention_percent >= 0 and employee_irpf_retention_percent <= 60);

alter table public.fiscal_settings
  add column if not exists employee_social_security_percent numeric(5,2) not null default 6.35
  check (employee_social_security_percent >= 0 and employee_social_security_percent <= 30);

alter table public.fiscal_settings
  add column if not exists employer_social_security_percent numeric(5,2) not null default 31.40
  check (employer_social_security_percent >= 0 and employer_social_security_percent <= 60);

comment on column public.fiscal_settings.employee_irpf_retention_percent is 'IRPF estimado de trabajador en nómina (%), usado para modelo 111/190.';
comment on column public.fiscal_settings.employee_social_security_percent is 'Seguridad Social trabajador (%), para estimación de nómina neta.';
comment on column public.fiscal_settings.employer_social_security_percent is 'Seguridad Social empresa (%), para coste empresa estimado.';
