-- NIF/CIF y dirección de facturación (clientes)
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS tax_id text,
  ADD COLUMN IF NOT EXISTS address text;

COMMENT ON COLUMN public.clients.tax_id IS 'NIF/CIF (persona o empresa) para facturación';
COMMENT ON COLUMN public.clients.address IS 'Dirección fiscal / de contacto para facturación';
